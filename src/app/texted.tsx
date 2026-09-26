import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { APP_NAME } from '@/constants/app';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useRequireSession } from '@/context/app-context';
import { firstName } from '@/lib/people';

export default function TextedScreen() {
  const { ready, user, onboarded, match } = useRequireSession();

  if (!ready || !user || !onboarded) return <View style={styles.boot} />;

  const name = match ? firstName(match.person.name) : 'them';

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button label="Back to swiping" onPress={() => router.dismissTo('/home')} />
          <Button
            label="Leave feedback"
            variant="secondary"
            onPress={() => router.push('/feedback')}
            disabled={!match}
          />
        </View>
      }>
      <View style={styles.hero}>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>Sent</Text>
        </View>
        <Text style={styles.title}>Check your Messages — your group chat is ready</Text>
        <Text style={styles.body}>
          You, {name}, and a {APP_NAME} agent are in one thread. The agent will help you pick a time and what to
          order. The spot stays sealed until you're both in.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: '-6deg' }],
  },
  stampText: {
    color: Colors.accent,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: 38,
  },
  body: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  footer: {
    gap: Spacing.two,
  },
});
