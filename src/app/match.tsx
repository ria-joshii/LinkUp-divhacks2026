import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/person-face';
import { BlindSpotCard } from '@/components/blind-spot-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useRequireSession } from '@/context/app-context';
import { moveToText } from '@/lib/api';
import { firstName } from '@/lib/people';

export default function MatchScreen() {
  const { ready, user, onboarded, match, setMatch } = useRequireSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendToText() {
    if (!match) return;
    if (match.status === 'texting') {
      router.push('/texted');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await moveToText(match.id);
      await setMatch({ ...match, status: 'texting' });
      router.replace('/texted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start the group text.');
      setBusy(false);
    }
  }

  function goHome() {
    if (router.canGoBack()) router.back();
    else router.dismissTo('/home');
  }

  async function pass() {
    await setMatch(null);
    goHome();
  }

  if (!ready || !user || !onboarded) return <View style={styles.boot} />;

  if (!match) {
    return (
      <ScreenContainer footer={<Button label="Back to swiping" onPress={() => router.dismissTo('/home')} />}>
        <View style={styles.empty}>
          <Text style={styles.title}>No match in the inbox.</Text>
          <Text style={styles.body}>Swipe right when someone feels like your kind of night.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const name = firstName(match.person.name);
  const shared = match.sharedInterests;

  return (
    <ScreenContainer
      scroll
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={match.status === 'texting' ? 'See the text note' : 'Move to text'}
            onPress={() => void sendToText()}
            loading={busy}
          />
          <Button
            label={match.status === 'texting' ? 'Back to swiping' : 'Pass'}
            variant="secondary"
            onPress={() => {
              if (match.status === 'texting') goHome();
              else void pass();
            }}
            disabled={busy}
          />
        </>
      }>
      <Text style={styles.kicker}>It's a match</Text>
      <Card>
        <View style={styles.person}>
          <Avatar name={match.person.name} photoUrl={match.person.photoUrl} />
          <View style={styles.personCopy}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.neighborhood}>{match.person.neighborhood}</Text>
          </View>
        </View>
      </Card>
      <Text style={styles.body}>You both circled the same block.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{shared.length > 0 ? 'Shared interests' : "They're into"}</Text>
        <View style={styles.chips}>
          {(shared.length > 0 ? shared : match.person.interests).map((interest) => (
            <Chip key={interest.id} label={interest.label} selected={shared.length > 0} />
          ))}
        </View>
        {shared.length === 0 ? (
          <Text style={styles.note}>No overlap on the list yet. The spot can still do the talking.</Text>
        ) : null}
      </View>

      <BlindSpotCard spot={match.blindSpot} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  kicker: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  personCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: 38,
  },
  neighborhood: {
    color: Colors.gold,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  body: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  note: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
