import type { Connection } from './types';

// Returns a YYYY-MM-DD date string N days from today. Mirrors
// features/events/mock-data.ts's `daysFromNow`, but for the date-only
// `connected_on` column — built from local date components (not
// `.toISOString().slice(0, 10)`, which reads back in UTC and can land on
// the wrong day near local midnight) so it lines up exactly with
// events/mock-data.ts's own day-granularity dates.
function daysFromNowDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Stand-in for real LinkedIn-extension-sourced rows until Phase 5 wires up
// the real ingest function (see docs/build-plan.md). Dates are chosen to
// line up with specific rows in features/events/mock-data.ts, to exercise
// the connections_with_event join's real behavior rather than render a
// hardcoded happy path — see use-connections.ts for what each one proves.
export const mockConnections: Connection[] = [
  // Lands on the same day as BOTH evt-went-1 and evt-went-2 (that pair is
  // deliberately double-booked in events/mock-data.ts). A `went` match, so
  // this shows up immediately — and because two events share the day, it
  // also exercises the join's real fan-out behavior: one row per matching
  // event, not a single row with an arbitrary "closest" pick.
  {
    id: 'conn-amara-okafor',
    full_name: 'Amara Okafor',
    headline: 'CEO at Fieldnote',
    role: 'CEO',
    company: 'Fieldnote',
    linkedin_profile_url: 'https://www.linkedin.com/in/amara-okafor-example',
    connected_on: daysFromNowDate(-14),
    metadata: {},
  },
  // Lands on evt-future-1's day ("SF Tech Week Kickoff", status `going`) —
  // exercises the `going` branch, not just `went`. (A connection dated in
  // the future is a mock-data-only artifact — in reality `connected_on` is
  // always today-or-earlier, since it comes from a real LinkedIn scrape of
  // connections already made.)
  {
    id: 'conn-marcus-webb',
    full_name: 'Marcus Webb',
    headline: 'Investor at a16z',
    role: 'Investor',
    company: 'a16z',
    linkedin_profile_url: 'https://www.linkedin.com/in/marcus-webb-example',
    connected_on: daysFromNowDate(4),
    metadata: {},
  },
  // Lands on evt-past-1's day ("AI Infra Happy Hour"), which is still
  // `unresolved` (not yet swiped). Absent from the Network table until
  // that event is swiped "Went" on the Dashboard — swipe it, then check
  // Network again to watch this row appear live.
  {
    id: 'conn-priya-nair',
    full_name: 'Priya Nair',
    headline: 'Founder at Vectorly',
    role: 'Founder',
    company: 'Vectorly',
    linkedin_profile_url: 'https://www.linkedin.com/in/priya-nair-example',
    connected_on: daysFromNowDate(-6),
    metadata: {},
  },
  // Lands on a day with no event at all (-20 days isn't used by any
  // events/mock-data.ts row — existing dates are -14, -6, -3, -1, 4, 9,
  // 15). Never appears, proving a connection with no matching event on any
  // day — regardless of status — is excluded.
  {
    id: 'conn-jordan-kim',
    full_name: 'Jordan Kim',
    headline: 'Product Manager at Notion',
    role: 'Product Manager',
    company: 'Notion',
    linkedin_profile_url: 'https://www.linkedin.com/in/jordan-kim-example',
    connected_on: daysFromNowDate(-20),
    metadata: {},
  },
];
