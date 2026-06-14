import 'dart:convert';
import 'dart:io';

Future<Object?> readJsonBody(HttpRequest request) async {
  final body = await utf8.decoder.bind(request).join();
  if (body.trim().isEmpty) return null;
  return jsonDecode(body);
}

Future<void> sendJson(
  HttpRequest request,
  Object? body, {
  int statusCode = HttpStatus.ok,
}) async {
  final response = request.response;
  _setCommonHeaders(response);
  response.statusCode = statusCode;
  response.headers.contentType = ContentType.json;
  if (body != null) {
    response.write(const JsonEncoder.withIndent('  ').convert(body));
  }
  await response.close();
}

Future<void> sendNoContent(HttpRequest request) async {
  final response = request.response;
  _setCommonHeaders(response);
  response.statusCode = HttpStatus.noContent;
  await response.close();
}

Future<void> sendError(
  HttpRequest request,
  int statusCode,
  String message,
  String code,
) {
  return sendJson(request, {
    'message': message,
    'code': code,
  }, statusCode: statusCode);
}

void addCorsHeaders(HttpResponse response) {
  response.headers
    ..set('Access-Control-Allow-Origin', '*')
    ..set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    ..set('Access-Control-Allow-Headers', 'Content-Type');
}

void _setCommonHeaders(HttpResponse response) {
  addCorsHeaders(response);
  response.headers.set('Cache-Control', 'no-store');
}
