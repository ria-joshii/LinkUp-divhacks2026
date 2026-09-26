import { APP_NAME } from '@/constants/app';
import { INTERESTS } from '@/constants/catalog';
import { sharedInterests } from '@/lib/people';
import type {
  BlindSpot,
  Feedback,
  FeedbackInput,
  FindMatchInput,
  InterestsPayload,
  Match,
  MoveToTextResult,
  SignUpInput,
  User,
  VerifyCodeInput,
} from '@/lib/types';

/**
 * Matching, profile, and feedback stay on mocks until that API exists.
 * Login codes always go to the auth server, which texts them through Photon.
 * Do not put the Photon project secret in the app.
 *
 *   POST /auth/send-code
 *   POST /auth/verify-code
 *   POST /signup
 *   POST /users/:id/interests
 *   POST /users/:id/availability
 *   GET  /users/:id
 *   GET  /users/:id/candidates
 *   POST /matches/find
 *   POST /matches/:id/text
 *   POST /feedback
 */
export const USE_MOCKS = true;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms));

const users = new Map<string, User>();

type Candidate = {
  user: User;
  matchesYou: boolean;
  spot: BlindSpot;
};

function interest(...ids: string[]) {
  return INTERESTS.filter((item) => ids.includes(item.id));
}

const CANDIDATES: Candidate[] = [
  {
    matchesYou: true,
    spot: {
      id: 'spot-maya',
      neighborhood: 'A few stops off the N',
      hint: 'Six stools, one record player, and a window that fogs up after dark.',
    },
    user: {
      id: 'maya',
      name: 'Maya Chen',
      age: 27,
      phone: '5550101',
      email: 'maya@example.com',
      neighborhood: 'Astoria',
      residentType: 'local',
      interests: interest('jazz', 'dumplings', 'film', 'coffee'),
      cuisines: ['sichuan', 'taiwanese', 'japanese'],
      availability: ['weeknights', 'weekend-nights'],
      photoUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
    },
  },
  {
    matchesYou: false,
    spot: {
      id: 'spot-andre',
      neighborhood: 'Harlem',
      hint: 'A basement with a hoop painted on the wall and a grill out back.',
    },
    user: {
      id: 'andre',
      name: 'Andre Brooks',
      age: 31,
      phone: '5550102',
      email: 'andre@example.com',
      neighborhood: 'Harlem',
      residentType: 'local',
      interests: interest('jazz', 'pickup-basketball', 'running'),
      cuisines: ['caribbean', 'west-african', 'ethiopian'],
      availability: ['weekend-afternoons'],
      photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
  },
  {
    matchesYou: true,
    spot: {
      id: 'spot-priya',
      neighborhood: 'Jackson Heights',
      hint: 'The chai is not on the menu. Ask for the house one.',
    },
    user: {
      id: 'priya',
      name: 'Priya Shah',
      age: 24,
      phone: '5550103',
      email: 'priya@example.com',
      neighborhood: 'Jackson Heights',
      residentType: 'new',
      interests: interest('bookstores', 'coffee', 'art-galleries', 'film'),
      cuisines: ['indian', 'lebanese'],
      availability: ['weekend-mornings', 'weeknights'],
      photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
  },
  {
    matchesYou: false,
    spot: {
      id: 'spot-luis',
      neighborhood: 'Washington Heights',
      hint: 'Plastic stools, a radio, and the best mango on the block.',
    },
    user: {
      id: 'luis',
      name: 'Luis Ortega',
      age: 29,
      phone: '5550104',
      email: 'luis@example.com',
      neighborhood: 'Washington Heights',
      residentType: 'local',
      interests: interest('running', 'board-games', 'pickup-basketball'),
      cuisines: ['caribbean', 'mexican', 'peruvian'],
      availability: ['weekend-afternoons', 'late'],
      photoUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
    },
  },
  {
    matchesYou: false,
    spot: {
      id: 'spot-samira',
      neighborhood: 'Bed-Stuy',
      hint: 'A thrift rack in the back and injera if you know to ask.',
    },
    user: {
      id: 'samira',
      name: 'Samira Diallo',
      age: 26,
      phone: '5550105',
      email: 'samira@example.com',
      neighborhood: 'Bed-Stuy',
      residentType: 'local',
      interests: interest('thrifting', 'film', 'art-galleries'),
      cuisines: ['west-african', 'ethiopian', 'lebanese'],
      availability: ['weekend-nights'],
      photoUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
  },
  {
    matchesYou: true,
    spot: {
      id: 'spot-jonah',
      neighborhood: 'Williamsburg',
      hint: 'No sign. Look for the blue tile and the smell of barley.',
    },
    user: {
      id: 'jonah',
      name: 'Jonah Park',
      age: 33,
      phone: '5550106',
      email: 'jonah@example.com',
      neighborhood: 'Williamsburg',
      residentType: 'local',
      interests: interest('coffee', 'bookstores', 'running', 'jazz'),
      cuisines: ['korean', 'japanese', 'taiwanese'],
      availability: ['weekend-mornings', 'weeknights'],
      photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
  },
];

/** Mock-only. Keeps the in-memory API in sync with the saved session after a reload. */
export function seedMockUser(user: User) {
  if (!USE_MOCKS) return;
  users.set(user.id, user);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    let message = detail || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(detail) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) message = parsed.error;
    } catch {
      // The body was plain text.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  if (error.message.includes('Network request failed')) {
    return 'Cannot reach the auth server. Start it, and on a phone set EXPO_PUBLIC_API_BASE_URL to this computer’s address.';
  }
  return error.message;
}

/** Asks the auth server to text a 4-digit code through Photon. */
export async function requestVerificationCode(input: SignUpInput): Promise<void> {
  await request<{ ok: true }>('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Checks the code Photon delivered and returns the signed-in user. */
export async function verifyCode(input: VerifyCodeInput): Promise<User> {
  return request<User>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function signUp(input: SignUpInput): Promise<User> {
  if (USE_MOCKS) {
    await delay();
    const user: User = {
      id: `user_${Date.now()}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim().toLowerCase() ?? '',
      interests: [],
      cuisines: [],
      availability: [],
    };
    users.set(user.id, user);
    return user;
  }
  return request<User>('/signup', { method: 'POST', body: JSON.stringify(input) });
}

export async function saveInterests(userId: string, payload: InterestsPayload): Promise<User> {
  if (USE_MOCKS) {
    await delay();
    const existing = users.get(userId);
    if (!existing) throw new Error('Profile not found');
    const next: User = { ...existing, ...payload };
    users.set(userId, next);
    return next;
  }
  return request<User>(`/users/${userId}/interests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveAvailability(userId: string, availability: string[]): Promise<User> {
  if (USE_MOCKS) {
    await delay();
    const existing = users.get(userId);
    if (!existing) throw new Error('Profile not found');
    const next = { ...existing, availability };
    users.set(userId, next);
    return next;
  }
  return request<User>(`/users/${userId}/availability`, {
    method: 'POST',
    body: JSON.stringify({ availability }),
  });
}

export async function getProfile(userId: string): Promise<User> {
  if (USE_MOCKS) {
    await delay(280);
    const user = users.get(userId);
    if (!user) throw new Error('Profile not found');
    return user;
  }
  return request<User>(`/users/${userId}`);
}

export async function getCandidates(userId: string): Promise<User[]> {
  if (USE_MOCKS) {
    await delay(500);
    return CANDIDATES.map((candidate) => candidate.user).filter((user) => user.id !== userId);
  }
  return request<User[]>(`/users/${userId}/candidates`);
}

export async function findMatch(input: FindMatchInput): Promise<Match | null> {
  if (USE_MOCKS) {
    await delay();
    const candidate = CANDIDATES.find((item) => item.user.id === input.likedUserId);
    if (!candidate?.matchesYou) return null;
    return {
      id: `match_${candidate.user.id}`,
      person: candidate.user,
      sharedInterests: sharedInterests(input.interests, candidate.user.interests),
      blindSpot: candidate.spot,
      status: 'pending',
    };
  }
  return request<Match | null>('/matches/find', { method: 'POST', body: JSON.stringify(input) });
}

export async function moveToText(matchId: string): Promise<MoveToTextResult> {
  if (USE_MOCKS) {
    await delay();
    return {
      matchId,
      groupChatReady: true,
      message: `Your ${APP_NAME} group text is ready.`,
    };
  }
  return request<MoveToTextResult>(`/matches/${matchId}/text`, { method: 'POST' });
}

export async function submitFeedback(input: FeedbackInput): Promise<Feedback> {
  if (USE_MOCKS) {
    await delay();
    return {
      id: `feedback_${Date.now()}`,
      matchId: input.matchId,
      userId: input.userId,
      rating: input.rating,
      note: input.note.trim(),
    };
  }
  return request<Feedback>('/feedback', { method: 'POST', body: JSON.stringify(input) });
}
