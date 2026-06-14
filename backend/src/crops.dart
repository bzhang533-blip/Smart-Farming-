const canonicalCrops = {'corn', 'soybeans', 'other'};

String? normalizeCrop(Object? value) {
  if (value is! String) return null;
  final normalized = value.trim().toLowerCase();
  if (normalized == 'soybean') return 'soybeans';
  if (canonicalCrops.contains(normalized)) return normalized;
  return null;
}

Object? normalizeCropKeys(Object? value) {
  if (value is List) {
    return value.map(normalizeCropKeys).toList();
  }
  if (value is Map) {
    final result = <String, Object?>{};
    for (final entry in value.entries) {
      final rawKey = entry.key.toString();
      final key = rawKey == 'soybean' ? 'soybeans' : rawKey;
      final normalizedValue = rawKey == 'crop'
          ? normalizeCrop(entry.value)
          : normalizeCropKeys(entry.value);
      result[key] = normalizedValue ?? entry.value;
    }
    return result;
  }
  return value;
}
