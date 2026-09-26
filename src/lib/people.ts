import { CUISINES, choiceLabel } from '@/constants/catalog';
import type { Interest, User } from '@/lib/types';

export function firstName(name: string): string {
  const [first] = name.trim().split(/\s+/);
  return first || name;
}

export function foodPreference(user: User): string {
  const labels = user.cuisines.map((id) => choiceLabel(CUISINES, id));
  if (labels.length === 0) return 'Anything worth the walk';
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`;
}

export function sharedInterests(mine: Interest[], theirs: Interest[]): Interest[] {
  const ids = new Set(mine.map((interest) => interest.id));
  return theirs.filter((interest) => ids.has(interest.id));
}

export function initial(name: string): string {
  return firstName(name).slice(0, 1).toUpperCase();
}
