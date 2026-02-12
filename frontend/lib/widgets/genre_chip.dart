import 'package:flutter/material.dart';

/// Selectable genre chip used in onboarding + search filters.
/// STYLIZE THIS — colors, selected state, shape.
class GenreChip extends StatelessWidget {
  final String genre;
  final bool selected;
  final ValueChanged<bool> onSelected;

  const GenreChip({
    super.key,
    required this.genre,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(genre),
      selected: selected,
      onSelected: onSelected,
    );
  }
}
