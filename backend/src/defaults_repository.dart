import 'crops.dart';
import 'storage.dart';

class DefaultsRepository {
  DefaultsRepository(String path) : _store = JsonFileStore(path);

  final JsonFileStore _store;

  Future<Map<String, Object?>> getDefaults({
    String? crop,
    String? region,
  }) async {
    final data = await _store.read();
    if (data is! Map) {
      throw StateError('Defaults file must contain a JSON object.');
    }

    final response = data.map((key, value) => MapEntry(key.toString(), value));
    if (region != null && region.trim().isNotEmpty) {
      response['region'] = region.trim();
    }

    final requestedCrop = normalizeCrop(crop);
    if (crop != null && requestedCrop == null) {
      throw ArgumentError.value(crop, 'crop', 'Unsupported crop.');
    }

    if (requestedCrop != null) {
      final crops = response['crops'];
      if (crops is! Map || !crops.containsKey(requestedCrop)) {
        throw ArgumentError.value(crop, 'crop', 'Defaults not found for crop.');
      }
      response['crops'] = {requestedCrop: crops[requestedCrop]};
    }

    return response;
  }
}
