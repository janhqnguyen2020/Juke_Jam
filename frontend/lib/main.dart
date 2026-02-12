import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/search_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/onboarding_screen.dart';

void main() {
  runApp(const JukeJamApp());
}

class JukeJamApp extends StatelessWidget {
  const JukeJamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JukeJam',
      debugShowCheckedModeBanner: false,
      // STYLIZE: Change this theme — seedColor, brightness, fonts, etc.
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      initialRoute: '/',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(
              builder: (_) => const LoginScreen(),
            );
          case '/home':
            final userId = settings.arguments as String? ?? 'Joseph';
            return MaterialPageRoute(
              builder: (_) => HomeScreen(userId: userId),
            );
          case '/search':
            return MaterialPageRoute(
              builder: (_) => const SearchScreen(),
            );
          case '/profile':
            // Defaults to Joseph; in production pass via arguments
            final userId = settings.arguments as String? ?? 'Joseph';
            return MaterialPageRoute(
              builder: (_) => ProfileScreen(userId: userId),
            );
          case '/onboarding':
            return MaterialPageRoute(
              builder: (_) => const OnboardingScreen(),
            );
          default:
            return MaterialPageRoute(
              builder: (_) => const LoginScreen(),
            );
        }
      },
    );
  }
}
