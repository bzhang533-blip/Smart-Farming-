import 'dart:io';

import 'src/server.dart';

Future<void> main(List<String> args) async {
  final port = _readPort(args);
  await startServer(port: port);
}

int _readPort(List<String> args) {
  const defaultPort = 8080;
  final fromEnv = int.tryParse(Platform.environment['PORT'] ?? '');
  if (fromEnv != null) return fromEnv;

  for (final arg in args) {
    if (arg.startsWith('--port=')) {
      return int.tryParse(arg.substring('--port='.length)) ?? defaultPort;
    }
  }
  return defaultPort;
}
