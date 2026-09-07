import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatEventDateTime } from '@/features/events/format';
import { useEvent, useUpdateLearnings } from '@/features/events/use-events';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  going: 'Going',
  went: 'Went',
  did_not_go: 'Did not go',
  unresolved: 'Unresolved',
};

export default function EventDetail() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(eventId);
  const updateLearnings = useUpdateLearnings();

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
        <MaterialIcons name="arrow-back" size={20} color="#0a7ea4" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{STATUS_LABEL[event.status] ?? event.status}</Text>
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
      <MaterialIcons name={icon} size={18} color="#687076" />
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
  backText: { color: '#0a7ea4', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', flex: 1 },
  statusPill: { backgroundColor: '#e6f4fa', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0a7ea4' },
  metaBlock: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, color: '#3a3f42', flexShrink: 1 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#687076', textTransform: 'uppercase' },
  bodyText: { fontSize: 15, lineHeight: 22, color: '#1a1d1e' },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicPill: { backgroundColor: '#e6f4fa', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  topicText: { fontSize: 12, color: '#0a7ea4', fontWeight: '600' },
  learningsInput: {
    minHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c7ccd1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  saveState: { fontSize: 12, color: '#687076' },
});
