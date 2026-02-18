import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'pages/title_page.dart';
import 'pages/onboarding_manual_page.dart';
import 'pages/onboarding_spotify_page.dart';
import 'pages/home_page.dart';
import 'pages/context_quiz_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final userId = prefs.getString('user_id');
  runApp(JukeJamApp(initialRoute: userId != null ? '/home' : '/'));
}

class JukeJamApp extends StatelessWidget {
  final String initialRoute;
  const JukeJamApp({super.key, required this.initialRoute});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JukeJam',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D0D0D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF1DB954),
          secondary: Color(0xFF7C4DFF),
        ),
      ),
      initialRoute: initialRoute,
      routes: {
        '/':                    (_) => const TitlePage(),
        '/onboarding-manual':   (_) => const OnboardingManualPage(),
        '/onboarding-spotify':  (_) => const OnboardingSpotifyPage(),
        '/home':                (_) => const HomePage(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/quiz') {
          final userId = settings.arguments as String;
          return MaterialPageRoute(
            builder: (_) => ContextQuizPage(userId: userId),
          );
        }
        return null;
      },
    );
  }
}
