import 'storage.dart';

class FarmStore {
  FarmStore(String path) : _store = JsonFileStore(path);

  final JsonFileStore _store;

  Future<Map<String, Object?>> getOrCreateFarm(
    String userId, {
    String? displayName,
  }) async {
    final farms = await _readFarms();
    final existing = farms[userId];
    if (existing != null) return _publicFarm(existing);

    final farm = _defaultFarm(userId, displayName: displayName);
    farms[userId] = farm;
    await _writeFarms(farms);
    return _publicFarm(farm);
  }

  Future<Map<String, Object?>> updateFarm(
    String userId,
    Map<String, Object?> patch,
  ) async {
    final farms = await _readFarms();
    final existing = farms[userId] ?? _defaultFarm(userId);
    final updated = <String, Object?>{
      ...existing,
      ..._sanitizeFarmPatch(patch),
      'farmId': existing['farmId'] ?? _farmIdFor(userId),
      'userId': userId,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    };
    farms[userId] = updated;
    await _writeFarms(farms);
    return updated;
  }

  Future<Map<String, Object?>> getMachinery(String userId) async {
    final farms = await _readFarms();
    final existing = farms[userId] ?? _defaultFarm(userId);
    if (!farms.containsKey(userId)) {
      farms[userId] = existing;
      await _writeFarms(farms);
    }
    return {
      'farmId': existing['farmId'] ?? _farmIdFor(userId),
      'machinery': existing['machinery'] is List ? existing['machinery'] : [],
    };
  }

  Future<Map<String, Map<String, Object?>>> _readFarms() async {
    final data = await _store.read();
    if (data == null) return {};
    if (data is! Map)
      throw StateError('Farm store must contain a JSON object.');
    return data.map((key, value) {
      final farm = value is Map
          ? value.map((k, v) => MapEntry(k.toString(), v))
          : <String, Object?>{};
      return MapEntry(key.toString(), farm);
    });
  }

  Future<void> _writeFarms(Map<String, Map<String, Object?>> farms) {
    return _store.write(farms);
  }

  Map<String, Object?> _defaultFarm(String userId, {String? displayName}) {
    final now = DateTime.now().toUtc().toIso8601String();
    final name = displayName != null && displayName.trim().isNotEmpty
        ? "${displayName.trim()}'s Farm"
        : 'My Farm';
    return {
      'farmId': _farmIdFor(userId),
      'userId': userId,
      'name': name,
      'state': 'IA',
      'fields': [],
      'costStructure': [],
      'machinery': [],
      'createdAt': now,
      'updatedAt': now,
    };
  }

  Map<String, Object?> _publicFarm(Map<String, Object?> farm) {
    return {
      'farmId': farm['farmId'],
      'name': farm['name'],
      'state': farm['state'],
      'fields': farm['fields'] is List ? farm['fields'] : [],
      'costStructure': farm['costStructure'] is List
          ? farm['costStructure']
          : [],
    };
  }

  Map<String, Object?> _sanitizeFarmPatch(Map<String, Object?> patch) {
    final result = <String, Object?>{};
    if (patch['name'] is String) result['name'] = patch['name'];
    if (patch['state'] is String) result['state'] = patch['state'];
    if (patch['fields'] is List) result['fields'] = patch['fields'];
    if (patch['costStructure'] is List) {
      result['costStructure'] = patch['costStructure'];
    }
    if (patch['machinery'] is List) result['machinery'] = patch['machinery'];
    return result;
  }

  String _farmIdFor(String userId) {
    final safe = userId.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
    return 'farm_$safe';
  }
}
