import 'dart:math';

import 'crops.dart';
import 'storage.dart';

class ScenarioStore {
  ScenarioStore(String path) : _store = JsonFileStore(path);

  final JsonFileStore _store;
  final _random = Random.secure();

  Future<List<Map<String, Object?>>> listSummaries(String userId) async {
    final scenarios = await _readScenarios();
    return scenarios
        .where((scenario) => scenario['userId'] == userId)
        .map(_summaryFor)
        .toList()
      ..sort((a, b) => '${b['updatedAt']}'.compareTo('${a['updatedAt']}'));
  }

  Future<Map<String, Object?>?> get(String userId, String id) async {
    final scenarios = await _readScenarios();
    for (final scenario in scenarios) {
      if (scenario['id'] == id && scenario['userId'] == userId) {
        return _publicScenario(scenario);
      }
    }
    return null;
  }

  Future<Map<String, Object?>> create(
    String userId,
    Map<String, Object?> payload,
  ) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final scenario = _normalizeScenario(payload)
      ..['id'] = _newId()
      ..['userId'] = userId
      ..['createdAt'] = now
      ..['updatedAt'] = now;
    final scenarios = await _readScenarios();
    scenarios.add(scenario);
    await _writeScenarios(scenarios);
    return scenario;
  }

  Future<Map<String, Object?>?> update(
    String userId,
    String id,
    Map<String, Object?> payload,
  ) async {
    final scenarios = await _readScenarios();
    final index = scenarios.indexWhere(
      (scenario) => scenario['id'] == id && scenario['userId'] == userId,
    );
    if (index == -1) return null;

    final existing = scenarios[index];
    final normalized = _normalizeScenario(payload);
    final updated = <String, Object?>{
      ...existing,
      ...normalized,
      'id': id,
      'userId': userId,
      'createdAt': existing['createdAt'],
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    };
    scenarios[index] = updated;
    await _writeScenarios(scenarios);
    return updated;
  }

  Future<bool> delete(String userId, String id) async {
    final scenarios = await _readScenarios();
    final next = scenarios
        .where(
          (scenario) => !(scenario['id'] == id && scenario['userId'] == userId),
        )
        .toList();
    if (next.length == scenarios.length) return false;
    await _writeScenarios(next);
    return true;
  }

  Future<List<Map<String, Object?>>> _readScenarios() async {
    final data = await _store.read();
    if (data == null) return [];
    if (data is! List) {
      throw StateError('Scenario store must contain a JSON array.');
    }
    return data
        .whereType<Map>()
        .map(
          (item) => item.map((key, value) => MapEntry(key.toString(), value)),
        )
        .toList();
  }

  Future<void> _writeScenarios(List<Map<String, Object?>> scenarios) {
    return _store.write(scenarios);
  }

  Map<String, Object?> _normalizeScenario(Map<String, Object?> payload) {
    final normalized = normalizeCropKeys(payload);
    if (normalized is! Map) return payload;
    final result = normalized.map(
      (key, value) => MapEntry(key.toString(), value),
    );
    result.remove('userId');
    result.remove('createdAt');
    result.remove('updatedAt');
    result.remove('id');
    return result;
  }

  Map<String, Object?> _publicScenario(Map<String, Object?> scenario) {
    final result = Map<String, Object?>.from(scenario);
    result.remove('userId');
    return result;
  }

  Map<String, Object?> _summaryFor(Map<String, Object?> scenario) {
    final crops = scenario['crops'];
    String? crop;
    if (crops is List && crops.isNotEmpty && crops.first is Map) {
      crop = normalizeCrop((crops.first as Map)['crop']);
    }
    final farm = scenario['farm'];
    final farmName = farm is Map ? farm['name'] : null;
    final year = scenario['year'];
    return {
      'id': scenario['id'],
      'name': farmName is String && farmName.trim().isNotEmpty
          ? farmName
          : 'Scenario ${scenario['id']}',
      'crop': crop ?? 'corn',
      'season': year?.toString() ?? '2026',
      'updatedAt': scenario['updatedAt'],
    };
  }

  String _newId() {
    final millis = DateTime.now().toUtc().millisecondsSinceEpoch;
    final suffix = List.generate(
      6,
      (_) => _random.nextInt(16).toRadixString(16),
    ).join();
    return 'scn_$millis$suffix';
  }
}
