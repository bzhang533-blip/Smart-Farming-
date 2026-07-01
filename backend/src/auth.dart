import 'dart:convert';
import 'dart:io';

import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:http/http.dart' as http;

class AuthenticatedUser {
  const AuthenticatedUser(this.userId, this.claims);

  final String userId;
  final Map<String, Object?> claims;
}

class AuthResult {
  const AuthResult._({this.user, this.error, this.statusCode});

  factory AuthResult.ok(AuthenticatedUser user) => AuthResult._(user: user);

  factory AuthResult.error(String error, int statusCode) =>
      AuthResult._(error: error, statusCode: statusCode);

  final AuthenticatedUser? user;
  final String? error;
  final int? statusCode;

  bool get isOk => user != null;
}

class ClerkAuth {
  ClerkAuth({
    http.Client? client,
    String? jwksUrl,
    Duration cacheTtl = const Duration(hours: 1),
  }) : _client = client ?? http.Client(),
       _jwksUrl =
           jwksUrl ??
           Platform.environment['CLERK_JWKS_URL'] ??
           'https://api.clerk.com/v1/jwks',
       _cacheTtl = cacheTtl;

  final http.Client _client;
  final String _jwksUrl;
  final Duration _cacheTtl;

  DateTime? _jwksFetchedAt;
  List<Map<String, dynamic>>? _cachedKeys;

  Future<AuthResult> authenticate(HttpRequest request) async {
    final header = request.headers.value(HttpHeaders.authorizationHeader);
    if (header == null || header.trim().isEmpty) {
      final devUser = _devUser();
      if (devUser != null) return AuthResult.ok(AuthenticatedUser(devUser, {}));
      return AuthResult.error('unauthorized', HttpStatus.unauthorized);
    }

    final match = RegExp(
      r'^Bearer\s+(.+)$',
      caseSensitive: false,
    ).firstMatch(header.trim());
    if (match == null) {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    }

    final token = match.group(1)!;
    try {
      final decoded = JWT.decode(token);
      final header = decoded.header;
      final kid = header?['kid'];
      if (kid is! String || kid.isEmpty) {
        return AuthResult.error('invalid_token', HttpStatus.unauthorized);
      }

      final jwk = await _findJwk(kid);
      if (jwk == null) {
        _clearCache();
        final refreshedJwk = await _findJwk(kid);
        if (refreshedJwk == null) {
          return AuthResult.error('invalid_token', HttpStatus.unauthorized);
        }
        return _verifyWithJwk(token, refreshedJwk);
      }

      return _verifyWithJwk(token, jwk);
    } on JWTException {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    } on FormatException {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    } catch (_) {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    }
  }

  Future<Map<String, dynamic>?> _findJwk(String kid) async {
    final keys = await _jwks();
    for (final key in keys) {
      if (key['kid'] == kid) return key;
    }
    return null;
  }

  AuthResult _verifyWithJwk(String token, Map<String, dynamic> jwk) {
    try {
      final key = JWTKey.fromJWK(jwk);
      final verified = JWT.verify(token, key);
      final payload = verified.payload;
      if (payload is! Map) {
        return AuthResult.error('invalid_token', HttpStatus.unauthorized);
      }
      final claims = payload.map(
        (key, value) => MapEntry(key.toString(), value),
      );
      final sub = claims['sub'];
      if (sub is! String || sub.trim().isEmpty) {
        return AuthResult.error('invalid_token', HttpStatus.unauthorized);
      }
      return AuthResult.ok(AuthenticatedUser(sub, claims));
    } on JWTException {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    } catch (_) {
      return AuthResult.error('invalid_token', HttpStatus.unauthorized);
    }
  }

  Future<List<Map<String, dynamic>>> _jwks() async {
    final now = DateTime.now().toUtc();
    final fetchedAt = _jwksFetchedAt;
    final cached = _cachedKeys;
    if (fetchedAt != null &&
        cached != null &&
        now.difference(fetchedAt) < _cacheTtl) {
      return cached;
    }

    final response = await _client.get(Uri.parse(_jwksUrl));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Unable to fetch Clerk JWKS.');
    }
    final body = jsonDecode(response.body);
    if (body is! Map || body['keys'] is! List) {
      throw FormatException('Clerk JWKS response must contain keys.');
    }
    final keys = (body['keys'] as List)
        .whereType<Map>()
        .map((key) => key.map((k, v) => MapEntry(k.toString(), v)))
        .toList();
    _cachedKeys = keys;
    _jwksFetchedAt = now;
    return keys;
  }

  void _clearCache() {
    _cachedKeys = null;
    _jwksFetchedAt = null;
  }

  String? _devUser() {
    if (Platform.environment['SMART_FARM_ALLOW_DEV_AUTH'] != 'true') {
      return null;
    }
    return Platform.environment['SMART_FARM_DEV_USER_ID'] ?? 'dev-user';
  }
}
