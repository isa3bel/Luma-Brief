import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui';
import { Colors, Radius, Shadow, StatusColors, StatusLabel } from '@/constants/design';
import { formatEventDateTime } from '@/features/events/format';
import { useEvent, useUpdateEventStatus, useUpdateLearnings } from '@/features/events/use-events';
import type { EventStatus } from '@/features/events/types';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useDraftLinkedinPost, useLinkedinConnection, usePostToLinkedin } from '@/features/linkedin/use-linkedin';
import { useImportGranolaNote, useSearchGranolaNotes, type GranolaNoteCandidate } from '@/features/granola/use-granola';
import { useUserSettings } from '@/features/settings/use-user-settings';

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
  const [learningsFocused, setLearningsFocused] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const scrollRef = useRef<ScrollView>(null);

  const { data: linkedin } = useLinkedinConnection();
  const draftPost = useDraftLinkedinPost();
  const postToLinkedin = usePostToLinkedin();
  const [linkedinDraft, setLinkedinDraft] = useState<string | null>(null);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);

  const { data: userSettings } = useUserSettings();
  const searchGranola = useSearchGranolaNotes();
  const importGranola = useImportGranolaNote();
  const [granolaModalOpen, setGranolaModalOpen] = useState(false);
  const [granolaNotes, setGranolaNotes] = useState<GranolaNoteCandidate[] | null>(null);
  const [importingGranolaId, setImportingGranolaId] = useState<string | null>(null);

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

  const handleDraftLinkedinPost = () => {
    if (!event) return;
    draftPost.mutate(event.id, { onSuccess: (draft) => setLinkedinDraft(draft) });
  };

  const openLinkedinModal = () => {
    setLinkedinModalOpen(true);
    handleDraftLinkedinPost();
  };

  const closeLinkedinModal = () => {
    setLinkedinModalOpen(false);
    setLinkedinDraft(null);
    draftPost.reset();
    postToLinkedin.reset();
  };

  const handlePostToLinkedin = () => {
    if (!event || !linkedinDraft?.trim()) return;
    postToLinkedin.mutate(
      { eventId: event.id, text: linkedinDraft },
      { onSuccess: () => setLinkedinModalOpen(false) }
    );
  };

  const openGranolaModal = () => {
    setGranolaModalOpen(true);
    if (!event) return;
    searchGranola.mutate(event.id, { onSuccess: (notes) => setGranolaNotes(notes) });
  };

  const closeGranolaModal = () => {
    setGranolaModalOpen(false);
    setGranolaNotes(null);
    searchGranola.reset();
    importGranola.reset();
  };

  const handleImportGranolaNote = (granolaNoteId: string) => {
    if (!event) return;
    setImportingGranolaId(granolaNoteId);
    importGranola.mutate(
      { eventId: event.id, granolaNoteId },
      {
        // Flip this one row to "Imported" locally rather than re-running the
        // search — the event refetch triggered by the hook itself (see
        // use-granola.ts) is what actually updates the Learnings text shown
        // on the page underneath.
        onSuccess: () => {
          setGranolaNotes((prev) =>
            prev ? prev.map((n) => (n.id === granolaNoteId ? { ...n, alreadyImported: true } : n)) : prev
          );
          setImportingGranolaId(null);
        },
        onError: () => setImportingGranolaId(null),
      }
    );
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
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // iOS only (Android's equivalent is app.json's
      // android.softwareKeyboardLayoutMode) — scrolls the focused input
      // into view on focus and when the keyboard's own size changes.
      // Confirmed on a real device this does NOT keep following the
      // cursor as the Learnings textarea grows from typing alone (e.g.
      // repeatedly pressing Enter) — the keyboard's height never changes
      // in that case, so nothing here re-triggers. That's what the
      // TextInput's onContentSizeChange + scrollRef below is for.
      automaticallyAdjustKeyboardInsets>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}>
        <MaterialIcons name="arrow-back" size={18} color={Colors.accent} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text role="heading" aria-level={1} style={styles.title}>
          {event.title}
        </Text>
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

      <View style={styles.metaCard}>
        <MetaRow icon="event" text={formatEventDateTime(event.starts_at)} />
        {event.location_name ? (
          <MetaRow
            icon="place"
            text={[event.location_name, event.location_address].filter(Boolean).join(' · ')}
          />
        ) : null}
        {event.luma_url ? <MetaRow icon="link" text={event.luma_url} /> : null}
      </View>

      {event.description || event.speakers.length > 0 || event.sponsors.length > 0 || event.topics.length > 0 ? (
        // One card for the descriptive facts (rather than a card each) —
        // About/Speakers/Sponsors/Topics are all read-only reference info.
        <View style={styles.detailsCard}>
      {event.description ? (
        <Section bare title="About">
          <Text style={styles.bodyText}>{event.description}</Text>
        </Section>
      ) : null}

      {event.speakers.length > 0 ? (
        <Section bare title="Speakers">
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
        <Section bare title="Sponsors">
          <Text style={styles.bodyText}>{event.sponsors.map((s) => s.name).join(', ')}</Text>
        </Section>
      ) : null}

      {event.topics.length > 0 ? (
        <Section bare title="Topics">
          <View style={styles.topics}>
            {event.topics.map((topic) => (
              <View key={topic} style={styles.topicPill}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}
        </View>
      ) : null}

      {userSettings?.granolaApiKey ? (
        <Section title="Granola Notes">
          <Text style={styles.explainerText}>
            Pull in a Granola note&apos;s AI summary as a starting point for Learnings below —
            appended, never replacing what&apos;s already there, so you can attach more than one
            over time.
          </Text>
          <Button label="Find Granola notes" icon="description" variant="secondary" onPress={openGranolaModal} />
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
          onFocus={() => setLearningsFocused(true)}
          onBlur={() => {
            setLearningsFocused(false);
            debouncedSave.flush();
          }}
          // Fires as the multiline box grows a new line — Learnings is the
          // last section on the page, so scrolling to the very bottom of
          // the ScrollView and scrolling to the bottom of this box are the
          // same thing, which is also exactly where the cursor is while
          // actively typing.
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          placeholder="What did you take away from this one?"
          multiline
          textAlignVertical="top"
          style={[styles.learningsInput, learningsFocused && styles.inputFocused]}
        />
      </Section>

      {event.learnings?.trim() ? (
        <Section title="Share on LinkedIn">
          {event.linkedin_posted_at && event.linkedin_post_urn ? (
            <>
              <Text style={styles.bodyText}>
                Posted{' '}
                {new Date(event.linkedin_posted_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                .
              </Text>
              <View style={styles.linkedinActions}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(`https://www.linkedin.com/feed/update/${event.linkedin_post_urn}/`)
                  }>
                  <Text style={styles.linkText}>View on LinkedIn →</Text>
                </Pressable>
                {/* In case the post above got deleted on LinkedIn itself —
                    this drafts and posts fresh, overwriting the old
                    urn/timestamp with whatever the new post gets. */}
                <Button label="Post again" variant="secondary" onPress={openLinkedinModal} />
              </View>
            </>
          ) : (
            <Button label="Share on LinkedIn" icon="share" variant="secondary" onPress={openLinkedinModal} />
          )}
        </Section>
      ) : null}

      {linkedinModalOpen ? (
        // Conditionally mounted rather than an always-mounted
        // <Modal visible={...}> — same reasoning as calendar-view.tsx's day
        // picker: unmounting on close removes it immediately instead of
        // depending on Modal's own hide transition.
        <Modal transparent animationType="fade" onRequestClose={closeLinkedinModal}>
          <Pressable style={styles.modalBackdrop} onPress={closeLinkedinModal}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share on LinkedIn</Text>
                <Pressable onPress={closeLinkedinModal} hitSlop={8}>
                  <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {draftPost.isPending && linkedinDraft === null ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator />
                  <Text style={styles.explainerText}>Drafting from your Learnings notes…</Text>
                </View>
              ) : draftPost.isError && linkedinDraft === null ? (
                <>
                  <Text style={styles.errorText}>
                    {draftPost.error instanceof Error ? draftPost.error.message : 'Failed to draft.'}
                  </Text>
                  <Button label="Try again" variant="secondary" onPress={handleDraftLinkedinPost} />
                </>
              ) : (
                <>
                  <TextInput
                    value={linkedinDraft ?? ''}
                    onChangeText={setLinkedinDraft}
                    multiline
                    textAlignVertical="top"
                    style={styles.modalTextarea}
                  />
                  {!linkedin?.connected ? (
                    <Text style={styles.explainerText}>Connect LinkedIn in Settings before posting.</Text>
                  ) : null}
                  {draftPost.isError ? (
                    <Text style={styles.errorText}>
                      {draftPost.error instanceof Error ? draftPost.error.message : 'Failed to regenerate.'}
                    </Text>
                  ) : null}
                  {postToLinkedin.isError ? (
                    <Text style={styles.errorText}>
                      {postToLinkedin.error instanceof Error
                        ? postToLinkedin.error.message
                        : 'Failed to post.'}
                    </Text>
                  ) : null}
                  <View style={styles.linkedinActions}>
                    <Button
                      label={draftPost.isPending ? 'Regenerating…' : 'Regenerate'}
                      icon="refresh"
                      variant="secondary"
                      disabled={draftPost.isPending}
                      onPress={handleDraftLinkedinPost}
                    />
                    <Button
                      label={postToLinkedin.isPending ? 'Posting…' : 'Post to LinkedIn'}
                      icon="send"
                      disabled={postToLinkedin.isPending || !linkedinDraft?.trim()}
                      onPress={handlePostToLinkedin}
                    />
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {granolaModalOpen ? (
        <Modal transparent animationType="fade" onRequestClose={closeGranolaModal}>
          <Pressable style={styles.modalBackdrop} onPress={closeGranolaModal}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Granola notes near this event</Text>
                <Pressable onPress={closeGranolaModal} hitSlop={8}>
                  <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {searchGranola.isPending ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator />
                  <Text style={styles.explainerText}>Looking for notes around this event&apos;s date…</Text>
                </View>
              ) : searchGranola.isError ? (
                <>
                  <Text style={styles.errorText}>
                    {searchGranola.error instanceof Error ? searchGranola.error.message : 'Search failed.'}
                  </Text>
                  <Button label="Try again" variant="secondary" onPress={openGranolaModal} />
                </>
              ) : granolaNotes && granolaNotes.length > 0 ? (
                <ScrollView style={styles.granolaList}>
                  {granolaNotes.map((note) => (
                    <View key={note.id} style={styles.granolaRow}>
                      <View style={styles.granolaRowMain}>
                        <Text style={styles.granolaRowTitle} numberOfLines={1}>
                          {note.title}
                        </Text>
                        <Text style={styles.metaText}>
                          {new Date(note.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {note.alreadyImported ? (
                        <Text style={styles.successText}>Imported</Text>
                      ) : (
                        <Button
                          label={importingGranolaId === note.id ? 'Importing…' : 'Import'}
                          variant="secondary"
                          disabled={importingGranolaId === note.id}
                          onPress={() => handleImportGranolaNote(note.id)}
                        />
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.explainerText}>
                  No Granola notes found within a few days of this event.
                </Text>
              )}
              {importGranola.isError ? (
                <Text style={styles.errorText}>
                  {importGranola.error instanceof Error ? importGranola.error.message : 'Import failed.'}
                </Text>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
  bare = false,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  bare?: boolean; // no card frame of its own — sits inside a parent card
  children: React.ReactNode;
}) {
  return (
    <View style={bare ? styles.sectionBare : styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentTint,
  },
  backPressed: { opacity: 0.6 },
  backText: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', flex: 1, minWidth: 220, color: Colors.text, letterSpacing: -0.3, lineHeight: 34 },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
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
  metaCard: {
    gap: 10,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    boxShadow: Shadow.card,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { fontSize: 14, color: Colors.text, flexShrink: 1 },
  detailsCard: {
    gap: 18,
    padding: 18,
    borderRadius: Radius.cardLarge,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    boxShadow: Shadow.card,
  },
  sectionBare: { gap: 6 },
  // Each interactive section is its own framed card, matching Settings/Learnings.
  section: {
    gap: 10,
    padding: 18,
    borderRadius: Radius.cardLarge,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    boxShadow: Shadow.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: Colors.textSecondary, textTransform: 'uppercase' },
  bodyText: { fontSize: 15, lineHeight: 22, color: Colors.text },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicPill: { backgroundColor: Colors.accentTint, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  topicText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  learningsInput: {
    minHeight: 160,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    outlineStyle: 'none' as never,
  },
  inputFocused: { backgroundColor: Colors.surface, borderColor: Colors.accent },
  saveState: { fontSize: 12, color: Colors.textSecondary },
  explainerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  errorText: { fontSize: 12, color: Colors.danger },
  successText: { fontSize: 12, color: Colors.success },
  linkText: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  linkedinActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  buttonDisabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.cardLarge,
    padding: 22,
    gap: 14,
    boxShadow: Shadow.modal,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  modalLoading: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  modalTextarea: {
    minHeight: 180,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  granolaList: { maxHeight: 320 },
  granolaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  granolaRowMain: { flex: 1, gap: 2 },
  granolaRowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
