import 'dart:convert';
import 'dart:io';

class JsonFileStore {
  JsonFileStore(this.path);

  final String path;

  Future<Object?> read() async {
    final file = File(path);
    if (!await file.exists()) return null;
    final text = await file.readAsString();
    if (text.trim().isEmpty) return null;
    return jsonDecode(text);
  }

  Future<void> write(Object value) async {
    final file = File(path);
    await file.parent.create(recursive: true);
    const encoder = JsonEncoder.withIndent('  ');
    await file.writeAsString('${encoder.convert(value)}\n');
  }
}
