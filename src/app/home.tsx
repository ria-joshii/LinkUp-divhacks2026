import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SwipeDeck, type SwipeDirection } from '@/components/swipe-deck';
import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { APP_NAME } from '@/constants/app';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useRequireSession } from '@/context/app-context';
import { findMatch, getCandidates, getProfile } from '@/lib/api';
import { firstName } from '@/lib/people';
import type { User } from '@/lib/types';

export default function HomeScreen() {
  const { ready, user, match, onboarded, updateUser, setMatch } = useRequireSession();
  const [people, setPeople] = useState<User[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exit, setExit] = useState<SwipeDirection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const userRef = useRef(user);
  const ticket = useRef(0);
  const handled = useRef(0);
  userRef.current = user;

  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const deck = await getCandidates(userId);
      setPeople(deck);
      setIndex(0);
      setExit(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load people nearby.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !onboarded) return;
    void load();
  }, [userId, onboarded, load]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getProfile(userId)
      .then((fresh) => {
        if (!cancelled) void updateUser(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, updateUser]);

  function request(direction: SwipeDirection) {
    if (pending || exit || !people[index]) return;
    ticket.current += 1;
    setExit(direction);
  }

  async function onExitDone(direction: SwipeDirection) {
    const currentTicket = ticket.current;
    if (handled.current === currentTicket) return;
    handled.current = currentTicket;

    const person = people[index];
    const currentUser = userRef.current;
    if (!person || !currentUser) {
      setExit(null);
      return;
    }

    if (direction === 'left') {
      setIndex((value) => value + 1);
      setExit(null);
      return;
    }

    setPending(true);
    try {
      const found = await findMatch({
        userId: currentUser.id,
        likedUserId: person.id,
        interests: currentUser.interests,
      });
      setIndex((value) => value + 1);
      setExit(null);
      if (found) {
        await setMatch(found);
        router.push('/match');
      }
    } catch (caught) {
      setExit(null);
      setError(caught instanceof Error ? caught.message : 'Could not check that match.');
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user || !onboarded) return <View style={styles.boot} />;

  const person = people[index];
  const locked = pending || Boolean(exit) || loading;

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <Button label="Pass" variant="secondary" onPress={() => request('left')} disabled={!person || locked} style={styles.action} />
          <Button label="I'm in" onPress={() => request('right')} disabled={!person || locked} style={styles.action} />
        </View>
      }>
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.hint}>Right if you'd grab a table. Left if not.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push('/profile')} style={styles.you}>
          <Text style={styles.youLabel}>You</Text>
        </Pressable>
      </View>

      {match ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(match.status === 'texting' ? '/texted' : '/match')}
          style={styles.banner}>
          <Text style={styles.bannerText}>
            {match.status === 'texting'
              ? 'Your group chat is ready'
              : `${firstName(match.person.name)} circled you back`}
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.deck}>
        {loading ? <Text style={styles.status}>Walking the block…</Text> : null}
        {!loading && person ? (
          <SwipeDeck
            people={people}
            index={index}
            exit={exit}
            enabled={!locked}
            onCommit={request}
            onExitDone={(direction) => void onExitDone(direction)}
          />
        ) : null}
        {!loading && !person ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>That's the block for now.</Text>
            <Text style={styles.hint}>Check again in a bit, or widen what you're into.</Text>
            <Button label="Look again" variant="secondary" onPress={() => void load()} />
          </View>
        ) : null}
        {pending ? (
          <View style={styles.pending}>
            <Text style={styles.pendingText}>Seeing if they circled you too…</Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  wordmark: {
    flex: 1,
    gap: 2,
  },
  brand: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
  },
  hint: {
    color: Colors.textFaint,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  you: {
    minWidth: 52,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
  youLabel: {
    color: Colors.text,
    fontWeight: '700',
  },
  banner: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.gold,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  bannerText: {
    color: Colors.gold,
    fontWeight: '700',
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
  },
  deck: {
    flex: 1,
  },
  status: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.five,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emptyTitle: {
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
  },
  pending: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,17,14,0.78)',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  pendingText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    textAlign: 'center',
    fontFamily: FontFamily.display,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
