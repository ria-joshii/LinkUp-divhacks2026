import type { Match, User } from '@/lib/types';

export const SESSION_KEY = '@blindspot/session';

export type Session = {
  user: User | null;
  onboarded: boolean;
  match: Match | null;
};

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<User>;
  return typeof user.id === 'string' && typeof user.name === 'string' && typeof user.phone === 'string';
}

export function parseSession(raw: string): Session | null {
  try {
    const data = JSON.parse(raw) as Partial<Session>;
    if (!isUser(data.user)) return null;
    return {
      user: {
        ...data.user,
        interests: data.user.interests ?? [],
        cuisines: data.user.cuisines ?? [],
        availability: data.user.availability ?? [],
      },
      onboarded: Boolean(data.onboarded),
      match: data.match ?? null,
    };
  } catch {
    return null;
  }
}
