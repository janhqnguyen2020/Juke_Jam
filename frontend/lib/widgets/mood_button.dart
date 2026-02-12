import 'package:flutter/material.dart';

/// A big tappable mood button for the home screen.
/// STYLIZE THIS — icon, color, shape, animation are all placeholder.
class MoodButton extends StatelessWidget {
  final String mood;       // "happy" | "sad" | "chill" | "hype"
  final IconData icon;
  final VoidCallback onTap;

  const MoodButton({
    super.key,
    required this.mood,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            // STYLIZE: mood-specific colors, gradients, images
            radius: 36,
            child: Icon(icon, size: 32),
          ),
          const SizedBox(height: 8),
          Text(
            mood[0].toUpperCase() + mood.substring(1),
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ],
      ),
    );
  }
}
