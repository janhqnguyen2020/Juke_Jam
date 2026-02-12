import 'package:flutter/material.dart';
import '../models/song.dart';
import '../services/api_service.dart';
import '../widgets/song_card.dart';

/// Search screen — text query + filter chips for genre/mood/energy.
///
/// STYLIZE: search bar appearance, chip colors, empty/loading states.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _titleCtrl = TextEditingController();
  final _artistCtrl = TextEditingController();

  List<String> _allGenres = [];
  final List<String> _selectedGenres = [];
  String? _selectedMood;
  String? _selectedEnergy;

  List<Song> _results = [];
  bool _loading = false;
  bool _hasSearched = false;

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

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _hasSearched = true;
    });
    try {
      final songs = await ApiService.search(
        title: _titleCtrl.text,
        artist: _artistCtrl.text,
        genres: _selectedGenres.isNotEmpty ? _selectedGenres : null,
        mood: _selectedMood,
        energy: _selectedEnergy,
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
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          // --- Text inputs ---
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _titleCtrl,
              // STYLIZE: search bar decoration
              decoration: const InputDecoration(
                hintText: 'Song title...',
                prefixIcon: Icon(Icons.music_note),
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _search(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _artistCtrl,
              decoration: const InputDecoration(
                hintText: 'Artist name...',
                prefixIcon: Icon(Icons.person_search),
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _search(),
            ),
          ),

          // --- Mood filter ---
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final mood in ['happy', 'sad', 'chill', 'hype', 'focus'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(mood),
                      selected: _selectedMood == mood,
                      onSelected: (_) {
                        setState(() {
                          _selectedMood =
                              _selectedMood == mood ? null : mood;
                        });
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // --- Energy filter ---
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final e in ['calm', 'medium', 'energetic'])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(e),
                      selected: _selectedEnergy == e,
                      onSelected: (_) {
                        setState(() {
                          _selectedEnergy =
                              _selectedEnergy == e ? null : e;
                        });
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // --- Genre filter (expandable) ---
          ExpansionTile(
            title: Text(
              _selectedGenres.isEmpty
                  ? 'Filter by genre'
                  : 'Genres (${_selectedGenres.length})',
            ),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: _allGenres.map((g) {
                    final selected = _selectedGenres.contains(g);
                    return FilterChip(
                      label: Text(g, style: const TextStyle(fontSize: 12)),
                      selected: selected,
                      onSelected: (_) {
                        setState(() {
                          selected
                              ? _selectedGenres.remove(g)
                              : _selectedGenres.add(g);
                        });
                      },
                    );
                  }).toList(),
                ),
              ),
            ],
          ),

          // --- Search button ---
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              // STYLIZE: button color, shape
              child: FilledButton.icon(
                onPressed: _search,
                icon: const Icon(Icons.search),
                label: const Text('Search'),
              ),
            ),
          ),

          // --- Results ---
          if (_loading)
            const Padding(
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
          if (!_loading && _hasSearched && _results.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text('No results found'),
            ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _artistCtrl.dispose();
    super.dispose();
  }
}
