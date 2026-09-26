import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { seedMockUser } from '@/lib/api';
import { parseSession, SESSION_KEY, type Session } from '@/lib/session';
import type { Match, User } from '@/lib/types';

type AppContextValue = {
  ready: boolean;
  user: User | null;
  match: Match | null;
  onboarded: boolean;
  signIn: (user: User) => Promise<void>;
  updateUser: (user: User, options?: { onboarded?: boolean }) => Promise<void>;
  setMatch: (match: Match | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const emptySession = (): Session => ({ user: null, onboarded: false, match: null });

export function AppProvider({ children }: { children: ReactNode }) {
  const sessionRef = useRef<Session>(emptySession());
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [match, setMatchState] = useState<Match | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const commit = useCallback(async (partial: Partial<Session>) => {
    const next: Session = { ...sessionRef.current, ...partial };
    sessionRef.current = next;
    setUser(next.user);
    setMatchState(next.match);
    setOnboarded(next.onboarded);
    if (next.user) seedMockUser(next.user);
    if (!next.user) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (cancelled || !raw) return;
        const session = parseSession(raw);
        if (!session?.user) return;
        seedMockUser(session.user);
        sessionRef.current = session;
        setUser(session.user);
        setOnboarded(session.onboarded);
        setMatchState(session.match);
      } catch {
        // A bad cache should land people on welcome, not a crash.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (next: User) => {
    await commit({ user: next, onboarded: false, match: null });
  }, [commit]);

  const updateUser = useCallback(
    async (next: User, options?: { onboarded?: boolean }) => {
      await commit({
        user: next,
        onboarded: options?.onboarded ?? sessionRef.current.onboarded,
      });
    },
    [commit],
  );

  const setMatch = useCallback(
    async (next: Match | null) => {
      await commit({ match: next });
    },
    [commit],
  );

  const signOut = useCallback(async () => {
    await commit({ user: null, onboarded: false, match: null });
  }, [commit]);

  const value = useMemo(
    () => ({ ready, user, match, onboarded, signIn, updateUser, setMatch, signOut }),
    [ready, user, match, onboarded, signIn, updateUser, setMatch, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}

export function useRequireSession() {
  const app = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!app.ready) return;
    if (!app.user) router.replace('/');
    else if (!app.onboarded) router.replace('/profile');
  }, [app.ready, app.user, app.onboarded, router]);

  return app;
}
