import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/gradient-background';
import { Colors, MaxWidth, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// Only the three pillars that are actually live today (Luma sync, swipe
// tracking, AI takeaways) — Network/LinkedIn is still a parked placeholder
// (see (app)/network/index.tsx), so it deliberately isn't promised here.
const STEPS: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'sync',
    title: 'Sync from Luma',
    body: 'Connect your personal Luma calendar once — every event you register for shows up automatically, speakers and topics included.',
  },
  {
    icon: 'swipe',
    title: 'Swipe to confirm',
    body: 'After each event, a quick swipe marks whether you actually went — a real record of your year, built with zero extra effort.',
  },
  {
    icon: 'auto-awesome',
    title: 'Capture & recall',
    body: 'Jot quick notes right after, and let AI turn a month of scattered fragments into clear takeaways you can speak to later.',
  },
];

export default function Landing() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { isWide } = useBreakpoint();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={styles.root}>
      <GradientBackground />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.brandRow}>
              <MaterialIcons name="auto-awesome" size={18} color={Colors.accent} />
              <Text style={styles.brand}>LumaBrief</Text>
            </View>
            <Text style={[styles.headline, isWide && styles.headlineWide]}>
              Never lose what you learned at an event again.
            </Text>
            <Text style={styles.subheadline}>
              LumaBrief pulls in every event from your Luma calendar, turns a quick swipe into a real
              record of what you actually attended, and uses AI to turn your scattered notes into
              takeaways worth remembering.
            </Text>
            <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}>
              <Text style={styles.ctaText}>Sign in</Text>
              <MaterialIcons name="arrow-forward" size={18} color={Colors.surface} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How it works</Text>
          <View style={[styles.steps, isWide && styles.stepsWide]}>
            {STEPS.map((step) => (
              <View key={step.title} style={[styles.stepCard, isWide && styles.stepCardWide]}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name={step.icon} size={22} color={Colors.accent} />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>From scattered notes to real takeaways</Text>
          <View style={[styles.example, isWide && styles.exampleWide]}>
            <View style={styles.exampleCard}>
              <Text style={styles.exampleCardLabel}>Your quick notes</Text>
              <Text style={styles.exampleBefore}>
                - agentic ai everywhere{'\n'}- token cost is the real bottleneck{'\n'}- shadow ai — ppl
                using personal accts{'\n'}- pm role shifting, build w/ eng directly
              </Text>
            </View>
            <MaterialIcons
              name={isWide ? 'arrow-forward' : 'arrow-downward'}
              size={20}
              color={Colors.textSecondary}
            />
            <View style={[styles.exampleCard, styles.exampleCardAfter]}>
              <Text style={[styles.exampleCardLabel, styles.exampleCardLabelAfter]}>
                LumaBrief&apos;s takeaway
              </Text>
              <Text style={styles.exampleAfter}>
                Agentic AI is the dominant theme this month — and the real bottleneck is cost, not
                capability, with teams overusing frontier models where a smaller one would do.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Share what you learned</Text>
          <View style={[styles.share, isWide && styles.shareWide]}>
            <View style={styles.shareCopy}>
              <Text style={styles.shareTitle}>One click from private notes to a LinkedIn post.</Text>
              <Text style={styles.shareBody}>
                Turn any event&apos;s Learnings into a short, first-person post worth sharing with
                your network — drafted for you, yours to edit, and posted without ever leaving the
                app.
              </Text>
            </View>
            <View style={styles.postPreview}>
              <View style={styles.postPreviewHeader}>
                <View style={styles.postPreviewAvatar}>
                  <MaterialIcons name="person" size={20} color={Colors.surface} />
                </View>
                <View>
                  <Text style={styles.postPreviewName}>You</Text>
                  <Text style={styles.postPreviewCaption}>Shared from LumaBrief</Text>
                </View>
              </View>
              <Text style={styles.postPreviewBody}>
                The PM/eng line keeps blurring — in a good way. Builders who can also scope and
                ship are changing how teams actually work together.
              </Text>
              <Text style={styles.postPreviewHashtags}>#ProductManagement #AI</Text>
            </View>
          </View>
        </View>

        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>Start building your own record.</Text>
          <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}>
            <Text style={styles.ctaText}>Sign in</Text>
            <MaterialIcons name="arrow-forward" size={18} color={Colors.surface} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBrandRow}>
            <MaterialIcons name="auto-awesome" size={16} color={Colors.accent} />
            <Text style={styles.footerBrand}>LumaBrief</Text>
          </View>
          <Text style={styles.footerTagline}>A personal record of the events worth remembering.</Text>
          <Text style={styles.footerMeta}>© {new Date().getFullYear()} LumaBrief</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Transparent — GradientBackground sits behind this as a sibling, fixed
  // in place while this ScrollView's content scrolls over it.
  page: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  hero: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 56 },
  heroInner: { maxWidth: MaxWidth.content, width: '100%', alignSelf: 'center', alignItems: 'center', gap: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  brand: { fontSize: 14, fontWeight: '700', color: Colors.text },
  headline: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: Colors.text, lineHeight: 38 },
  headlineWide: { fontSize: 44, lineHeight: 50, maxWidth: 620 },
  subheadline: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: Colors.textSecondary, maxWidth: 520 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: Radius.pill,
  },
  ctaText: { color: Colors.surface, fontSize: 16, fontWeight: '600' },

  section: { maxWidth: MaxWidth.content, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 40, gap: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  steps: { gap: 16 },
  stepsWide: { flexDirection: 'row' },
  stepCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.cardLarge,
    padding: 20,
    gap: 8,
  },
  stepCardWide: { flexBasis: 0 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  stepBody: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },

  example: { gap: 12, alignItems: 'center' },
  exampleWide: { flexDirection: 'row', alignItems: 'stretch' },
  exampleCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.cardLarge,
    padding: 18,
    gap: 10,
  },
  exampleCardAfter: { backgroundColor: Colors.accentTint, borderColor: Colors.accentTint },
  exampleCardLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  exampleCardLabelAfter: { color: Colors.accent },
  exampleBefore: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, fontFamily: Fonts.mono },
  exampleAfter: { fontSize: 15, lineHeight: 22, color: Colors.text },

  share: { gap: 20, alignItems: 'center' },
  shareWide: { flexDirection: 'row', alignItems: 'center' },
  shareCopy: { flex: 1, gap: 8 },
  shareTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, lineHeight: 26 },
  shareBody: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  postPreview: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.cardLarge,
    padding: 18,
    gap: 10,
  },
  postPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postPreviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPreviewName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  postPreviewCaption: { fontSize: 12, color: Colors.textSecondary },
  postPreviewBody: { fontSize: 14, lineHeight: 21, color: Colors.text },
  postPreviewHashtags: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  finalCta: { alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 48 },
  finalCtaTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  footer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerBrand: { fontSize: 14, fontWeight: '700', color: Colors.text },
  footerTagline: { fontSize: 13, color: Colors.textSecondary },
  footerMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
});
