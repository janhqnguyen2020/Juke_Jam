import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/song.dart';
import '../services/api_service.dart';
import '../widgets/song_card.dart';
import '../widgets/filter_chip_row.dart';
import 'context_quiz_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String? _userId;

  // Active filters — null means not set
  String? _mood;
  String? _energy;
  String? _genre;
  String? _activity;
  String  _searchText = '';

  List<Song> _results     = [];
  bool       _loading     = false;
  String?    _feedLabel;

  DateTime? _lastType;

  static const _moods      = ['happy','chill','focus','hype','sad'];
  static const _energies   = ['calm','medium','energetic'];
  static const _genres     = ['pop','rock','hip-hop','electronic','latin','indie','jazz','r-n-b','classical','metal','country','folk'];
  static const _activities = ['workout','study','relax','commute','party','sleep'];

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString('user_id');
    if (id == null) {
      if (mounted) Navigator.pushReplacementNamed(context, '/');
      return;
    }
    setState(() => _userId = id);
    _loadHome();
  }

  Future<void> _loadHome() async {
    if (_userId == null) return;
    setState(() { _loading = true; _feedLabel = null; });
    try {
      final songs = await ApiService.homeFeed(_userId!);
      final h = DateTime.now().hour;
      final slot = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 22 ? 'Evening' : 'Night';
      setState(() { _results = songs; _feedLabel = 'Recommended for $slot'; });
    } catch (_) {
      _showError('Could not load home feed.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _search() async {
    if (_userId == null) return;
    setState(() { _loading = true; _feedLabel = null; });
    try {
      final songs = await ApiService.recommend(
        userId: _userId!,
        mood: _mood,
        energy: _energy,
        activity: _activity,
        mainGenres: _genre != null ? [_genre!] : null,
        searchQuery: _searchText.isNotEmpty ? _searchText : null,
      );
      setState(() => _results = songs);
    } catch (_) {
      _showError('Could not load recommendations.');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _onFilterTap() {
    if (_anyFilter) { _search(); } else { _loadHome(); }
  }

  void _onTyping(String v) {
    _searchText = v;
    final t = DateTime.now();
    _lastType = t;
    Future.delayed(const Duration(milliseconds: 420), () {
      if (_lastType == t) _onFilterTap();
    });
  }

  Future<void> _openQuiz() async {
    if (_userId == null) return;
    final songs = await Navigator.push<List<Song>>(
      context,
      MaterialPageRoute(builder: (_) => ContextQuizPage(userId: _userId!)),
    );
    if (songs != null && mounted) {
      setState(() { _results = songs; _feedLabel = 'Based on your current vibe'; });
    }
  }

  void _clear() {
    setState(() { _mood = null; _energy = null; _genre = null; _activity = null; _searchText = ''; });
    _loadHome();
  }

  bool get _anyFilter =>
      _mood != null || _energy != null || _genre != null || _activity != null || _searchText.isNotEmpty;

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red.shade800));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _header(),
            _searchBar(),
            const SizedBox(height: 10),
            FilterChipRow(label: 'Genre',    options: _genres,     selected: _genre,    color: const Color(0xFF1DB954), onSelected: (v) { setState(() => _genre    = v == _genre    ? null : v); _onFilterTap(); }),
            const SizedBox(height: 6),
            FilterChipRow(label: 'Mood',     options: _moods,      selected: _mood,     color: const Color(0xFF7C4DFF), onSelected: (v) { setState(() => _mood     = v == _mood     ? null : v); _onFilterTap(); }),
            const SizedBox(height: 6),
            FilterChipRow(label: 'Energy',   options: _energies,   selected: _energy,   color: const Color(0xFFFF6D00), onSelected: (v) { setState(() => _energy   = v == _energy   ? null : v); _onFilterTap(); }),
            const SizedBox(height: 6),
            FilterChipRow(label: 'Activity', options: _activities, selected: _activity, color: const Color(0xFF00BCD4), onSelected: (v) { setState(() => _activity = v == _activity ? null : v); _onFilterTap(); }),
            _actionButtons(),
            _resultsHeader(),
            Expanded(child: _resultsList()),
          ],
        ),
      ),
    );
  }

  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
        child: Row(
          children: [
            const Text('JukeJam',
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            if (_anyFilter)
              TextButton(
                  onPressed: _clear,
                  child: const Text('Clear', style: TextStyle(color: Colors.grey))),
          ],
        ),
      );

  Widget _searchBar() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        child: TextField(
          onChanged: _onTyping,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Search songs, artists...',
            hintStyle: const TextStyle(color: Colors.grey),
            prefixIcon: const Icon(Icons.search, color: Colors.grey),
            filled: true,
            fillColor: const Color(0xFF1A1A1A),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      );

  Widget _actionButtons() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _loading ? null : _loadHome,
                icon: const Icon(Icons.access_time, size: 16),
                label: const Text('Right Now'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _loading ? null : _openQuiz,
                icon: const Icon(Icons.tune, size: 16),
                label: const Text('Context Quiz'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C4DFF),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _resultsHeader() => Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 2),
        child: _feedLabel != null
            ? Text(_feedLabel!, style: const TextStyle(color: Colors.grey, fontSize: 13))
            : _results.isNotEmpty
                ? Text('${_results.length} results',
                    style: const TextStyle(color: Colors.grey, fontSize: 13))
                : const SizedBox.shrink(),
      );

  Widget _resultsList() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1DB954)));
    }
    if (_results.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.music_off, color: Colors.grey, size: 48),
          SizedBox(height: 12),
          Text('No results yet.', style: TextStyle(color: Colors.grey)),
          Text('Try a filter or tap Right Now.', style: TextStyle(color: Colors.grey, fontSize: 12)),
        ]),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      itemCount: _results.length,
      itemBuilder: (_, i) => SongCard(song: _results[i]),
    );
  }
}
