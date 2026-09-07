import type { Event } from './types';

function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Stand-in for real Luma-sourced rows until Phase 3 wires up the real sync
// (see docs/build-plan.md). Shapes match the `events` table exactly so
// swapping the data source later doesn't touch any UI code.
export const mockEvents: Event[] = [
  {
    id: 'evt-past-1',
    title: 'AI Infra Happy Hour',
    description: 'Casual meetup for people building AI infrastructure in SF.',
    starts_at: daysFromNow(-6),
    location_name: 'Shack15',
    location_address: '1 Ferry Building, San Francisco, CA',
    is_virtual: false,
    luma_url: 'https://luma.com/example-ai-infra',
    speakers: [{ name: 'Priya Nair', title: 'Founder', company: 'Vectorly' }],
    sponsors: [{ name: 'Vectorly' }],
    topics: ['AI infra', 'vector databases'],
    status: 'unresolved',
  },
  {
    id: 'evt-past-2',
    title: 'YC Alumni Demo Night',
    description: 'Early-stage founders demoing what they shipped this quarter.',
    starts_at: daysFromNow(-3),
    location_name: 'South Park Commons',
    location_address: '138 South Park, San Francisco, CA',
    is_virtual: false,
    luma_url: 'https://luma.com/example-demo-night',
    speakers: [],
    sponsors: [{ name: 'South Park Commons' }],
    topics: ['startups', 'demo day'],
    status: 'unresolved',
  },
  {
    id: 'evt-past-3',
    title: 'Frontier Models Reading Group',
    description: 'Monthly paper discussion — this month: long-context retrieval.',
    starts_at: daysFromNow(-1),
    location_name: 'Betaworks SF',
    is_virtual: false,
    luma_url: 'https://luma.com/example-reading-group',
    speakers: [{ name: 'Dr. Wen Zhao', title: 'Research Scientist', company: 'Anthropic' }],
    sponsors: [],
    topics: ['research', 'LLMs'],
    status: 'unresolved',
  },
  {
    id: 'evt-went-1',
    title: 'Women in AI Founders Dinner',
    description: 'Small dinner for women founders building in AI.',
    starts_at: daysFromNow(-14),
    location_name: 'The Interval',
    is_virtual: false,
    luma_url: 'https://luma.com/example-founders-dinner',
    speakers: [{ name: 'Amara Okafor', title: 'CEO', company: 'Fieldnote' }],
    sponsors: [{ name: 'South Park Commons' }],
    topics: ['founders', 'AI'],
    status: 'went',
    learnings: 'Great conversation about early GTM for dev tools — worth a follow-up coffee with Amara.',
  },
  // Second event landing on the same day as evt-went-1, to exercise the
  // calendar's multi-event-per-day picker in mock mode.
  {
    id: 'evt-went-2',
    title: 'Coffee w/ SPC Fellows',
    description: 'Informal coffee meetup for South Park Commons fellows.',
    starts_at: daysFromNow(-14, 9),
    location_name: 'Saint Frank Coffee',
    is_virtual: false,
    speakers: [],
    sponsors: [],
    topics: ['coffee chat'],
    status: 'went',
  },
  {
    id: 'evt-future-1',
    title: 'SF Tech Week Kickoff',
    description: 'Opening night mixer for SF Tech Week.',
    starts_at: daysFromNow(4),
    location_name: 'Fort Mason Center',
    is_virtual: false,
    luma_url: 'https://luma.com/example-tech-week',
    speakers: [],
    sponsors: [{ name: 'Luma' }, { name: 'a16z' }],
    topics: ['networking'],
    status: 'going',
  },
  {
    id: 'evt-future-2',
    title: 'Founders & Funders Breakfast',
    description: 'Small-group breakfast connecting early founders with seed investors.',
    starts_at: daysFromNow(9, 9),
    location_name: 'The Battery',
    is_virtual: false,
    luma_url: 'https://luma.com/example-breakfast',
    speakers: [],
    sponsors: [],
    topics: ['fundraising'],
    status: 'pending',
  },
  {
    id: 'evt-future-3',
    title: 'Design Systems SF',
    description: 'Talks on scaling design systems across product teams.',
    starts_at: daysFromNow(15),
    location_name: 'Figma HQ',
    is_virtual: false,
    luma_url: 'https://luma.com/example-design-systems',
    speakers: [{ name: 'Jordan Lee', title: 'Staff Designer', company: 'Figma' }],
    sponsors: [{ name: 'Figma' }],
    topics: ['design systems'],
    status: 'going',
  },
];
