import 'dart:io';

import 'auth.dart';
import 'defaults_repository.dart';
import 'farm_store.dart';
import 'http_utils.dart';
import 'scenario_store.dart';
import 'validation.dart';

Future<HttpServer> startServer({int port = 8080}) async {
  final auth = ClerkAuth();
  final defaults = DefaultsRepository(_dataPath('defaults.json'));
  final farms = FarmStore(_dataPath('farms.json'));
  final scenarios = ScenarioStore(_dataPath('scenarios.json'));
  final server = await HttpServer.bind(InternetAddress.anyIPv4, port);
  print('Smart Farm backend listening on http://localhost:$port');

  server.listen((request) {
    _handleRequest(request, auth, defaults, farms, scenarios);
  });
  return server;
}

Future<void> _handleRequest(
  HttpRequest request,
  ClerkAuth auth,
  DefaultsRepository defaults,
  FarmStore farms,
  ScenarioStore scenarios,
) async {
  try {
    addCorsHeaders(request.response);
    if (request.method == 'OPTIONS') {
      request.response.statusCode = HttpStatus.noContent;
      await request.response.close();
      return;
    }

    final path = request.uri.path;
    if (path == '/api/me/farm' || path == '/api/me/farm/machinery') {
      final user = await _requireAuth(request, auth);
      if (user == null) return;
      if (path == '/api/me/farm') {
        await _handleMeFarm(request, farms, user);
        return;
      }
      await _handleMeFarmMachinery(request, farms, user);
      return;
    }

    if (request.method == 'GET' && path == '/defaults') {
      final crop = request.uri.queryParameters['crop'];
      final region = request.uri.queryParameters['region'];
      final body = await defaults.getDefaults(crop: crop, region: region);
      await sendJson(request, body);
      return;
    }

    if (path == '/scenarios') {
      final user = await _requireAuth(request, auth);
      if (user == null) return;
      await _handleScenariosRoot(request, scenarios, user);
      return;
    }

    if (path.startsWith('/scenarios/')) {
      final user = await _requireAuth(request, auth);
      if (user == null) return;
      final id = path.substring('/scenarios/'.length);
      await _handleScenarioById(request, scenarios, user, id);
      return;
    }

    await sendError(
      request,
      HttpStatus.notFound,
      'Route not found.',
      'NOT_FOUND',
    );
  } on ArgumentError catch (error) {
    await sendError(
      request,
      HttpStatus.badRequest,
      error.message.toString(),
      'BAD_REQUEST',
    );
  } on FormatException {
    await sendError(
      request,
      HttpStatus.badRequest,
      'Invalid JSON body.',
      'INVALID_JSON',
    );
  } catch (error) {
    await sendError(
      request,
      HttpStatus.internalServerError,
      'Internal server error.',
      'INTERNAL_ERROR',
    );
  }
}

Future<AuthenticatedUser?> _requireAuth(
  HttpRequest request,
  ClerkAuth auth,
) async {
  final result = await auth.authenticate(request);
  if (result.isOk) return result.user;
  await sendJson(request, {
    'error': result.error ?? 'unauthorized',
  }, statusCode: result.statusCode ?? HttpStatus.unauthorized);
  return null;
}

