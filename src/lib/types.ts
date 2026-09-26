export type ResidentType = 'new' | 'local';

export type Interest = {
  id: string;
  label: string;
};

export type LocalFavorites = {
  restaurants: string[];
  cafes: string[];
};

export type User = {
  id: string;
  name: string;
  age?: number;
  phone: string;
  email: string;
  neighborhood?: string;
  residentType?: ResidentType;
  interests: Interest[];
  cuisines: string[];
  availability: string[];
  photoUrl?: string;
  localFavorites?: LocalFavorites;
};

export type BlindSpot = {
  id: string;
  neighborhood: string;
  hint: string;
};

export type MatchStatus = 'pending' | 'texting' | 'passed';

export type Match = {
  id: string;
  person: User;
  sharedInterests: Interest[];
  blindSpot: BlindSpot;
  status: MatchStatus;
};

export type Feedback = {
  id: string;
  matchId: string;
  userId: string;
  rating: number;
  note: string;
};

export type SignUpInput = {
  name: string;
  phone: string;
  email?: string;
};

export type VerifyCodeInput = SignUpInput & {
  code: string;
};

export type InterestsPayload = {
  name: string;
  phone: string;
  neighborhood: string;
  residentType: ResidentType;
  interests: Interest[];
  cuisines: string[];
  localFavorites?: LocalFavorites;
};

export type FindMatchInput = {
  userId: string;
  likedUserId: string;
  interests: Interest[];
};

export type MoveToTextResult = {
  matchId: string;
  groupChatReady: boolean;
  message: string;
};

export type FeedbackInput = {
  matchId: string;
  userId: string;
  rating: number;
  note: string;
};
