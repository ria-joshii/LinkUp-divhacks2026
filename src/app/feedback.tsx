import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { TextField } from '@/components/ui/text-field';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useRequireSession } from '@/context/app-context';
import { submitFeedback } from '@/lib/api';

const SCORES = [1, 2, 3, 4, 5];

export default function FeedbackScreen() {
  const { ready, user, onboarded, match } = useRequireSession();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    if (!user || !match) return;
    if (rating < 1) {
      setError('Give it a score from 1 to 5.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitFeedback({
        matchId: match.id,
        userId: user.id,
        rating,
        note: note.trim(),
      });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save that note.');
      setBusy(false);
    }
  }

  if (!ready || !user || !onboarded) return <View style={styles.boot} />;

  if (!match) {
    return (
      <ScreenContainer footer={<Button label="Back home" onPress={() => router.dismissTo('/home')} />}>
        <View style={styles.hero}>
          <Text style={styles.title}>No hangout to review yet.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (done) {
    return (
      <ScreenContainer footer={<Button label="Back to swiping" onPress={() => router.dismissTo('/home')} />}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Noted</Text>
          <Text style={styles.title}>We'll tune the next person and the next spot.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scroll
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Send feedback" onPress={() => void send()} loading={busy} />
        </>
      }>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.kicker}>After the hangout</Text>
      <Text style={styles.title}>How did it go?</Text>
      <Text style={styles.body}>This shapes who you meet next, and which sealed spot we pick.</Text>
      <View style={styles.scores}>
        {SCORES.map((score) => {
          const selected = score === rating;
          return (
            <Pressable
              key={score}
              accessibilityRole="button"
              accessibilityLabel={`Score ${score}`}
              accessibilityState={{ selected }}
              onPress={() => setRating(score)}
              style={[styles.score, selected && styles.scoreOn]}>
              <Text style={[styles.scoreLabel, selected && styles.scoreLabelOn]}>{score}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scale}>1 is a miss. 5 is a new favorite.</Text>
      <TextField
        label="A note"
        value={note}
        onChangeText={setNote}
        placeholder="The counter was loud, in a good way."
        multiline
      />
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
    gap: Spacing.two,
  },
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
  scores: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  score: {
    flex: 1,
    minHeight: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  scoreOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  scoreLabel: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  scoreLabelOn: {
    color: Colors.ink,
  },
  scale: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
