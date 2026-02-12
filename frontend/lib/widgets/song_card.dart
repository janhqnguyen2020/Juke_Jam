import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/song.dart';

/// Displays one song result with playback links.
/// STYLIZE THIS — colors, fonts, layout, icons are all placeholder.
class SongCard extends StatelessWidget {
  final Song song;
  final int rank;

  const SongCard({super.key, required this.song, required this.rank});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ExpansionTile(
        leading: CircleAvatar(
          // STYLIZE: Replace with album art or genre icon
          child: Text('$rank'),
        ),
        title: Text(song.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(song.artistName),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(song.durationFormatted,
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _badge(context, song.moodBucket),
                const SizedBox(width: 4),
                _badge(context, song.energyLabel),
              ],
            ),
          ],
        ),
        // --- Expanded detail: playback links + metadata ---
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Song details
                Text(
                  '${song.albumName}  •  ${song.genre}  •  ${song.tempoLabel} tempo',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),

                // --- Playback buttons ---
                // STYLIZE: button colors, icons, layout
                Row(
                  children: [
                    // Open in Spotify
                    FilledButton.icon(
                      onPressed: () => _openUrl(song.spotifyUrl),
                      icon: const Icon(Icons.play_circle_fill, size: 18),
                      label: const Text('Spotify'),
                      style: FilledButton.styleFrom(
                        // STYLIZE: Spotify green = Color(0xFF1DB954)
                        backgroundColor: const Color(0xFF1DB954),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Search on YouTube
                    OutlinedButton.icon(
                      onPressed: () => _openUrl(song.youtubeSearchUrl),
                      icon: const Icon(Icons.ondemand_video, size: 18),
                      label: const Text('YouTube'),
                      style: OutlinedButton.styleFrom(
                        // STYLIZE: YouTube red = Color(0xFFFF0000)
                        foregroundColor: const Color(0xFFFF0000),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _badge(BuildContext context, String label) {
    // STYLIZE: Pick mood/energy colors here
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: const TextStyle(fontSize: 10)),
    );
  }

  Future<void> _openUrl(Uri url) async {
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }
}
