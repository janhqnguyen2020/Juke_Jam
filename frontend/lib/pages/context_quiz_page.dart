import 'package:flutter/material.dart';
import '../models/song.dart';
import '../services/api_service.dart';

class ContextQuizPage extends StatefulWidget {
  final String userId;
  const ContextQuizPage({super.key, required this.userId});

  @override
  State<ContextQuizPage> createState() => _ContextQuizPageState();
}

class _ContextQuizPageState extends State<ContextQuizPage> {
  int     _step     = 0;
  String? _mood;
  String? _activity;
  final Set<String> _genres = {};
  bool _loading = false;

  static const _moodOptions = [
    {'label': 'Happy',  'value': 'happy',  'emoji': '😊'},
    {'label': 'Sad',    'value': 'sad',    'emoji': '😔'},
    {'label': 'Chill',  'value': 'chill',  'emoji': '😌'},
    {'label': 'Hype',   'value': 'hype',   'emoji': '🔥'},
    {'label': 'Focus',  'value': 'focus',  'emoji': '🎯'},
  ];

  static const _activityOptions = [
    {'label': 'Workout', 'value': 'workout', 'emoji': '🏋'},
    {'label': 'Study',   'value': 'study',   'emoji': '📚'},
    {'label': 'Relax',   'value': 'relax',   'emoji': '😴'},
    {'label': 'Commute', 'value': 'commute', 'emoji': '🚗'},
    {'label': 'Party',   'value': 'party',   'emoji': '🎉'},
    {'label': 'Sleep',   'value': 'sleep',   'emoji': '💤'},
  ];

  static const _genreOptions = [
    'pop','rock','hip-hop','electronic','latin','indie','jazz','r-n-b','classical','metal',
  ];

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      final songs = await ApiService.recommend(
        userId: widget.userId,
        mood: _mood,
        activity: _activity,
        mainGenres: _genres.isNotEmpty ? _genres.toList() : null,
        topK: 10,
      );
      if (mounted) Navigator.pop(context, songs);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not get recommendations.'),
              backgroundColor: Colors.red),
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
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          _step == 0 ? 'How are you feeling?' :
          _step == 1 ? 'What are you doing?' : 'What type of music?',
          style: const TextStyle(color: Colors.white, fontSize: 18),
        ),
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: (_step + 1) / 3,
            backgroundColor: Colors.white12,
            color: const Color(0xFF7C4DFF),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: _step == 0 ? _moodStep()
                   : _step == 1 ? _activityStep()
                                : _genreStep(),
            ),
          ),
          _bottomBar(),
        ],
      ),
    );
  }

  Widget _moodStep() => GridView.count(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 2,
        children: _moodOptions.map((m) {
          final sel = _mood == m['value'];
          return GestureDetector(
            onTap: () => setState(() => _mood = m['value']),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              decoration: BoxDecoration(
                color: sel ? const Color(0xFF7C4DFF).withOpacity(0.2) : const Color(0xFF1A1A1A),
                border: Border.all(
                    color: sel ? const Color(0xFF7C4DFF) : Colors.white12, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(m['emoji']!, style: const TextStyle(fontSize: 24)),
                const SizedBox(height: 4),
                Text(m['label']!,
                    style: TextStyle(
                        color: sel ? Colors.white : Colors.white54,
                        fontWeight: sel ? FontWeight.bold : FontWeight.normal)),
              ]),
            ),
          );
        }).toList(),
      );

  Widget _activityStep() => GridView.count(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 2,
        children: _activityOptions.map((a) {
          final sel = _activity == a['value'];
          return GestureDetector(
            onTap: () => setState(() => _activity = a['value']),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              decoration: BoxDecoration(
                color: sel ? const Color(0xFFFF6D00).withOpacity(0.2) : const Color(0xFF1A1A1A),
                border: Border.all(
                    color: sel ? const Color(0xFFFF6D00) : Colors.white12, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(a['emoji']!, style: const TextStyle(fontSize: 24)),
                const SizedBox(height: 4),
                Text(a['label']!,
                    style: TextStyle(
                        color: sel ? Colors.white : Colors.white54,
                        fontWeight: sel ? FontWeight.bold : FontWeight.normal)),
              ]),
            ),
          );
        }).toList(),
      );

  Widget _genreStep() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Optional — pick genres or skip.',
              style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _genreOptions.map((g) {
              final sel = _genres.contains(g);
              return FilterChip(
                label: Text(g),
                selected: sel,
                onSelected: (_) =>
                    setState(() => sel ? _genres.remove(g) : _genres.add(g)),
                backgroundColor: const Color(0xFF1A1A1A),
                selectedColor: const Color(0xFF1DB954),
                labelStyle: TextStyle(color: sel ? Colors.black : Colors.white70),
                checkmarkColor: Colors.black,
              );
            }).toList(),
          ),
        ],
      );

  Widget _bottomBar() {
    final isLast = _step == 2;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Row(
        children: [
          if (_step > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _step--),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
                child: const Text('Back'),
              ),
            ),
          if (_step > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _loading
                  ? null
                  : isLast
                      ? _submit
                      : () {
                          // Q1 requires mood, Q2 requires activity, Q3 optional
                          if (_step == 0 && _mood == null) return;
                          if (_step == 1 && _activity == null) return;
                          setState(() => _step++);
                        },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C4DFF),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                disabledBackgroundColor: Colors.white12,
              ),
              child: _loading
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(isLast ? 'Get Recommendations' : 'Next',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
