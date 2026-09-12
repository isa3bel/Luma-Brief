import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-context';
import { formatEventDateTime } from '@/features/events/format';
import { monthKey, useEventsWithLearnings, useGenerateSummary, useMonthlySummary } from '@/features/learnings/use-monthly-summary';

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type SummarySection = { header: string | null; bullets: string[] };

// The model is prompted (see supabase/functions/summarize-learnings) to
// format its output as "## Theme" headers followed by "- bullet" lines.
// Older summaries generated before that prompt change have no headers at
// all — those fall into a single header:null section here, which renders
// as a plain bullet list exactly like before, so nothing already stored
// breaks.
function parseSummarySections(text: string): SummarySection[] {
  const sections: SummarySection[] = [];
  let current: SummarySection = { header: null, bullets: [] };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      if (current.header !== null || current.bullets.length > 0) sections.push(current);
      current = { header: headerMatch[1].trim(), bullets: [] };
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    current.bullets.push(bulletMatch ? bulletMatch[1].trim() : line);
  }
  if (current.header !== null || current.bullets.length > 0) sections.push(current);
  return sections;
}

function SummarySections({ text }: { text: string }) {
  const sections = parseSummarySections(text);
  return (
    <View style={styles.summarySections}>
      {sections.map((section, i) => (
        <View key={i} style={styles.summarySection}>
          {section.header ? <Text style={styles.summarySectionHeader}>{section.header}</Text> : null}
          {section.bullets.map((bullet, j) => (
            <View key={j} style={styles.summaryBulletRow}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryBulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function Learnings() {
  const router = useRouter();
  const { isMockMode } = useAuth();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const month = monthKey(monthDate);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const goToMonth = (delta: number) =>
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const { data: events, isLoading: eventsLoading } = useEventsWithLearnings(month);
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(month);
  const generateSummary = useGenerateSummary(month);

  if (eventsLoading || summaryLoading || !events) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Learnings</Text>
      {isMockMode ? (
        <Text style={styles.mockNotice}>
          Mock summaries — connect a real LLM once Supabase is set up.
        </Text>
      ) : null}

      <View style={styles.monthHeader}>
        <Pressable onPress={() => goToMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
          <MaterialIcons name="chevron-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => goToMonth(1)} hitSlop={8} accessibilityLabel="Next month">
          <MaterialIcons name="chevron-right" size={24} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Takeaways</Text>

        {events.length === 0 ? (
          <Text style={styles.emptyText}>
            No learnings recorded this month yet — add some from an event&apos;s detail page.
          </Text>
        ) : summary ? (
          <>
            <SummarySections text={summary.summary} />
            <Text style={styles.metaText}>
              Generated {formatGeneratedAt(summary.generatedAt)}
              {summary.model ? ` · ${summary.model}` : ' · mock'}
            </Text>
            <Pressable
              onPress={() => generateSummary.mutate(events)}
              disabled={generateSummary.isPending}
              style={[styles.secondaryButton, generateSummary.isPending && styles.buttonDisabled]}>
              <Text style={styles.secondaryButtonText}>
                {generateSummary.isPending ? 'Regenerating…' : 'Regenerate'}
              </Text>
            </Pressable>
            {generateSummary.isError ? (
              <Text style={styles.errorText}>
                Couldn&apos;t regenerate:{' '}
                {generateSummary.error instanceof Error ? generateSummary.error.message : 'Unknown error.'}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.explainerText}>
              Uses an AI model to synthesize this month&apos;s notes into key takeaways. Generated on
              request, not automatically — each generation has a small cost.
            </Text>
            <Pressable
              onPress={() => generateSummary.mutate(events)}
              disabled={generateSummary.isPending}
              style={[styles.primaryButton, generateSummary.isPending && styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>
                {generateSummary.isPending ? 'Generating…' : 'Generate summary'}
              </Text>
            </Pressable>
            {generateSummary.isError ? (
              <Text style={styles.errorText}>
                Couldn&apos;t generate a summary:{' '}
                {generateSummary.error instanceof Error ? generateSummary.error.message : 'Unknown error.'}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {events.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events this month</Text>
          {events.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/dashboard/${event.id}`)}
              style={({ pressed }) => [styles.eventRow, pressed && styles.eventRowPressed]}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{formatEventDateTime(event.starts_at)}</Text>
              <Text style={styles.eventLearnings} numberOfLines={2}>
                {event.learnings}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  mockNotice: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.noticeText,
    backgroundColor: Colors.noticeBg,
    padding: 10,
    borderRadius: Radius.sm,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  monthLabel: { fontSize: 16, fontWeight: '700', minWidth: 160, textAlign: 'center', color: Colors.text },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  explainerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  summarySections: { gap: 14 },
  summarySection: { gap: 4 },
  summarySectionHeader: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  summaryBulletRow: { flexDirection: 'row', gap: 8 },
  summaryBulletDot: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  summaryBulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: Colors.text },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  errorText: { fontSize: 12, color: Colors.danger },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
  },
  primaryButtonText: { color: Colors.surface, fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
  },
  secondaryButtonText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  eventRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  eventRowPressed: { opacity: 0.6 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  eventMeta: { fontSize: 13, color: Colors.textSecondary },
  eventLearnings: { fontSize: 13, color: Colors.text, marginTop: 2 },
});
