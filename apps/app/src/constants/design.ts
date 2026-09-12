// Shared design tokens for every real screen/component in the app (the
// Expo-template `theme.ts`/`ThemedText`/`ThemedView` trio next to this file
// is unused leftover scaffolding — nothing here touches it). Modeled on
// Luma's own product design, since Luma is the actual surface every event
// in this dashboard is sourced from: solid-color status pills, muted
// secondary text, generously rounded "squircle" cards. The radius/spacing
// scale below is a direct px translation (at a 16px root) of a reference
// Luma page's own CSS custom properties.
import type { EventStatus } from '@/features/events/types';

export const Colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F7',
  border: '#E9E9EC',
  borderInput: '#D6D8DD',
  text: '#17181B',
  textSecondary: '#6E7079',
  textTertiary: '#C7CCD1',
  accent: '#3E5FEB',
  accentTint: '#EAEEFF',
  success: '#1E9A5A',
  danger: '#D33333',
  dangerTint: '#FDECEC',
  noticeText: '#8A6D00',
  noticeBg: '#FFF6DA',

  // The top bar's soft blue-to-white wash (replaces a hard border line —
  // see the Luma reference screenshot). Fades into `surface` so it meets
  // the page content beneath with no visible seam.
  navGradientTop: '#E3EEFC',
} as const;

// Solid pill treatment, matching a real Luma events list (Going/Invited/
// Waitlisted/Pending badges) rather than the light-tinted pills this app
// used before. `went`/`unresolved` have no Luma equivalent (they're this
// app's own post-event states), so they get colors that fit the same
// family rather than copying a status Luma doesn't have.
export const StatusColors: Record<EventStatus, { bg: string; text: string }> = {
  going: { bg: '#1E9A5A', text: '#FFFFFF' },
  pending: { bg: '#E08A2C', text: '#FFFFFF' },
  went: { bg: '#7C5CFC', text: '#FFFFFF' },
  did_not_go: { bg: '#8A8D96', text: '#FFFFFF' },
  unresolved: { bg: '#E08A2C', text: '#FFFFFF' },
};

export const StatusLabel: Record<EventStatus, string> = {
  going: 'Going',
  pending: 'Pending',
  went: 'Went',
  did_not_go: 'Did not go',
  unresolved: 'Unresolved',
};

// --small-border-radius through --modal-squircle-border-radius. Flat rows
// (--event-row-border-radius: 0) and the two --dt-*-border-radius (both ==
// --border-radius) aren't given their own tokens — call sites use 0 or
// Radius.sm directly since there's nothing to name.
export const Radius = {
  xs: 4, // --small-border-radius
  sm: 8, // --border-radius / --small-squircle-border-radius
  md: 16, // --large-border-radius / --squircle-border-radius / --modal-border-radius
  card: 12, // --card-border-radius
  cardLarge: 24, // --card-squircle-border-radius
  modalLarge: 32, // --modal-squircle-border-radius
  pill: 999,
} as const;

// --base-list-row-*-padding, --content-card-*-padding, --horizontal-padding,
// --spark-block-spacing.
export const Spacing = {
  rowVertical: 12,
  rowHorizontal: 16,
  cardVertical: 16,
  cardHorizontal: 18,
  page: 16,
  section: 24,
} as const;

// --max-width, --max-width-wide-page, --max-width-extra-wide-page.
export const MaxWidth = {
  content: 820,
  wide: 960,
  extraWide: 1080,
} as const;
