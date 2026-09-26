import { Platform } from 'react-native';

export const Colors = {
  background: '#14110E',
  surface: '#241C16',
  surfaceRaised: '#322820',
  text: '#F6EFE4',
  textMuted: '#CDBBA8',
  textFaint: '#8D7B6C',
  accent: '#FF5C39',
  ink: '#1A100C',
  gold: '#E7B34C',
  line: '#3D322A',
  danger: '#FF7A72',
  paper: '#F3E6D0',
  paperInk: '#2A2118',
  tape: '#2A2118',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 32,
  display: 56,
} as const;

export const Radius = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
} as const;

export const FontFamily = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),
} as const;
