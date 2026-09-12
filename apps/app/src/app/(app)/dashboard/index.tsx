import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/design';
import { BlurredSection } from '@/features/events/blurred-section';
import { CalendarView } from '@/features/events/calendar-view';
import { SwipeDeck } from '@/features/events/swipe-deck';
import { useEvents, useUpdateEventStatus } from '@/features/events/use-events';

// Events that belong on the calendar at all: attended (went) or on the
// books for the future (going/pending). Not-yet-reviewed past events live
// only in the swipe deck above, and "did not go" events are dropped
// entirely — both per the PRD.
const CALENDAR_STATUSES = new Set(['went', 'going', 'pending']);

export default function Dashboard() {
  const { data: events, isLoading, isError, error } = useEvents();
  const updateStatus = useUpdateEventStatus();

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {unresolved.length > 0 ? (
        <View style={styles.deckSection}>
          <Text style={styles.sectionTitle}>Did you go?</Text>
          <SwipeDeck
            events={unresolved}
            onSwipe={(id, status) => updateStatus.mutate({ id, status })}
          />
        </View>
      ) : null}

      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        <BlurredSection locked={unresolved.length > 0}>
          <CalendarView events={calendarEvents} />
        </BlurredSection>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
  errorText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
  errorDetail: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  deckSection: { gap: 12 },
  calendarSection: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
});
