import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingManualPage extends StatefulWidget {
  const OnboardingManualPage({super.key});

  @override
  State<OnboardingManualPage> createState() => _OnboardingManualPageState();
}

class _OnboardingManualPageState extends State<OnboardingManualPage> {
  int _step = 0;
  final _pageController = PageController();

  final Set<String> _genres     = {};
  String?           _energy;
  final Set<String> _moods       = {};
  final Set<String> _activities  = {};

  static const _genreOptions    = ['pop','rock','hip-hop','electronic','latin','indie','jazz','r-n-b','classical','metal','country','folk'];
  static const _moodOptions     = ['happy','chill','focus','hype','sad'];
  static const _activityOptions = ['workout','study','relax','commute','party','sleep'];
  static const _activityIcons   = {
    'workout': Icons.fitness_center,
    'study':   Icons.menu_book,
    'relax':   Icons.self_improvement,
    'commute': Icons.directions_transit,
    'party':   Icons.celebration,
    'sleep':   Icons.bedtime,
  };

  void _next() {
    if (_step < 3) {
      setState(() => _step++);
      _pageController.nextPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    } else {
      _finish();
    }
  }

  void _back() {
    if (_step > 0) {
      setState(() => _step--);
      _pageController.previousPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }

  Future<void> _finish() async {
    final prefs  = await SharedPreferences.getInstance();
    final userId = 'user_${DateTime.now().millisecondsSinceEpoch}';
    await prefs.setString('user_id', userId);
    if (mounted) Navigator.pushReplacementNamed(context, '/home');
  }

  bool get _canProceed {
    switch (_step) {
      case 0: return _genres.isNotEmpty;
      case 1: return _energy != null;
      case 2: return _moods.isNotEmpty;
      case 3: return _activities.isNotEmpty;
      default: return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _step > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: _back)
            : null,
        title: Text('Step ${_step + 1} of 4',
            style: const TextStyle(color: Colors.grey, fontSize: 14)),
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: (_step + 1) / 4,
            backgroundColor: Colors.white12,
            color: const Color(0xFF1DB954),
          ),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildGenreStep(),
                _buildEnergyStep(),
                _buildMoodStep(),
                _buildActivityStep(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
            child: ElevatedButton(
              onPressed: _canProceed ? _next : null,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF1DB954),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
                disabledBackgroundColor: Colors.white12,
              ),
              child: Text(
                _step == 3 ? "Let's Go" : 'Next',
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepShell({required String title, required String sub, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(sub, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const SizedBox(height: 24),
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _buildGenreStep() => _stepShell(
        title: 'What do you listen to?',
        sub: 'Pick at least one genre.',
        child: SingleChildScrollView(
          child: Wrap(
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
                labelStyle:
                    TextStyle(color: sel ? Colors.black : Colors.white70),
                checkmarkColor: Colors.black,
              );
            }).toList(),
          ),
        ),
      );

  Widget _buildEnergyStep() => _stepShell(
        title: 'Your usual energy?',
        sub: 'How intense is your typical session?',
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _energyTile('calm', 'Calm', 'Soft, acoustic, slow tempo'),
            const SizedBox(height: 12),
            _energyTile('medium', 'Medium', 'Balanced, varied tempo'),
            const SizedBox(height: 12),
            _energyTile('energetic', 'Energetic', 'High intensity, driving beat'),
          ],
        ),
      );

  Widget _energyTile(String value, String label, String desc) {
    final sel = _energy == value;
    return GestureDetector(
      onTap: () => setState(() => _energy = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: sel
              ? const Color(0xFF1DB954).withOpacity(0.12)
              : const Color(0xFF1A1A1A),
          border: Border.all(
              color: sel ? const Color(0xFF1DB954) : Colors.transparent,
              width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              sel ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: sel ? const Color(0xFF1DB954) : Colors.grey,
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        color: sel ? Colors.white : Colors.white70,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                Text(desc,
                    style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMoodStep() => _stepShell(
        title: 'Your usual mood?',
        sub: 'Pick all that apply.',
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _moodOptions.map((m) {
            final sel = _moods.contains(m);
            return FilterChip(
              label: Text(m),
              selected: sel,
              onSelected: (_) =>
                  setState(() => sel ? _moods.remove(m) : _moods.add(m)),
              backgroundColor: const Color(0xFF1A1A1A),
              selectedColor: const Color(0xFF7C4DFF),
              labelStyle:
                  TextStyle(color: sel ? Colors.white : Colors.white70),
              checkmarkColor: Colors.white,
            );
          }).toList(),
        ),
      );

  Widget _buildActivityStep() => _stepShell(
        title: 'What do you listen for?',
        sub: 'Pick all activities that apply.',
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _activityOptions.map((a) {
            final sel = _activities.contains(a);
            return FilterChip(
              avatar: Icon(_activityIcons[a],
                  size: 16, color: sel ? Colors.black : Colors.white54),
              label: Text(a),
              selected: sel,
              onSelected: (_) => setState(
                  () => sel ? _activities.remove(a) : _activities.add(a)),
              backgroundColor: const Color(0xFF1A1A1A),
              selectedColor: const Color(0xFFFF6D00),
              labelStyle:
                  TextStyle(color: sel ? Colors.black : Colors.white70),
              checkmarkColor: Colors.black,
            );
          }).toList(),
        ),
      );
}
