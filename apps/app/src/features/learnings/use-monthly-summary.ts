import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Event } from '@/features/events/types';
import { useEvents } from '@/features/events/use-events';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import type { MonthlySummary } from './types';

// 'YYYY-MM' key for a Date, in local time (not UTC — see the same caveat
// noted in features/connections/use-connections.ts's day-key helpers).
export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function eventsInMonth(events: Event[], month: string) {
  return events.filter((event) => monthKey(new Date(event.starts_at)) === month);
}

// Only events with something actually written in Learnings are relevant to
// a monthly synthesis — an event with no notes contributes nothing to
// summarize.
export function useEventsWithLearnings(month: string) {
  const { data: events, ...rest } = useEvents();
  const withLearnings = events
    ? eventsInMonth(events, month).filter((event) => event.learnings?.trim())
    : undefined;
  return { data: withLearnings, ...rest };
}

export const monthlySummaryQueryKey = (month: string) => ['monthly-summary', month] as const;

// In-memory stand-in for the `monthly_summaries` table while no Supabase
// project is connected — same mock/real seam as every other feature (see
// features/events/use-events.ts). Nothing is seeded here: a summary only
// exists once generated, mirroring the real table (a row is only ever
// created by the summarize-learnings function actually running).
const mockStore = new Map<string, MonthlySummary>();

async function fetchMonthlySummary(month: string): Promise<MonthlySummary | null> {
  if (!isSupabaseConfigured) {
    return mockStore.get(month) ?? null;
  }
  const { data, error } = await supabase!
    .from('monthly_summaries')
    .select('month, summary, source_event_ids, model, generated_at')
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    month: data.month,
    summary: data.summary,
    sourceEventIds: data.source_event_ids ?? [],
    model: data.model ?? undefined,
    generatedAt: data.generated_at,
  };
}

export function useMonthlySummary(month: string) {
  return useQuery({ queryKey: monthlySummaryQueryKey(month), queryFn: () => fetchMonthlySummary(month) });
}

// Builds an obviously-fake stand-in for what a real LLM call would return —
// never phrased to look like genuine AI output, since that would be
// actively misleading about what's actually happening in mock mode (see
// the mock-mode banner on the Learnings screen itself).
function buildMockSummary(month: string, events: Event[]): MonthlySummary {
  const titles = events.map((e) => e.title).join(', ');
  return {
    month,
    summary:
      `[Mock summary — no LLM was called] Notes exist for ${events.length} event` +
      `${events.length === 1 ? '' : 's'} this month (${titles}). Connect a real Supabase project ` +
      `and the summarize-learnings function to generate an actual AI synthesis here.`,
    sourceEventIds: events.map((e) => e.id),
    generatedAt: new Date().toISOString(),
  };
}

type SummarizeLearningsResponse = {
  month?: string;
  summary?: string;
  sourceEventIds?: string[];
  model?: string;
  generatedAt?: string;
  error?: string;
};

async function generateSummary(month: string, events: Event[]): Promise<MonthlySummary> {
  if (!isSupabaseConfigured) {
    // Artificial delay so the UI's loading state is exercised the same way
    // a real ~1-2s LLM call would behave, rather than resolving instantly.
    await new Promise((resolve) => setTimeout(resolve, 900));
    const summary = buildMockSummary(month, events);
    mockStore.set(month, summary);
    return summary;
  }

  // Send the exact event IDs the client already correctly grouped into
  // "this month, has notes" (see eventsInMonth above, which uses the
  // user's local timezone) — the function re-fetches their content
  // server-side rather than trusting client-supplied text, but doesn't
  // need to recompute which events belong to this month itself.
  const { data, error } = await supabase!.functions.invoke<SummarizeLearningsResponse>('summarize-learnings', {
    body: { month, eventIds: events.map((e) => e.id) },
  });
  if (error) throw error;
  if (!data) throw new Error('No response from summarize-learnings.');
  if (data.error) throw new Error(data.error);

  return {
    month: data.month ?? month,
    summary: data.summary!,
    sourceEventIds: data.sourceEventIds ?? [],
    model: data.model,
    generatedAt: data.generatedAt ?? new Date().toISOString(),
  };
}

export function useGenerateSummary(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (events: Event[]) => generateSummary(month, events),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: monthlySummaryQueryKey(month) }),
  });
}
