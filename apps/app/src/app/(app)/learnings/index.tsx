import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, PageHeader } from '@/components/ui';
import { Colors, Radius, Shadow } from '@/constants/design';
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

  const monthNav = (
    <View style={styles.monthNav}>
      <Pressable
        onPress={() => goToMonth(-1)}
        hitSlop={6}
        accessibilityLabel="Previous month"
        style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
        <MaterialIcons name="chevron-left" size={22} color={Colors.text} />
      </Pressable>
      <Pressable
        onPress={() => goToMonth(1)}
        hitSlop={6}
        accessibilityLabel="Next month"
        style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
        <MaterialIcons name="chevron-right" size={22} color={Colors.text} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PageHeader
        title="Learnings"
        subtitle="What you took away from the events you attended, by month."
      />
      {isMockMode ? (
        <Text style={styles.mockNotice}>
          Mock summaries — connect a real LLM once Supabase is set up.
        </Text>
      ) : null}

      <View style={styles.monthHeader}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        {monthNav}
      </View>

      <Card title="Key takeaways" icon="auto-awesome">
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing recorded for {monthLabel} yet</Text>
            <Text style={styles.emptyText}>
              Add notes from an event&apos;s page and they&apos;ll show up here, ready to summarize.
            </Text>
          </View>
        ) : summary ? (
          <>
            <SummarySections text={summary.summary} />
            <View style={styles.summaryFooter}>
              <Text style={styles.metaText}>
                Generated {formatGeneratedAt(summary.generatedAt)}
                {summary.model ? ` · ${summary.model}` : ' · mock'}
              </Text>
              <Button
                label={generateSummary.isPending ? 'Regenerating…' : 'Regenerate'}
                icon="refresh"
                variant="secondary"
                disabled={generateSummary.isPending}
                onPress={() => generateSummary.mutate(events)}
              />
            </View>
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
            <Button
              label={generateSummary.isPending ? 'Generating…' : 'Generate summary'}
              icon="auto-awesome"
              disabled={generateSummary.isPending}
              onPress={() => generateSummary.mutate(events)}
            />
            {generateSummary.isError ? (
              <Text style={styles.errorText}>
                Couldn&apos;t generate a summary:{' '}
                {generateSummary.error instanceof Error ? generateSummary.error.message : 'Unknown error.'}
              </Text>
            ) : null}
          </>
        )}
      </Card>

      {events.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Events this month · {events.length}
          </Text>
          {events.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/dashboard/${event.id}`)}
              style={(state) => {
                const hovered = (state as { hovered?: boolean }).hovered;
                return [styles.eventCard, hovered && styles.eventCardHover, state.pressed && styles.eventRowPressed];
              }}>
              <View style={styles.eventMain}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{formatEventDateTime(event.starts_at)}</Text>
                <Text style={styles.eventLearnings} numberOfLines={2}>
                  {event.learnings}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mockNotice: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.noticeText,
    backgroundColor: Colors.noticeBg,
    padding: 10,
    borderRadius: Radius.sm,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  monthLabel: { fontSize: 20, fontWeight: '800', color: Colors.text },
  monthNav: { flexDirection: 'row', gap: 8 },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPressed: { opacity: 0.6 },
  empty: { gap: 4, paddingVertical: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  explainerText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  summarySections: { gap: 18 },
  summarySection: { gap: 6 },
  summarySectionHeader: { fontSize: 15, fontWeight: '800', color: Colors.accent },
  summaryBulletRow: { flexDirection: 'row', gap: 8 },
  summaryBulletDot: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  summaryBulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: Colors.text },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  errorText: { fontSize: 12, color: Colors.danger },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  eventCardHover: { boxShadow: Shadow.card, transform: [{ translateY: -1 }] },
  eventRowPressed: { opacity: 0.7 },
  eventMain: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  eventMeta: { fontSize: 13, color: Colors.textSecondary },
  eventLearnings: { fontSize: 14, lineHeight: 20, color: Colors.text, marginTop: 4 },
});
