import 'dart:math';

import 'crops.dart';
import 'storage.dart';

class ScenarioStore {
  ScenarioStore(String path) : _store = JsonFileStore(path);

  final JsonFileStore _store;
  final _random = Random.secure();

  Future<List<Map<String, Object?>>> listSummaries() async {
    final scenarios = await _readScenarios();
    return scenarios.map(_summaryFor).toList()
      ..sort((a, b) => '${b['updatedAt']}'.compareTo('${a['updatedAt']}'));
  }

  Future<Map<String, Object?>?> get(String id) async {
    final scenarios = await _readScenarios();
    for (final scenario in scenarios) {
      if (scenario['id'] == id) return scenario;
    }
    return null;
  }

  Future<Map<String, Object?>> create(Map<String, Object?> payload) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final scenario = _normalizeScenario(payload)
      ..['id'] = _newId()
      ..['createdAt'] = now
      ..['updatedAt'] = now;
    final scenarios = await _readScenarios();
    scenarios.add(scenario);
    await _writeScenarios(scenarios);
    return scenario;
  }

  Future<Map<String, Object?>?> update(
    String id,
    Map<String, Object?> payload,
  ) async {
    final scenarios = await _readScenarios();
    final index = scenarios.indexWhere((scenario) => scenario['id'] == id);
    if (index == -1) return null;

    final existing = scenarios[index];
    final normalized = _normalizeScenario(payload);
    final updated = <String, Object?>{
      ...existing,
      ...normalized,
      'id': id,
      'createdAt': existing['createdAt'],
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    };
    scenarios[index] = updated;
    await _writeScenarios(scenarios);
    return updated;
  }

  Future<bool> delete(String id) async {
    final scenarios = await _readScenarios();
    final next = scenarios.where((scenario) => scenario['id'] != id).toList();
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
    return normalized.map((key, value) => MapEntry(key.toString(), value));
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
