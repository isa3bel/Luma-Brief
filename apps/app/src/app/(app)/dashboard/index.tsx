import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, MaxWidth, Radius, Shadow, StatusColors } from '@/constants/design';
import { BlurredSection } from '@/features/events/blurred-section';
import { CalendarView } from '@/features/events/calendar-view';
import { SwipeDeck } from '@/features/events/swipe-deck';
import { useEvents, useUpdateEventStatus } from '@/features/events/use-events';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// Events that belong on the calendar at all: attended (went) or on the
// books for the future (going/pending). Not-yet-reviewed past events live
// only in the swipe deck above, and "did not go" events are dropped
// entirely — both per the PRD.
const CALENDAR_STATUSES = new Set(['went', 'going', 'pending']);

function Stat({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statText}>
        <Text style={styles.statValue}>{value}</Text> {label}
      </Text>
    </View>
  );
}

export default function Dashboard() {
  const { data: events, isLoading, isError, error } = useEvents();
  const updateStatus = useUpdateEventStatus();
  const { isWide } = useBreakpoint();

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn&apos;t load events.</Text>
        <Text style={styles.errorDetail}>{error instanceof Error ? error.message : String(error)}</Text>
      </View>
    );
  }

  if (isLoading || !events) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const unresolved = events.filter((e) => e.status === 'unresolved');
  const calendarEvents = events.filter((e) => CALENDAR_STATUSES.has(e.status));

  const now = Date.now();
  const attended = events.filter((e) => e.status === 'went').length;
  const upcoming = events.filter(
    (e) => (e.status === 'going' || e.status === 'pending') && new Date(e.starts_at).getTime() >= now,
  ).length;

  return (
    <ScrollView contentContainerStyle={[styles.container, isWide && styles.containerWide]}>
      <View style={styles.pageHeader}>
        <Text role="heading" aria-level={1} style={styles.pageTitle}>
          Dashboard
        </Text>
        <View style={styles.stats}>
          {unresolved.length > 0 ? (
            <Stat color={StatusColors.pending.bg} value={unresolved.length} label="to review" />
          ) : null}
          <Stat color={StatusColors.went.bg} value={attended} label="attended" />
          <Stat color={StatusColors.going.bg} value={upcoming} label="upcoming" />
        </View>
      </View>

      {unresolved.length > 0 ? (
        <View style={[styles.deckSection, isWide && styles.deckSectionWide]}>
          <View style={styles.sectionHeader}>
            <Text role="heading" aria-level={2} style={styles.sectionTitle}>
              Did you go?
            </Text>
            <Text style={styles.sectionHint}>Swipe right for Went, left for Did not go.</Text>
          </View>
          <SwipeDeck
            events={unresolved}
            onSwipe={(id, status) => updateStatus.mutate({ id, status })}
          />
        </View>
      ) : events.length > 0 ? (
        <View style={styles.caughtUp}>
          <View style={styles.caughtUpIcon}>
            <MaterialIcons name="check" size={18} color={Colors.success} />
          </View>
          <View style={styles.caughtUpText}>
            <Text style={styles.caughtUpTitle}>You&apos;re all caught up</Text>
            <Text style={styles.sectionHint}>Every past event has been reviewed.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.calendarCard}>
        <BlurredSection locked={unresolved.length > 0}>
          <CalendarView events={calendarEvents} />
        </BlurredSection>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 24 },
  // Centered and capped on wide screens so the calendar doesn't stretch
  // edge to edge on a big monitor.
  containerWide: { maxWidth: MaxWidth.wide, width: '100%', alignSelf: 'center', padding: 24, gap: 28 },
  pageHeader: { gap: 10 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { fontSize: 13, color: Colors.textSecondary },
  statValue: { fontWeight: '800', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  errorText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
  errorDetail: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  deckSection: { gap: 14 },
  sectionHeader: { gap: 2 },
  sectionHint: { fontSize: 13, color: Colors.textSecondary },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.card,
    backgroundColor: '#EAF7F0',
  },
  caughtUpIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caughtUpText: { flex: 1 },
  caughtUpTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  // Wide only — narrow already has no spare width to center within, so the
  // deck stays full-bleed there, matching how the calendar itself behaves.
  deckSectionWide: { maxWidth: 420, width: '100%', alignSelf: 'center' },
  calendarCard: {
    padding: 14,
    borderRadius: Radius.cardLarge,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    boxShadow: Shadow.card,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
});
