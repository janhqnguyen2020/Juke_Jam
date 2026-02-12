import 'package:flutter/material.dart';
import '../models/user_profile.dart';
import '../services/api_service.dart';

/// Profile screen — shows the user's aggregated taste data.
///
/// STYLIZE: charts, colors, layout. Consider bar charts for mood distribution,
/// pie chart for listening time, etc.
class ProfileScreen extends StatefulWidget {
  final String userId;
  const ProfileScreen({super.key, required this.userId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await ApiService.getUserProfile(widget.userId);
      setState(() => _profile = p);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading profile: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _profile == null
              ? const Center(child: Text('Profile not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // --- User header ---
                      // STYLIZE: avatar, name styling
                      Center(
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 40,
                              child: Text(
                                _profile!.userId[0].toUpperCase(),
                                style: const TextStyle(fontSize: 32),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _profile!.userId,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // --- Top Genres ---
                      _sectionTitle(context, 'Top Genres'),
                      Wrap(
                        spacing: 8,
                        children: _profile!.topGenres
                            .map((g) => Chip(label: Text(g)))
                            .toList(),
                      ),
                      const SizedBox(height: 16),

                      // --- Mood Distribution ---
                      // STYLIZE: replace with a real bar/pie chart
                      _sectionTitle(context, 'Mood Preferences'),
                      ..._profile!.preferredMoods.entries.map(
                        (e) => _barRow(context, e.key, e.value),
                      ),
                      const SizedBox(height: 16),

                      // --- Listening Time ---
                      // STYLIZE: replace with a real chart
                      _sectionTitle(context, 'Listening Time'),
                      ..._profile!.listeningTimeProfile.entries.map(
                        (e) => _barRow(context, e.key, e.value),
                      ),
                      const SizedBox(height: 16),

                      // --- Stats row ---
                      _sectionTitle(context, 'Stats'),
                      _statCard(
                        'Avg Energy',
                        _profile!.avgEnergyPreference.toStringAsFixed(2),
                      ),
                      _statCard(
                        'Skip Rate',
                        '${(_profile!.skipRate * 100).toStringAsFixed(0)}%',
                      ),
                      const SizedBox(height: 16),

                      // --- Platform mix ---
                      _sectionTitle(context, 'Platforms'),
                      ..._profile!.platformMix.entries.map(
                        (e) => _barRow(
                          context,
                          e.key,
                          e.value,
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _sectionTitle(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    );
  }

  /// Simple horizontal bar — STYLIZE with real chart library.
  Widget _barRow(BuildContext context, String label, double value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(label)),
          Expanded(
            child: LinearProgressIndicator(
              value: value.clamp(0, 1),
              minHeight: 12,
              borderRadius: BorderRadius.circular(6),
            ),
          ),
          const SizedBox(width: 8),
          Text('${(value * 100).toStringAsFixed(0)}%'),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value) {
    return Card(
      child: ListTile(
        title: Text(label),
        trailing: Text(value, style: const TextStyle(fontSize: 18)),
      ),
    );
  }
}
