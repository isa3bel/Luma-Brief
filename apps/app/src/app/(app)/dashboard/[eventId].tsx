import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, StatusColors, StatusLabel } from '@/constants/design';
import { formatEventDateTime } from '@/features/events/format';
import { useEvent, useUpdateEventStatus, useUpdateLearnings } from '@/features/events/use-events';
import type { EventStatus } from '@/features/events/types';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

// Statuses that actually show up on the Calendar (see CALENDAR_STATUSES in
// dashboard/index.tsx) — the only ones where "remove from the calendar"
// means anything. Removing sets status to did_not_go rather than back to
// unresolved: the user is correcting a fact ("I didn't actually go"), not
// asking to re-swipe, and did_not_go is exactly what already makes an
// event disappear from both the calendar and the swipe deck.
const REMOVABLE_STATUSES = new Set<EventStatus>(['went', 'going', 'pending']);

export default function EventDetail() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(eventId);
  const updateLearnings = useUpdateLearnings();
  const updateStatus = useUpdateEventStatus();

  const [learnings, setLearnings] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Seed the local textarea from the fetched event exactly once it arrives,
  // rather than on every refetch — otherwise an in-flight autosave could
  // get clobbered by a query refetch echoing back the pre-save value.
  useEffect(() => {
    if (event) setLearnings(event.learnings ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const debouncedSave = useDebouncedCallback((next: string) => {
    if (!event) return;
    setSaveState('saving');
    updateLearnings.mutate(
      { id: event.id, learnings: next },
      { onSuccess: () => setSaveState('saved') }
    );
  }, 800);

  const handleChange = (next: string) => {
    setLearnings(next);
    setSaveState('idle');
    debouncedSave(next);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={Colors.accent} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.statusGroup}>
          <View style={[styles.statusPill, { backgroundColor: StatusColors[event.status].bg }]}>
            <Text style={[styles.statusText, { color: StatusColors[event.status].text }]}>
              {StatusLabel[event.status] ?? event.status}
            </Text>
          </View>
          {REMOVABLE_STATUSES.has(event.status) ? (
            <Pressable
              onPress={() => {
                updateStatus.mutate(
                  { id: event.id, status: 'did_not_go' },
                  { onSuccess: () => router.back() }
                );
              }}
              disabled={updateStatus.isPending}
              style={[styles.removeButton, updateStatus.isPending && styles.removeButtonDisabled]}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.metaBlock}>
        <MetaRow icon="event" text={formatEventDateTime(event.starts_at)} />
        {event.location_name ? (
          <MetaRow
            icon="place"
            text={[event.location_name, event.location_address].filter(Boolean).join(' · ')}
          />
        ) : null}
        {event.luma_url ? <MetaRow icon="link" text={event.luma_url} /> : null}
      </View>

      {event.description ? (
        <Section title="About">
          <Text style={styles.bodyText}>{event.description}</Text>
        </Section>
      ) : null}

      {event.speakers.length > 0 ? (
        <Section title="Speakers">
          {event.speakers.map((speaker) => (
            <Text key={speaker.name} style={styles.bodyText}>
              {speaker.name}
              {speaker.title || speaker.company
                ? ` — ${[speaker.title, speaker.company].filter(Boolean).join(', ')}`
                : ''}
            </Text>
          ))}
        </Section>
      ) : null}

      {event.sponsors.length > 0 ? (
        <Section title="Sponsors">
          <Text style={styles.bodyText}>{event.sponsors.map((s) => s.name).join(', ')}</Text>
        </Section>
      ) : null}

      {event.topics.length > 0 ? (
        <Section title="Topics">
          <View style={styles.topics}>
            {event.topics.map((topic) => (
              <View key={topic} style={styles.topicPill}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section
        title="Learnings"
        trailing={
          saveState === 'saving' ? (
            <Text style={styles.saveState}>Saving…</Text>
          ) : saveState === 'saved' ? (
            <Text style={styles.saveState}>Saved</Text>
          ) : null
        }>
        <TextInput
          value={learnings}
          onChangeText={handleChange}
          onBlur={() => debouncedSave.flush()}
          placeholder="What did you take away from this one?"
          multiline
          textAlignVertical="top"
          style={styles.learningsInput}
        />
      </Section>
    </ScrollView>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <MaterialIcons name={icon} size={18} color={Colors.textSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: Colors.accent, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', flex: 1, color: Colors.text },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  removeButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.danger,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  removeButtonDisabled: { opacity: 0.5 },
  removeButtonText: { fontSize: 12, fontWeight: '700', color: Colors.danger },
  metaBlock: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, color: Colors.text, flexShrink: 1 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  bodyText: { fontSize: 15, lineHeight: 22, color: Colors.text },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicPill: { backgroundColor: Colors.accentTint, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  topicText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  learningsInput: {
    minHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.sm,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  saveState: { fontSize: 12, color: Colors.textSecondary },
});
