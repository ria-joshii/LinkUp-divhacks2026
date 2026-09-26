import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { APP_NAME, TAGLINE } from '@/constants/app';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useApp } from '@/context/app-context';

export default function WelcomeScreen() {
  const { ready, user, onboarded } = useApp();

  if (!ready) return <View style={styles.boot} />;
  if (user && onboarded) return <Redirect href="/home" />;
  if (user) return <Redirect href="/profile" />;

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button label="Find a match" onPress={() => router.push('/login')} />
          <Text style={styles.note}>First time here? We'll text you a code.</Text>
        </View>
      }>
      <View style={styles.hero}>
        <Text style={styles.kicker}>NYC · Know your city</Text>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{TAGLINE}</Text>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>Hidden spot</Text>
        </View>
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
  kicker: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.display,
    lineHeight: 60,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    lineHeight: 26,
    maxWidth: 280,
  },
  stamp: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-8deg' }],
  },
  stampText: {
    color: Colors.gold,
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  footer: {
    gap: Spacing.two,
  },
  note: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