Future<void> _handleMeFarm(
  HttpRequest request,
  FarmStore store,
  AuthenticatedUser user,
) async {
  if (request.method == 'GET') {
    final farm = await store.getOrCreateFarm(
      user.userId,
      displayName: _displayNameFromClaims(user.claims),
    );
    await sendJson(request, farm);
    return;
  }

  if (request.method == 'PUT') {
    final body = await readJsonBody(request);
    if (body is! Map) {
      await sendError(
        request,
        HttpStatus.badRequest,
        'Request body must be a JSON object.',
        'INVALID_FARM',
      );
      return;
    }
    await store.updateFarm(user.userId, _stringKeyMap(body));
    await sendJson(request, {
      'ok': true,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
    return;
  }

  await sendError(
    request,
    HttpStatus.methodNotAllowed,
    'Method not allowed.',
    'METHOD_NOT_ALLOWED',
  );
}

Future<void> _handleMeFarmMachinery(
  HttpRequest request,
  FarmStore store,
  AuthenticatedUser user,
) async {
  if (request.method == 'GET') {
    await sendJson(request, await store.getMachinery(user.userId));
    return;
  }

  await sendError(
    request,
    HttpStatus.methodNotAllowed,
    'Method not allowed.',
    'METHOD_NOT_ALLOWED',
  );
}

Future<void> _handleScenariosRoot(
  HttpRequest request,
  ScenarioStore store,
  AuthenticatedUser user,
) async {
  if (request.method == 'GET') {
    await sendJson(request, {
      'scenarios': await store.listSummaries(user.userId),
    });
    return;
  }

  if (request.method == 'POST') {
    final body = await readJsonBody(request);
    final validationError = validateScenarioPayload(body);
    if (validationError != null) {
      await sendError(
        request,
        HttpStatus.badRequest,
        validationError,
        'INVALID_SCENARIO',
      );
      return;
    }
    final scenario = await store.create(
      user.userId,
      _stringKeyMap(body as Map),
    );
    await sendJson(request, {
      'id': scenario['id'],
      'updatedAt': scenario['updatedAt'],
    }, statusCode: HttpStatus.created);
    return;
  }

  await sendError(
    request,
    HttpStatus.methodNotAllowed,
    'Method not allowed.',
    'METHOD_NOT_ALLOWED',
  );
}

Future<void> _handleScenarioById(
  HttpRequest request,
  ScenarioStore store,
  AuthenticatedUser user,
  String id,
) async {
  if (id.trim().isEmpty) {
    await sendError(
      request,
      HttpStatus.notFound,
      'Scenario not found.',
      'SCENARIO_NOT_FOUND',
    );
    return;
  }

  if (request.method == 'GET') {
    final scenario = await store.get(user.userId, id);
    if (scenario == null) {
      await sendError(
        request,
        HttpStatus.notFound,
        'Scenario not found.',
        'SCENARIO_NOT_FOUND',
      );
      return;
    }
    await sendJson(request, scenario);
    return;
  }

  if (request.method == 'PUT') {
    final body = await readJsonBody(request);
    final validationError = validateScenarioPayload(body, partial: true);
    if (validationError != null) {
      await sendError(
        request,
        HttpStatus.badRequest,
        validationError,
        'INVALID_SCENARIO',
      );
      return;
    }
    final updated = await store.update(
      user.userId,
      id,
      _stringKeyMap(body as Map),
    );
    if (updated == null) {
      await sendError(
        request,
        HttpStatus.notFound,
        'Scenario not found.',
        'SCENARIO_NOT_FOUND',
      );
      return;
    }
    await sendJson(request, {'ok': true, 'updatedAt': updated['updatedAt']});
    return;
  }

  if (request.method == 'DELETE') {
    final deleted = await store.delete(user.userId, id);
    if (!deleted) {
      await sendError(
        request,
        HttpStatus.notFound,
        'Scenario not found.',
        'SCENARIO_NOT_FOUND',
      );
      return;
    }
    await sendNoContent(request);
    return;
  }

  await sendError(
    request,
    HttpStatus.methodNotAllowed,
    'Method not allowed.',
    'METHOD_NOT_ALLOWED',
  );
}

Map<String, Object?> _stringKeyMap(Map<dynamic, dynamic> map) {
  return map.map((key, value) => MapEntry(key.toString(), value));
}

String? _displayNameFromClaims(Map<String, Object?> claims) {
  for (final key in ['name', 'full_name', 'given_name', 'email']) {
    final value = claims[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
  }
  return null;
}

String _dataPath(String fileName) {
  final fromRepoRoot = 'backend/data/$fileName';
  if (File(fromRepoRoot).existsSync()) return fromRepoRoot;
  return 'data/$fileName';
}
