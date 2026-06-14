import 'dart:io';

import 'defaults_repository.dart';
import 'http_utils.dart';
import 'scenario_store.dart';
import 'validation.dart';

Future<HttpServer> startServer({int port = 8080}) async {
  final defaults = DefaultsRepository('backend/data/defaults.json');
  final scenarios = ScenarioStore('backend/data/scenarios.json');
  final server = await HttpServer.bind(InternetAddress.anyIPv4, port);
  print('Smart Farm backend listening on http://localhost:$port');

  server.listen((request) {
    _handleRequest(request, defaults, scenarios);
  });
  return server;
}

Future<void> _handleRequest(
  HttpRequest request,
  DefaultsRepository defaults,
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
    if (request.method == 'GET' && path == '/defaults') {
      final crop = request.uri.queryParameters['crop'];
      final region = request.uri.queryParameters['region'];
      final body = await defaults.getDefaults(crop: crop, region: region);
      await sendJson(request, body);
      return;
    }

    if (path == '/scenarios') {
      await _handleScenariosRoot(request, scenarios);
      return;
    }

    if (path.startsWith('/scenarios/')) {
      final id = path.substring('/scenarios/'.length);
      await _handleScenarioById(request, scenarios, id);
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

Future<void> _handleScenariosRoot(
  HttpRequest request,
  ScenarioStore store,
) async {
  if (request.method == 'GET') {
    await sendJson(request, {'scenarios': await store.listSummaries()});
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
    final scenario = await store.create(_stringKeyMap(body as Map));
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
    final scenario = await store.get(id);
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
    final updated = await store.update(id, _stringKeyMap(body as Map));
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
    final deleted = await store.delete(id);
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
