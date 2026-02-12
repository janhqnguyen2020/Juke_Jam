import 'package:flutter/material.dart';
import '../models/song.dart';
import '../services/api_service.dart';
import '../widgets/mood_button.dart';
import '../widgets/song_card.dart';

/// Home screen — "What are the vibes today?"
/// User picks a mood, gets instant recommendations.
///
/// STYLIZE: background, mood button colors/icons, results layout.
class HomeScreen extends StatefulWidget {
  final String userId;
  const HomeScreen({super.key, required this.userId});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _selectedMood;
  String? _selectedActivity;
  List<Song> _results = [];
  bool _loading = false;

  final List<Map<String, dynamic>> _moods = [
    {'mood': 'happy', 'icon': Icons.sentiment_very_satisfied},
    {'mood': 'sad', 'icon': Icons.sentiment_dissatisfied},
    {'mood': 'hype', 'icon': Icons.local_fire_department},
    {'mood': 'chill', 'icon': Icons.spa},
  ];

  final List<String> _activities = ['study', 'workout', 'relax', 'commute'];

  Future<void> _getRecommendations(String mood) async {
    setState(() {
      _selectedMood = mood;
      _loading = true;
    });
    try {
      final songs = await ApiService.recommend(
        userId: widget.userId,
        mood: mood,
        activity: _selectedActivity,
      );
      setState(() => _results = songs);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JukeJam'),
        // STYLIZE: app bar theme
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.pushNamed(context, '/search'),
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => Navigator.pushNamed(context, '/profile'),
          ),
        ],
      ),
      body: Column(
        children: [
          // --- Mood question ---
          Padding(
            padding: const EdgeInsets.all(24),
            // STYLIZE: typography, spacing
            child: Text(
              'What are the vibes today?',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
          ),

          // --- Mood buttons ---
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: _moods
                .map((m) => MoodButton(
                      mood: m['mood'],
                      icon: m['icon'],
                      onTap: () => _getRecommendations(m['mood']),
                    ))
                .toList(),
          ),

          const SizedBox(height: 16),

          // --- Optional activity filter ---
          if (_selectedMood != null)
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: _activities.map((a) {
                  final selected = _selectedActivity == a;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(a),
                      selected: selected,
                      onSelected: (_) {
                        setState(() {
                          _selectedActivity = selected ? null : a;
                        });
                        if (_selectedMood != null) {
                          _getRecommendations(_selectedMood!);
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),

          const SizedBox(height: 8),

          // --- Results ---
          if (_loading) const Padding(
            padding: EdgeInsets.all(32),
            child: CircularProgressIndicator(),
          ),
          if (!_loading && _results.isNotEmpty)
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (context, i) =>
                    SongCard(song: _results[i], rank: i + 1),
              ),
            ),
          if (!_loading && _selectedMood != null && _results.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text('No results — try a different combo'),
            ),
        ],
      ),
    );
  }
}
