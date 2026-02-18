class Song {
  final String trackId;
  final String title;
  final String artist;
  final String genre;
  final String mainGenre;
  final String mood;
  final String energyLabel;
  final int popularity;
  final double score;

  Song({
    required this.trackId,
    required this.title,
    required this.artist,
    required this.genre,
    required this.mainGenre,
    required this.mood,
    required this.energyLabel,
    required this.popularity,
    required this.score,
  });

  factory Song.fromJson(Map<String, dynamic> json) {
    return Song(
      trackId:     json['track_id']    ?? '',
      title:       json['title']       ?? 'Unknown',
      artist:      json['artist']      ?? 'Unknown',
      genre:       json['genre']       ?? '',
      mainGenre:   json['main_genre']  ?? '',
      mood:        json['mood']        ?? '',
      energyLabel: json['energy_label'] ?? '',
      popularity:  (json['popularity'] ?? 0) as int,
      score:       (json['score']      ?? 0.0).toDouble(),
    );
  }
}
