import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useLumaSync } from '@/features/events/use-luma-sync';
import { useSaveLumaIcalUrl, useUserSettings } from '@/features/settings/use-user-settings';

function formatLastSync(iso: string | null) {
  if (!iso) return 'Never synced';
  return `Last synced ${new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function Settings() {
  const { data: settings, isLoading } = useUserSettings();
  const saveUrl = useSaveLumaIcalUrl();
  const lumaSync = useLumaSync();

  const [icalUrl, setIcalUrl] = useState('');

  // Seed the input once real data arrives, same pattern as the event
  // detail screen's Learnings textarea — avoids a save-in-flight getting
  // clobbered by a refetch echoing back the pre-save value.
  useEffect(() => {
    if (settings) setIcalUrl(settings.lumaIcalUrl ?? '');
  }, [settings?.lumaIcalUrl]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const hasUrl = Boolean(settings?.lumaIcalUrl);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Luma Calendar</Text>
        <Text style={styles.explainerText}>
          Find this in Luma under Account → Calendar Settings → Subscribe via iCal, then paste the
          link here.
        </Text>
        <TextInput
          value={icalUrl}
          onChangeText={setIcalUrl}
          placeholder="webcal://lu.ma/ical/... or https://..."
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          onPress={() => saveUrl.mutate(icalUrl.trim())}
          disabled={saveUrl.isPending || !icalUrl.trim()}
          style={[styles.primaryButton, (saveUrl.isPending || !icalUrl.trim()) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>{saveUrl.isPending ? 'Saving…' : 'Save'}</Text>
        </Pressable>
        {saveUrl.isSuccess ? <Text style={styles.successText}>Saved.</Text> : null}
        {saveUrl.isError ? (
          <Text style={styles.errorText}>
            {saveUrl.error instanceof Error ? saveUrl.error.message : 'Failed to save.'}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync</Text>
        <Text style={styles.metaText}>{formatLastSync(settings?.lastLumaSyncAt ?? null)}</Text>
        <Pressable
          onPress={() => lumaSync.mutate()}
          disabled={lumaSync.isPending || !hasUrl}
          style={[styles.secondaryButton, (lumaSync.isPending || !hasUrl) && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>{lumaSync.isPending ? 'Syncing…' : 'Sync now'}</Text>
        </Pressable>
        {!hasUrl ? <Text style={styles.explainerText}>Save an iCal URL above first.</Text> : null}
        {lumaSync.data?.error ? <Text style={styles.errorText}>{lumaSync.data.error}</Text> : null}
        {lumaSync.data && !lumaSync.data.error ? (
          <Text style={styles.successText}>
            Synced {lumaSync.data.synced} event{lumaSync.data.synced === 1 ? '' : 's'} (
            {lumaSync.data.newCount} new)
            {lumaSync.data.enriched ? `, enriched ${lumaSync.data.enriched}` : ''}.
          </Text>
        ) : null}
        {lumaSync.data?.enrichError ? (
          <Text style={styles.errorText}>Enrichment: {lumaSync.data.enrichError}</Text>
        ) : null}
        {lumaSync.isError ? (
          <Text style={styles.errorText}>
            {lumaSync.error instanceof Error ? lumaSync.error.message : 'Sync failed.'}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  explainerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
  },
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
  successText: { fontSize: 12, color: Colors.success },
  errorText: { fontSize: 12, color: Colors.danger },
});
