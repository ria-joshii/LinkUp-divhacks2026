import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { TextField } from '@/components/ui/text-field';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { errorMessage, requestVerificationCode } from '@/lib/api';
import { resetTo } from '@/lib/nav';
import { isEmail, isPhone } from '@/lib/validate';

export default function LoginScreen() {
  const { ready, user, onboarded } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    resetTo(onboarded ? '/home' : '/profile');
  }, [ready, user, onboarded]);

  async function continueToCode() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) {
      setError('Tell us the name you go by.');
      return;
    }
    if (!isPhone(trimmedPhone)) {
      setError('Enter a phone number we can text.');
      return;
    }
    if (!isEmail(trimmedEmail)) {
      setError('That email does not look finished.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await requestVerificationCode({ name: trimmedName, phone: trimmedPhone, email: trimmedEmail });
      router.push({
        pathname: '/verify',
        params: { name: trimmedName, phone: trimmedPhone, email: trimmedEmail },
      });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not text that code.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer
      scroll
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Text me a code" onPress={() => void continueToCode()} loading={busy} />
        </>
      }>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.kicker}>Sign in</Text>
      <Text style={styles.title}>Who's showing up?</Text>
      <Text style={styles.body}>Name, phone, and email. Then a short code so we know it's you.</Text>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="(917) 555-0134"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        helper="We'll use this later for the group text."
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: Colors.gold,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  kicker: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '700',
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
    lineHeight: 22,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
