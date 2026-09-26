import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { Colors, Radius } from '@/constants/design';
import { useLumaSync } from '@/features/events/use-luma-sync';
import { useConnectLinkedin, useLinkedinConnection } from '@/features/linkedin/use-linkedin';
import {
  useSaveGranolaApiKey,
  useSaveLinkedinPostInstructions,
  useSaveLumaIcalUrl,
  useUserSettings,
} from '@/features/settings/use-user-settings';

function formatExpiry(iso: string | null) {
  if (!iso) return '';
  return `Connected until ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

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
  const { data: linkedin, isLoading: linkedinLoading } = useLinkedinConnection();
  const connectLinkedin = useConnectLinkedin();
  const savePostInstructions = useSaveLinkedinPostInstructions();
  const saveGranolaKey = useSaveGranolaApiKey();

  const [icalUrl, setIcalUrl] = useState('');
  const [postInstructions, setPostInstructions] = useState('');
  const [granolaKey, setGranolaKey] = useState('');

  // Seed the input once real data arrives, same pattern as the event
  // detail screen's Learnings textarea — avoids a save-in-flight getting
  // clobbered by a refetch echoing back the pre-save value.
  useEffect(() => {
    if (settings) setIcalUrl(settings.lumaIcalUrl ?? '');
  }, [settings?.lumaIcalUrl]);

  useEffect(() => {
    if (settings) setPostInstructions(settings.linkedinPostInstructions ?? '');
  }, [settings?.linkedinPostInstructions]);

  useEffect(() => {
    if (settings) setGranolaKey(settings.granolaApiKey ?? '');
  }, [settings?.granolaApiKey]);

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
      <PageHeader title="Settings" subtitle="Connect your calendar and the tools LumaBrief works with." />

      <Card
        title="Luma calendar"
        icon="event"
        badge={hasUrl ? <Badge label="Linked" /> : <Badge label="Not set up" tone="neutral" />}>
        <Text style={styles.explainerText}>
          Find this in Luma under Account → Calendar Settings → Subscribe via iCal, then paste the
          link here.
        </Text>
        <TextInput
          value={icalUrl}
          onChangeText={setIcalUrl}
          placeholder="webcal://lu.ma/ical/... or https://..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Button
          label={saveUrl.isPending ? 'Saving…' : 'Save'}
          disabled={saveUrl.isPending || !icalUrl.trim()}
          onPress={() => saveUrl.mutate(icalUrl.trim())}
        />
        {saveUrl.isSuccess ? <Text style={styles.successText}>Saved.</Text> : null}
        {saveUrl.isError ? (
          <Text style={styles.errorText}>
            {saveUrl.error instanceof Error ? saveUrl.error.message : 'Failed to save.'}
          </Text>
        ) : null}
      </Card>

      <Card title="Sync" icon="sync">
        <Text style={styles.metaText}>{formatLastSync(settings?.lastLumaSyncAt ?? null)}</Text>
        <Button
          label={lumaSync.isPending ? 'Syncing…' : 'Sync now'}
          icon="sync"
          variant="secondary"
          disabled={lumaSync.isPending || !hasUrl}
          onPress={() => lumaSync.mutate()}
        />
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
      </Card>

      <Card
        title="LinkedIn"
        icon="share"
        badge={linkedin?.connected ? <Badge label="Connected" /> : <Badge label="Not connected" tone="neutral" />}>
        <Text style={styles.explainerText}>
          Connect once to draft and post &quot;Share on LinkedIn&quot; write-ups from an event&apos;s
          Learnings notes. Connections last about 60 days, then need reconnecting here.
        </Text>
        {linkedinLoading ? (
          <ActivityIndicator />
        ) : linkedin?.connected ? (
          <>
            <Text style={styles.successText}>
              Connected{linkedin.memberName ? ` as ${linkedin.memberName}` : ''}.
            </Text>
            {linkedin.expiresAt ? <Text style={styles.metaText}>{formatExpiry(linkedin.expiresAt)}</Text> : null}
            <Button
              label={connectLinkedin.isPending ? 'Connecting…' : 'Reconnect'}
              variant="secondary"
              disabled={connectLinkedin.isPending}
              onPress={() => connectLinkedin.mutate()}
            />
          </>
        ) : (
          <Button
            label={connectLinkedin.isPending ? 'Connecting…' : 'Connect LinkedIn'}
            disabled={connectLinkedin.isPending}
            onPress={() => connectLinkedin.mutate()}
          />
        )}
        {connectLinkedin.isError ? (
          <Text style={styles.errorText}>
            {connectLinkedin.error instanceof Error ? connectLinkedin.error.message : 'Connection failed.'}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.subLabel}>Post writing instructions</Text>
        <Text style={styles.explainerText}>
          Standing instructions the AI follows for every draft — tone, how you want it to open,
          anything you always want included or avoided. Left blank, it just uses sensible
          defaults.
        </Text>
        <TextInput
          value={postInstructions}
          onChangeText={setPostInstructions}
          placeholder={'e.g. "Keep it casual, no corporate buzzwords. Never open by naming the event — lead with the takeaway. Always end with a question."'}
          placeholderTextColor={Colors.textTertiary}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />
        <Button
          label={savePostInstructions.isPending ? 'Saving…' : 'Save instructions'}
          variant="secondary"
          disabled={savePostInstructions.isPending}
          onPress={() => savePostInstructions.mutate(postInstructions.trim())}
        />
        {savePostInstructions.isSuccess ? <Text style={styles.successText}>Saved.</Text> : null}
        {savePostInstructions.isError ? (
          <Text style={styles.errorText}>
            {savePostInstructions.error instanceof Error
              ? savePostInstructions.error.message
              : 'Failed to save.'}
          </Text>
        ) : null}
      </Card>

      <Card
        title="Granola"
        icon="description"
        badge={settings?.granolaApiKey ? <Badge label="Connected" /> : <Badge label="Not connected" tone="neutral" />}>
        <Text style={styles.explainerText}>
          Find this in Granola under Settings → Connectors → API keys. Once connected, an
          event&apos;s page can pull in a matching Granola note&apos;s summary as Learnings.
        </Text>
        <TextInput
          value={granolaKey}
          onChangeText={setGranolaKey}
          placeholder="Paste your Granola API key"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />
        <Button
          label={saveGranolaKey.isPending ? 'Saving…' : 'Save'}
          disabled={saveGranolaKey.isPending || !granolaKey.trim()}
          onPress={() => saveGranolaKey.mutate(granolaKey.trim())}
        />
        {saveGranolaKey.isSuccess ? <Text style={styles.successText}>Saved.</Text> : null}
        {saveGranolaKey.isError ? (
          <Text style={styles.errorText}>
            {saveGranolaKey.error instanceof Error ? saveGranolaKey.error.message : 'Failed to save.'}
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: 6 },
  explainerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  textarea: {
    minHeight: 100,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    outlineStyle: 'none' as never,
  },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text,
    outlineStyle: 'none' as never,
  },
  successText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  errorText: { fontSize: 13, color: Colors.danger },
});
