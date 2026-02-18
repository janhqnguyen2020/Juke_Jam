import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/song.dart';

class ApiService {
  // Change this to your deployed URL when you go to production
  static const String _base = 'http://127.0.0.1:8000';

  // Called on app open — no filters, auto time detection on server
  static Future<List<Song>> homeFeed(String userId, {int topK = 10}) async {
    final uri = Uri.parse('$_base/recommend/home/$userId?top_k=$topK');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['recommendations'] as List)
          .map((j) => Song.fromJson(j))
          .toList();
    }
    throw Exception('Home feed failed: ${response.statusCode}');
  }

  // Called when user sets filters or runs the context quiz
  static Future<List<Song>> recommend({
    required String userId,
    String? mood,
    String? energy,
    String? activity,
    List<String>? mainGenres,
    String? searchQuery,
    int topK = 10,
  }) async {
    final body = <String, dynamic>{
      'user_id': userId,
      'top_k':   topK,
    };
    if (mood != null)                         body['mood']        = mood;
    if (energy != null)                       body['energy']      = energy;
    if (activity != null)                     body['activity']    = activity;
    if (mainGenres != null && mainGenres.isNotEmpty) body['main_genres'] = mainGenres;
    if (searchQuery != null && searchQuery.isNotEmpty) body['title']    = searchQuery;

    final response = await http.post(
      Uri.parse('$_base/recommend/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['recommendations'] as List)
          .map((j) => Song.fromJson(j))
          .toList();
    }
    throw Exception('Recommend failed: ${response.statusCode}');
  }
}
