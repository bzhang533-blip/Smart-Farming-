import 'crops.dart';

String? validateScenarioPayload(Object? body, {bool partial = false}) {
  if (body is! Map) return 'Request body must be a JSON object.';

  final map = body;
  if (!partial || map.containsKey('year')) {
    if (map['year'] is! num) return 'Scenario.year must be a number.';
  }
  if (!partial || map.containsKey('region')) {
    if (map['region'] is! String || (map['region'] as String).trim().isEmpty) {
      return 'Scenario.region must be a non-empty string.';
    }
  }
  if (!partial || map.containsKey('crops')) {
    final crops = map['crops'];
    if (crops is! List || crops.isEmpty)
      return 'Scenario.crops must be a non-empty array.';
    for (final cropEntry in crops) {
      if (cropEntry is! Map) return 'Each crop entry must be an object.';
      final crop = normalizeCrop(cropEntry['crop']);
      if (crop == null) return 'Crop must be one of corn, soybeans, or other.';
      final numericError = _validateNumericFields(cropEntry, [
        'acres',
        'yieldBuPerAcre',
        'cashPricePerBu',
        'govtPaymentPerAcre',
        'landCostPerAcre',
        'machineryCostPerAcre',
      ]);
      if (numericError != null) return numericError;
    }
  }
  return null;
}

String? _validateNumericFields(Map<dynamic, dynamic> map, List<String> fields) {
  for (final field in fields) {
    if (map.containsKey(field) && map[field] is! num) {
      return 'CropEntry.$field must be a number.';
    }
  }
  return null;
}
