const canonicalCrops = {'corn', 'soybeans', 'other'};

String? normalizeCrop(Object? value) {
  if (value is! String) return null;
  final normalized = value.trim().toLowerCase();
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
      final normalizedValue = rawKey == 'crop'
          ? normalizeCrop(entry.value)
          : normalizeCropKeys(entry.value);
      result[rawKey] = normalizedValue ?? entry.value;
    }
    return result;
  }
  return value;
}
