import 'package:flutter_test/flutter_test.dart';
import 'package:jukejam/main.dart';

void main() {
  testWidgets('App starts', (WidgetTester tester) async {
    await tester.pumpWidget(const JukeJamApp());
    expect(find.text('JukeJam'), findsOneWidget);
  });
}
