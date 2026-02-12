import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Onboarding flow for new users — 3 steps:
///   1. Pick 5 favorite genres
///   2. Type 5 favorite artists
///   3. Pick vibes for each activity (study / workout / getting ready / cleaning)
///
/// STYLIZE: page transitions, genre grid layout, artist input UX,
/// vibe selection cards, progress indicator.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageCtrl = PageController();
  int _currentPage = 0;

  // Step 0: username
  final _usernameCtrl = TextEditingController();

  // Step 1: genres
  List<String> _allGenres = [];
  final List<String> _selectedGenres = [];

  // Step 2: artists
  final List<TextEditingController> _artistCtrls =
      List.generate(5, (_) => TextEditingController());

  // Step 3: vibes per activity
  final Map<String, String> _activityVibes = {
    'Studying': '',
    'Working out': '',
    'Getting ready': '',
    'Cleaning': '',
  };

  final List<String> _moods = ['happy', 'sad', 'chill', 'hype', 'focus'];

  @override
  void initState() {
    super.initState();
    _loadGenres();
  }

  Future<void> _loadGenres() async {
    try {
      _allGenres = await ApiService.getGenres();
      setState(() {});
    } catch (_) {}
  }

  void _next() {
    if (_currentPage < 3) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentPage++);
    } else {
      _submit();
    }
  }

  bool get _canProceed {
    switch (_currentPage) {
      case 0:
        return _usernameCtrl.text.trim().isNotEmpty;
      case 1:
        return _selectedGenres.isNotEmpty;
      case 2:
        return _artistCtrls.any((c) => c.text.trim().isNotEmpty);
      case 3:
        return _activityVibes.values.every((v) => v.isNotEmpty);
      default:
        return false;
    }
  }

  Future<void> _submit() async {
    try {
      await ApiService.submitOnboarding(
        userId: _usernameCtrl.text.trim(),
        favoriteGenres: _selectedGenres.take(5).toList(),
        favoriteArtists: _artistCtrls
            .map((c) => c.text.trim())
            .where((s) => s.isNotEmpty)
            .toList(),
        vibeStudy: _activityVibes['Studying'] ?? 'chill',
        vibeWorkout: _activityVibes['Working out'] ?? 'hype',
        vibeGettingReady: _activityVibes['Getting ready'] ?? 'happy',
        vibeCleaning: _activityVibes['Cleaning'] ?? 'chill',
      );
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/home',
            arguments: _usernameCtrl.text.trim());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // STYLIZE: background gradient, app bar
      appBar: AppBar(
        title: Text('Welcome to JukeJam (${_currentPage + 1}/4)'),
      ),
      body: Column(
        children: [
          // --- Progress indicator ---
          // STYLIZE: custom progress bar
          LinearProgressIndicator(value: (_currentPage + 1) / 4),

          // --- Pages ---
          Expanded(
            child: PageView(
              controller: _pageCtrl,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildUsernamePage(),
                _buildGenrePage(),
                _buildArtistPage(),
                _buildVibePage(),
              ],
            ),
          ),

          // --- Next button ---
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _canProceed ? _next : null,
                child: Text(_currentPage == 3 ? 'Get Started' : 'Next'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ----- Page 0: Username -----
  Widget _buildUsernamePage() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('What should we call you?',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          TextField(
            controller: _usernameCtrl,
            decoration: const InputDecoration(
              hintText: 'Your name',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
    );
  }

  // ----- Page 1: Genre picker -----
  Widget _buildGenrePage() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // STYLIZE: heading
          Text('Pick your favorite genres (up to 5)',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text('${_selectedGenres.length}/5 selected'),
          const SizedBox(height: 12),
          Expanded(
            child: SingleChildScrollView(
              // STYLIZE: grid vs wrap, chip colors
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _allGenres.map((g) {
                  final selected = _selectedGenres.contains(g);
                  return FilterChip(
                    label: Text(g),
                    selected: selected,
                    onSelected: (_) {
                      setState(() {
                        if (selected) {
                          _selectedGenres.remove(g);
                        } else if (_selectedGenres.length < 5) {
                          _selectedGenres.add(g);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ----- Page 2: Artist text fields -----
  Widget _buildArtistPage() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // STYLIZE: heading
          Text('Who are your favorite artists?',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          const Text('Enter up to 5'),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: 5,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) => TextField(
                controller: _artistCtrls[i],
                decoration: InputDecoration(
                  hintText: 'Artist ${i + 1}',
                  border: const OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ----- Page 3: Vibe per activity -----
  Widget _buildVibePage() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // STYLIZE: heading
          Text('What vibes do you like when...',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: _activityVibes.keys.map((activity) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(activity,
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        // STYLIZE: mood-specific colors per activity
                        children: _moods.map((m) {
                          final selected = _activityVibes[activity] == m;
                          return ChoiceChip(
                            label: Text(m),
                            selected: selected,
                            onSelected: (_) {
                              setState(() => _activityVibes[activity] = m);
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    _usernameCtrl.dispose();
    for (final c in _artistCtrls) {
      c.dispose();
    }
    super.dispose();
  }
}
