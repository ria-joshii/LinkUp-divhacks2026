import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { TextField } from '@/components/ui/text-field';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { errorMessage, verifyCode } from '@/lib/api';
import { resetTo } from '@/lib/nav';
import { isCode, param } from '@/lib/validate';

export default function VerifyScreen() {
  const params = useLocalSearchParams();
  const name = param(params.name);
  const phone = param(params.phone);
  const { ready, user, onboarded, signIn } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    resetTo(onboarded ? '/home' : '/profile');
  }, [ready, user, onboarded]);

  async function verify() {
    if (!isCode(code)) {
      setError('Enter the 4-digit code.');
      return;
    }
    if (!name || !phone) {
      setError('Start again so we know who to text.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const created = await verifyCode({ name, phone, code: code.trim() });
      await signIn(created);
    } catch (caught) {
      setBusy(false);
      setError(errorMessage(caught, 'Could not verify that code.'));
    }
  }

  return (
    <ScreenContainer
      scroll
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Verify" onPress={() => void verify()} loading={busy} />
        </>
      }>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.kicker}>Check your texts</Text>
      <Text style={styles.title}>Punch in the code</Text>
      <Text style={styles.body}>
        {phone ? `We texted a 4-digit code to ${phone}.` : 'We texted a 4-digit code.'} It shows up in Messages, and expires in 10 minutes.
      </Text>
      <TextField
        label="Code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 4))}
        placeholder="4821"
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={4}
        inputStyle={styles.code}
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
  code: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.display,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
