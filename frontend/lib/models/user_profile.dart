/// Mirrors backend UserProfileResponse.
class UserProfile {
  final String userId;
  final List<String> topGenres;
  final Map<String, double> preferredMoods;   // {happy: 0.15, chill: 0.55, ...}
  final double avgEnergyPreference;
  final Map<String, double> listeningTimeProfile; // {morning: 0.15, ...}
  final double skipRate;
  final Map<String, double> platformMix;      // {mobile: 0.9, desktop: 0.1}

  UserProfile({
    required this.userId,
    required this.topGenres,
    required this.preferredMoods,
    required this.avgEnergyPreference,
    required this.listeningTimeProfile,
    required this.skipRate,
    required this.platformMix,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        userId: j['user_id'] ?? '',
        topGenres: List<String>.from(j['top_genres'] ?? []),
        preferredMoods: _toDoubleMap(j['preferred_moods']),
        avgEnergyPreference: (j['avg_energy_preference'] ?? 0).toDouble(),
        listeningTimeProfile: _toDoubleMap(j['listening_time_profile']),
        skipRate: (j['skip_rate'] ?? 0).toDouble(),
        platformMix: _toDoubleMap(j['platform_mix']),
      );

  static Map<String, double> _toDoubleMap(dynamic m) {
    if (m is Map) {
      return m.map((k, v) => MapEntry(k.toString(), (v as num).toDouble()));
    }
    return {};
  }

  /// Dominant mood (highest weight)
  String get dominantMood {
    if (preferredMoods.isEmpty) return 'unknown';
    return preferredMoods.entries.reduce((a, b) => a.value > b.value ? a : b).key;
  }
}
