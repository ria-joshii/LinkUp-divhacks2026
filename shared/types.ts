export type Person = {
  id: string; name: string; neighborhood: string;
  residentType: 'Local' | 'New to the neighborhood';
  interests: string[]; cuisines: string[]; availability: string[];
  profilePhoto: string; isDemo: boolean; ready: boolean;
};
export type Activity = {
  id: string; name: string; meetingPoint: string; neighborhood: string;
  category: string; note: string; url: string; durationMinutes: number;
  tags: string[]; outdoor: boolean; suggestedBy?: string;
};
export type ActivitySuggestion = Pick<Activity, 'name' | 'meetingPoint' | 'durationMinutes' | 'outdoor'>;
export type Window = { date: string; start: string; end: string };
export type Preference = {
  windows: Window[]; activityAnswer: 'unknown' | 'yes' | 'no' | 'maybe';
  concern: string; confirmedVersion: number | null; timeVote: string | null;
};
export type Proposal = Window & { version: number; activityId: string };
export type PollKind = 'activity' | 'approval' | 'availability' | 'time' | 'confirmation' | 'next';
export type PollOption = {
  id: string; label: string;
  action: 'activity' | 'approve' | 'different' | 'suggest' | 'availability' | 'other-times' | 'time' | 'confirm' | 'change-time' | 'keep' | 'cancel';
  activityId?: string; window?: Window;
};
export type MeetupPoll = {
  id: string; userId: string; kind: PollKind; question: string; options: PollOption[];
  status: 'open' | 'answered' | 'closed'; selection: string | null;
  round: number; timingVersion: number; proposalVersion?: number;
};
export type Delivery = {
  id: string; userId: string; text: string; kind: string; pollId?: string;
  status: 'pending' | 'sent' | 'failed'; error?: string; at: string;
  mode?: 'native' | 'text'; providerMessageId?: string;
};
export type Match = {
  id: string; userIds: string[]; chooserId: string;
  status: 'matched' | 'collecting' | 'proposed' | 'confirmed' | 'cancelled';
  stage: 'activity' | 'approval' | 'availability' | 'time' | 'confirmation' | 'done';
  round: number; timingVersion: number; version: number; proposal: Proposal | null;
  activity: Activity | null; activities: Activity[]; polls: MeetupPoll[];
  preferences: Record<string, Preference>; startedAt: string | null;
};
export type Snapshot = {
  user: Person & { phone: string }; candidates: Person[]; joined: number;
  hasLikedPartner: boolean; partner: Person | null;
  match: (Match & { participants: Person[]; deliveries: Delivery[] }) | null;
  services: { photon: boolean; gemini: boolean; transport: 'photon' | 'console'; polls: 'native' | 'text'; message: string };
};
export type ProfileInput = Pick<Person, 'neighborhood' | 'residentType' | 'interests' | 'cuisines' | 'availability' | 'profilePhoto'>;
export type Extraction = {
  windows: Window[]; availabilityAction: 'none' | 'add' | 'replace';
  activityAnswer: Preference['activityAnswer']; wantsAlternative: boolean;
  suggestion: ActivitySuggestion | null; pollId: string; optionId: string;
  concern: string; clarification: string; cancel: boolean;
};
