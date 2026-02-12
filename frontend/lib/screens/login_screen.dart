import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Login / user select screen — pick existing user or start onboarding.
///
/// STYLIZE: logo, background, button styling.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  List<String> _users = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      _users = await ApiService.getUsers();
    } catch (e) {
      // Backend not running — show empty
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
              // STYLIZE: logo / branding
              const Icon(Icons.music_note, size: 80),
              const SizedBox(height: 16),
              Text('JukeJam',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 48),

              if (_loading)
                const CircularProgressIndicator()
              else ...[
                // --- Existing users ---
                if (_users.isNotEmpty) ...[
                  Text('Welcome back',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  ..._users.map((u) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => Navigator.pushReplacementNamed(
                                context, '/home',
                                arguments: u),
                            child: Text(u),
                          ),
                        ),
                      )),
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 24),
                ],

                // --- New user ---
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () =>
                        Navigator.pushNamed(context, '/onboarding'),
                    icon: const Icon(Icons.person_add),
                    label: const Text('New User'),
                  ),
                ),
              ],
            ],
            ),
          ),
        ),
      ),
    );
  }
}
