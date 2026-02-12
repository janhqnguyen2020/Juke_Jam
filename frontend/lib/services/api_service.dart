import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/song.dart';
import '../models/user_profile.dart';

/// Single point of contact with the FastAPI backend.
/// Change [baseUrl] if running on a different host/port.
class ApiService {
  // For Android emulator use 10.0.2.2; for physical device use your LAN IP.
  // For Windows/web/desktop, localhost works.
  static const String baseUrl = 'http://localhost:8000';

  // ---------- metadata ----------

  static Future<List<String>> getGenres() async {
    final res = await http.get(Uri.parse('$baseUrl/genres'));
    return List<String>.from(jsonDecode(res.body));
  }

  static Future<List<String>> getMoods() async {
    final res = await http.get(Uri.parse('$baseUrl/moods'));
    return List<String>.from(jsonDecode(res.body));
  }

  static Future<List<String>> getEnergyLevels() async {
    final res = await http.get(Uri.parse('$baseUrl/energy-levels'));
    return List<String>.from(jsonDecode(res.body));
  }

  static Future<List<String>> getUsers() async {
    final res = await http.get(Uri.parse('$baseUrl/users'));
    return List<String>.from(jsonDecode(res.body));
  }

  // ---------- search ----------

  static Future<List<Song>> search({
    String? title,
    String? artist,
    List<String>? genres,
    String? mood,
    String? energy,
    int topK = 20,
  }) async {
    final body = <String, dynamic>{};
    if (title != null && title.isNotEmpty) body['title'] = title;
    if (artist != null && artist.isNotEmpty) body['artist'] = artist;
    if (genres != null && genres.isNotEmpty) body['genres'] = genres;
    if (mood != null && mood.isNotEmpty) body['mood'] = mood;
    if (energy != null && energy.isNotEmpty) body['energy'] = energy;
    body['top_k'] = topK;

    final res = await http.post(
      Uri.parse('$baseUrl/search'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final list = jsonDecode(res.body) as List;
    return list.map((j) => Song.fromJson(j)).toList();
  }

  // ---------- recommend ----------

  static Future<List<Song>> recommend({
    required String userId,
    required String mood,
    String? activity,
    int topK = 20,
  }) async {
    final body = <String, dynamic>{
      'user_id': userId,
      'mood': mood,
      'top_k': topK,
    };
    if (activity != null) body['activity'] = activity;

    final res = await http.post(
      Uri.parse('$baseUrl/recommend'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final list = jsonDecode(res.body) as List;
    return list.map((j) => Song.fromJson(j)).toList();
  }

  // ---------- user profile ----------

  static Future<UserProfile> getUserProfile(String userId) async {
    final res = await http.get(Uri.parse('$baseUrl/user/$userId'));
    return UserProfile.fromJson(jsonDecode(res.body));
  }

  // ---------- onboarding ----------

  static Future<void> submitOnboarding({
    required String userId,
    required List<String> favoriteGenres,
    required List<String> favoriteArtists,
    required String vibeStudy,
    required String vibeWorkout,
    required String vibeGettingReady,
    required String vibeCleaning,
  }) async {
    await http.post(
      Uri.parse('$baseUrl/user/onboarding'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'favorite_genres': favoriteGenres,
        'favorite_artists': favoriteArtists,
        'vibe_study': vibeStudy,
        'vibe_workout': vibeWorkout,
        'vibe_getting_ready': vibeGettingReady,
        'vibe_cleaning': vibeCleaning,
      }),
    );
  }
}
