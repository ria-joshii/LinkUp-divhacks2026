import type { Interest } from '@/lib/types';

export type Choice = {
  id: string;
  label: string;
};

export const NEIGHBORHOODS = [
  'Harlem',
  'Washington Heights',
  'Astoria',
  'Bed-Stuy',
  'Williamsburg',
  'LES',
  'Park Slope',
  'Flushing',
  'Jackson Heights',
  'Upper West Side',
] as const;

export const INTERESTS: Interest[] = [
  { id: 'jazz', label: 'Jazz' },
  { id: 'dumplings', label: 'Dumplings' },
  { id: 'thrifting', label: 'Thrifting' },
  { id: 'pickup-basketball', label: 'Pickup basketball' },
  { id: 'bookstores', label: 'Bookstores' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'film', label: 'Film' },
  { id: 'art-galleries', label: 'Art galleries' },
  { id: 'running', label: 'Running' },
  { id: 'board-games', label: 'Board games' },
];

export const CUISINES: Choice[] = [
  { id: 'italian', label: 'Italian' },
  { id: 'mexican', label: 'Mexican' },
  { id: 'chinese', label: 'Chinese' },
  { id: 'sichuan', label: 'Sichuan' },
  { id: 'taiwanese', label: 'Taiwanese' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'korean', label: 'Korean' },
  { id: 'thai', label: 'Thai' },
  { id: 'vietnamese', label: 'Vietnamese' },
  { id: 'indian', label: 'Indian' },
  { id: 'ethiopian', label: 'Ethiopian' },
  { id: 'lebanese', label: 'Lebanese' },
  { id: 'caribbean', label: 'Caribbean' },
  { id: 'west-african', label: 'West African' },
  { id: 'peruvian', label: 'Peruvian' },
  { id: 'greek', label: 'Greek' },
];

export const AVAILABILITY: Choice[] = [
  { id: 'weeknights', label: 'Weeknight evenings' },
  { id: 'weekend-mornings', label: 'Weekend mornings' },
  { id: 'weekend-afternoons', label: 'Weekend afternoons' },
  { id: 'weekend-nights', label: 'Weekend nights' },
  { id: 'late', label: 'Late nights' },
];

export function choiceLabel(options: Choice[], id: string): string {
  return options.find((option) => option.id === id)?.label ?? id;
}
