import { useWindowDimensions } from 'react-native';

// Single breakpoint for now: below this width the AdaptiveShell switches
// from a persistent side rail to bottom tabs. Add more tiers here if a
// future layout needs them (e.g. a tablet-width step).
const WIDE_BREAKPOINT = 768;

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isWide: width >= WIDE_BREAKPOINT };
}
