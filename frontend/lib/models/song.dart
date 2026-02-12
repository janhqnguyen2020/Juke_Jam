/// Mirrors backend SongResult — one song returned from search/recommend.
class Song {
  final String trackId;
  final String title;
  final String artistName;
  final String albumName;
  final String genre;
  final int durationMs;
  final int popularity;
  final String moodBucket;   // focus | sad | happy | chill | hype
  final String energyLabel;  // calm | medium | energetic
  final String moodLabel;    // happy | sad
  final String tempoLabel;   // slow | medium | fast
  final double danceability;
  final double energy;
  final double valence;
  final double score;

  Song({
    required this.trackId,
    required this.title,
    required this.artistName,
    required this.albumName,
    required this.genre,
    required this.durationMs,
    required this.popularity,
    required this.moodBucket,
    required this.energyLabel,
    required this.moodLabel,
    required this.tempoLabel,
    required this.danceability,
    required this.energy,
    required this.valence,
    required this.score,
  });

  factory Song.fromJson(Map<String, dynamic> j) => Song(
        trackId: j['track_id'] ?? '',
        title: j['title'] ?? '',
        artistName: j['artist_name'] ?? '',
        albumName: j['album_name'] ?? '',
        genre: j['genre'] ?? '',
        durationMs: (j['duration_ms'] ?? 0).toInt(),
        popularity: (j['popularity'] ?? 0).toInt(),
        moodBucket: j['mood_bucket'] ?? '',
        energyLabel: j['energy_label'] ?? '',
        moodLabel: j['mood_label'] ?? '',
        tempoLabel: j['tempo_label'] ?? '',
        danceability: (j['danceability'] ?? 0).toDouble(),
        energy: (j['energy'] ?? 0).toDouble(),
        valence: (j['valence'] ?? 0).toDouble(),
        score: (j['score'] ?? 0).toDouble(),
      );

  /// Format duration_ms as "3:50"
  String get durationFormatted {
    final minutes = durationMs ~/ 60000;
    final seconds = (durationMs % 60000) ~/ 1000;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  /// Opens directly in Spotify app or web player — no API key needed.
  Uri get spotifyUrl =>
      Uri.parse('https://open.spotify.com/track/$trackId');

  /// 30-second preview embed (works in browsers) — no API key needed.
  Uri get spotifyEmbedUrl =>
      Uri.parse('https://open.spotify.com/embed/track/$trackId');

  /// YouTube search for this song — no API key needed.
  Uri get youtubeSearchUrl => Uri.https(
        'www.youtube.com',
        '/results',
        {'search_query': '$title $artistName'},
      );
}
