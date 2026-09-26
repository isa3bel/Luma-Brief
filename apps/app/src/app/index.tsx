import { MaterialIcons } from '@expo/vector-icons';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { GradientBackground } from '@/components/gradient-background';
import { BrandFont, Colors, MaxWidth, Radius, StatusColors } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// Only the pillars that are actually live today — Network/LinkedIn-reading
// is still a parked placeholder (see (app)/network/index.tsx), so it
// deliberately isn't promised here. Numbered because this genuinely is a
// sequence: there's nothing to swipe until Luma has synced, and nothing to
// summarize until there are notes.
const STEPS: { title: string; body: string }[] = [
  {
    title: 'Sync from Luma',
    body: 'Connect your personal Luma calendar once. Every event you register for shows up automatically — speakers and topics included.',
  },
  {
    title: 'Swipe to confirm',
    body: 'After each event, one swipe says whether you actually went. A real record of your year, with almost no effort.',
  },
  {
    title: 'Capture & recall',
    body: 'Jot quick notes right after — or import them from Granola. AI turns a month of fragments into clear takeaways.',
  },
];

// One decision here: the whole marketing page stays ungated by auth
// redirects *before* fonts start loading — a signed-in visitor hitting "/"
// gets bounced to the dashboard without ever downloading a typeface.
export default function Landing() {
  const { session, isLoading } = useAuth();

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

  return <LandingPage />;
}

function LandingPage() {
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const scrollRef = useRef<ScrollView>(null);
  const howItWorksY = useRef(0);

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // The gradient paints immediately; only the text waits on the typeface,
  // so there's never a flash of the wrong font. A font *error* still
  // renders (system fallback) rather than leaving a blank page.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.root}>
        <GradientBackground intensity={1.5} />
      </View>
    );
  }

  const goToSignIn = () => router.push('/sign-in');
  const scrollToHowItWorks = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, howItWorksY.current - 12), animated: true });

  return (
    <View style={styles.root}>
      <GradientBackground intensity={1.5} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <MaterialIcons name="auto-awesome" size={20} color={Colors.accent} />
            <Text style={styles.brand}>LumaBrief</Text>
          </View>
          <Button label="Sign in" onPress={goToSignIn} variant="ghost" compact />
        </View>

        <View style={[styles.hero, isWide && styles.heroWide]}>
          <Animated.View
            entering={FadeInDown.duration(600).reduceMotion(ReduceMotion.System)}
            style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
            <View style={styles.eyebrowPill}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowPillText}>Built for Luma event-goers</Text>
            </View>
            <Text
              role="heading"
              aria-level={1}
              style={[styles.headline, isWide && styles.headlineWide]}>
              Never lose <Text style={styles.headlineAccent}>what you learned</Text> at an event
              again.
            </Text>
            <Text style={styles.subheadline}>
              LumaBrief pulls in your Luma events, tracks the ones you actually attended, and turns
              your scattered notes into takeaways — and LinkedIn posts — worth sharing.
            </Text>
            <View style={styles.heroActions}>
              <Button label="Get started" onPress={goToSignIn} />
              <Pressable
                onPress={scrollToHowItWorks}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.textLink}>
                <Text style={styles.textLinkText}>See how it works</Text>
                <MaterialIcons name="arrow-downward" size={16} color={Colors.accent} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(700).reduceMotion(ReduceMotion.System)}
            style={[styles.heroVisual, isWide && styles.heroVisualWide]}>
            <AppPreview />
          </Animated.View>
        </View>

        <View
          style={styles.section}
          onLayout={(e) => {
            howItWorksY.current = e.nativeEvent.layout.y;
          }}>
          <SectionHeading eyebrow="How it works" title="From event to takeaway in three steps." />
          <View style={[styles.steps, isWide && styles.stepsWide]}>
            {STEPS.map((step, i) => (
              <View key={step.title} style={[styles.step, isWide && styles.stepWide]}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="AI takeaways"
            title="Scattered notes in. Something you can say out loud, out."
          />
          <View style={[styles.transform, isWide && styles.transformWide]}>
            <View style={[styles.rawCard, isWide && styles.rawCardWide]}>
              <Text style={styles.rawLabel}>What you typed</Text>
              <Text style={styles.rawText}>
                - agentic ai everywhere{'\n'}- token cost = real bottleneck{'\n'}- shadow ai — ppl
                using personal accts{'\n'}- pm role shifting, build w/ eng directly
              </Text>
            </View>
            <View style={styles.transformArrow}>
              <MaterialIcons
                name={isWide ? 'arrow-forward' : 'arrow-downward'}
                size={20}
                color={Colors.accent}
              />
            </View>
            <LinearGradient
              colors={[Colors.accent, StatusColors.went.bg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.briefCard, isWide && styles.briefCardWide]}>
              <Text style={styles.briefLabel}>What LumaBrief writes</Text>
              <Text style={styles.briefTheme}>Agentic AI</Text>
              <BriefBullet>
                Cost, not capability, is the real bottleneck — teams overuse frontier models where
                a smaller one would do.
              </BriefBullet>
              <BriefBullet>
                Shadow AI is the governance gap: people already run agents on personal accounts.
              </BriefBullet>
              <Text style={styles.briefTheme}>The PM role</Text>
              <BriefBullet>
                PMs who can build are collapsing the spec-to-engineering handoff.
              </BriefBullet>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.share, isWide && styles.shareWide]}>
            <View style={[styles.shareCopy, isWide && styles.shareCopyWide]}>
              <SectionHeading
                eyebrow="Share it"
                title="One click from private notes to a LinkedIn post."
              />
              <Text style={styles.shareBody}>
                Turn any event&apos;s Learnings into a short, first-person post worth sharing with
                your network — drafted for you, yours to edit, and posted without leaving the app.
              </Text>
              <View style={styles.flow}>
                <FlowChip icon="auto-awesome" label="Draft" />
                <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} />
                <FlowChip icon="edit" label="Edit" />
                <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} />
                <FlowChip icon="send" label="Post" />
              </View>
            </View>
            <View style={[styles.postPreview, isWide && styles.postPreviewTilt]}>
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

        <View style={styles.ctaWrap}>
          <LinearGradient
            colors={[Colors.accent, StatusColors.went.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaPanel}>
            <Text role="heading" aria-level={2} style={styles.ctaTitle}>
              Start building your own record.
            </Text>
            <Text style={styles.ctaBody}>
              Sign in with just your email — no password, and your first sync takes a minute.
            </Text>
            <Button label="Get started" onPress={goToSignIn} variant="light" />
          </LinearGradient>
        </View>

        <View style={styles.footer}>
          <View style={styles.brandRow}>
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

function Button({
  label,
  onPress,
  variant = 'primary',
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'light';
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(state) => {
        // `hovered` only exists on web (react-native-web) — absent on native.
        const hovered = (state as { hovered?: boolean }).hovered;
        return [
          styles.btn,
          compact && styles.btnCompact,
          variant === 'primary' && styles.btnPrimary,
          variant === 'ghost' && styles.btnGhost,
          variant === 'light' && styles.btnLight,
          hovered && styles.btnHover,
          state.pressed && styles.btnPressed,
        ];
      }}>
      <Text
        style={[
          styles.btnText,
          compact && styles.btnTextCompact,
          variant === 'primary' && styles.btnTextOnAccent,
          variant === 'ghost' && styles.btnTextGhost,
          variant === 'light' && styles.btnTextLight,
        ]}>
        {label}
      </Text>
      {variant !== 'ghost' ? (
        <MaterialIcons
          name="arrow-forward"
          size={18}
          color={variant === 'light' ? Colors.accent : Colors.surface}
        />
      ) : null}
    </Pressable>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  const { isWide } = useBreakpoint();
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text role="heading" aria-level={2} style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
        {title}
      </Text>
    </View>
  );
}

function BriefBullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.briefBulletRow}>
      <Text style={styles.briefBulletDot}>•</Text>
      <Text style={styles.briefBulletText}>{children}</Text>
    </View>
  );
}

function FlowChip({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  return (
    <View style={styles.flowChip}>
      <MaterialIcons name={icon} size={16} color={Colors.accent} />
      <Text style={styles.flowChipText}>{label}</Text>
    </View>
  );
}

// A stylized, static rendering of the real Dashboard (the "Did you go?"
// swipe card plus the calendar's status dots), built from the same design
// tokens as the app itself. Illustrative — the event is made up, and it's
// hidden from assistive tech since it's decoration, not content.
function AppPreview() {
  const weekDots: Record<number, string[]> = {
    1: [StatusColors.went.bg],
    3: [StatusColors.going.bg, StatusColors.going.bg],
    4: [StatusColors.going.bg],
  };
  return (
    <View
      style={styles.preview}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Did you go?</Text>
        <View style={styles.previewCount}>
          <Text style={styles.previewCountText}>3 to review</Text>
        </View>
      </View>

      <View style={styles.previewStack}>
        <View style={[styles.previewCard, styles.previewCardBack]} />
        <View style={styles.previewCard}>
          <View style={styles.previewCardBody}>
            <Text style={styles.previewEventTitle}>AI Builders Breakfast</Text>
            <Text style={styles.previewMeta}>Thu, Sep 17 · 8:00 AM</Text>
            <View style={styles.previewMetaRow}>
              <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
              <Text style={styles.previewMeta}>SoMa, San Francisco</Text>
            </View>
            <View style={styles.previewTopics}>
              {['AI', 'Agents'].map((topic) => (
                <View key={topic} style={styles.previewTopic}>
                  <Text style={styles.previewTopicText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.previewActions}>
            <View style={styles.previewAction}>
              <MaterialIcons name="close" size={22} color={Colors.danger} />
            </View>
            <View style={styles.previewAction}>
              <MaterialIcons name="check" size={22} color={StatusColors.going.bg} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.previewWeek}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <View key={`${day}-${i}`} style={styles.previewDay}>
            <Text style={styles.previewDayLabel}>{day}</Text>
            <View style={styles.previewDots}>
              {(weekDots[i] ?? []).map((color, j) => (
                <View key={j} style={[styles.previewDot, { backgroundColor: color }]} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const SHADOW_SOFT = '0 12px 32px -8px rgba(23, 24, 27, 0.12)';
const SHADOW_GLOW = '0 32px 64px -16px rgba(62, 95, 235, 0.32), 0 12px 24px -8px rgba(23, 24, 27, 0.10)';

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Transparent — GradientBackground sits behind this as a sibling, fixed
  // in place while this ScrollView's content scrolls over it.
  page: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    maxWidth: MaxWidth.wide,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontFamily: BrandFont.extrabold, fontSize: 18, color: Colors.text },

  // ---- Buttons ----
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: Radius.pill,
  },
  btnCompact: { paddingVertical: 8, paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: Colors.accent, boxShadow: '0 8px 20px -6px rgba(62, 95, 235, 0.6)' },
  btnGhost: { borderWidth: 1, borderColor: Colors.borderInput, backgroundColor: 'rgba(255,255,255,0.7)' },
  btnLight: { backgroundColor: Colors.surface, boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.35)' },
  btnHover: { transform: [{ translateY: -2 }] },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  btnText: { fontFamily: BrandFont.bold, fontSize: 16 },
  btnTextCompact: { fontSize: 14 },
  btnTextOnAccent: { color: Colors.surface },
  btnTextGhost: { color: Colors.text },
  btnTextLight: { color: Colors.accent },

  // ---- Hero ----
  hero: {
    maxWidth: MaxWidth.wide,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 56,
    gap: 48,
  },
  heroWide: { flexDirection: 'row', alignItems: 'center', paddingTop: 64, paddingBottom: 72 },
  heroCopy: { gap: 20, alignItems: 'flex-start' },
  heroCopyWide: { flex: 1 },
  heroVisual: { alignItems: 'center', width: '100%' },
  heroVisualWide: { flex: 1 },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: StatusColors.going.bg },
  eyebrowPillText: { fontFamily: BrandFont.semibold, fontSize: 13, color: Colors.text },
  headline: { fontFamily: BrandFont.extrabold, fontSize: 36, lineHeight: 42, color: Colors.text },
  headlineWide: { fontSize: 52, lineHeight: 58 },
  headlineAccent: { color: Colors.accent },
  subheadline: { fontFamily: BrandFont.regular, fontSize: 17, lineHeight: 27, color: Colors.textSecondary, maxWidth: 480 },
  heroActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginTop: 4 },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textLinkText: { fontFamily: BrandFont.semibold, fontSize: 15, color: Colors.accent },

  // ---- App preview (hero visual) ----
  preview: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 16,
    gap: 16,
    boxShadow: SHADOW_GLOW,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { fontFamily: BrandFont.bold, fontSize: 16, color: Colors.text },
  previewCount: { backgroundColor: Colors.accentTint, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  previewCountText: { fontFamily: BrandFont.semibold, fontSize: 12, color: Colors.accent },
  previewStack: { height: 214 },
  previewCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 196,
    backgroundColor: Colors.surface,
    borderRadius: Radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 16,
    justifyContent: 'space-between',
    boxShadow: SHADOW_SOFT,
  },
  previewCardBack: {
    top: 14,
    left: 10,
    right: 10,
    backgroundColor: Colors.accentTint,
    transform: [{ rotate: '2.5deg' }],
    boxShadow: 'none',
  },
  previewCardBody: { gap: 4 },
  previewEventTitle: { fontFamily: BrandFont.extrabold, fontSize: 19, color: Colors.text, marginBottom: 2 },
  previewMeta: { fontFamily: BrandFont.regular, fontSize: 13, color: Colors.textSecondary },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewTopics: { flexDirection: 'row', gap: 6, marginTop: 8 },
  previewTopic: { backgroundColor: Colors.accentTint, borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  previewTopicText: { fontFamily: BrandFont.semibold, fontSize: 12, color: Colors.accent },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  previewAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px -2px rgba(23, 24, 27, 0.18)',
  },
  previewWeek: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  previewDay: { alignItems: 'center', gap: 6, flex: 1 },
  previewDayLabel: { fontFamily: BrandFont.semibold, fontSize: 12, color: Colors.textSecondary },
  previewDots: { flexDirection: 'row', gap: 3, height: 7 },
  previewDot: { width: 7, height: 7, borderRadius: 3.5 },

  // ---- Sections ----
  section: {
    maxWidth: MaxWidth.wide,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
    gap: 32,
  },
  sectionHeading: { gap: 10 },
  eyebrow: { fontFamily: BrandFont.bold, fontSize: 12, letterSpacing: 1.2, color: Colors.accent, textTransform: 'uppercase' },
  sectionTitle: { fontFamily: BrandFont.extrabold, fontSize: 28, lineHeight: 34, color: Colors.text, maxWidth: 560 },
  sectionTitleWide: { fontSize: 34, lineHeight: 40 },

  steps: { gap: 32 },
  stepsWide: { flexDirection: 'row' },
  stepWide: { flex: 1 },
  step: { gap: 8, paddingTop: 16, borderTopWidth: 2, borderTopColor: Colors.border },
  stepNumber: { fontFamily: BrandFont.extrabold, fontSize: 44, lineHeight: 48, color: Colors.accent, opacity: 0.3 },
  stepTitle: { fontFamily: BrandFont.bold, fontSize: 19, color: Colors.text },
  stepBody: { fontFamily: BrandFont.regular, fontSize: 15, lineHeight: 24, color: Colors.textSecondary },

  // ---- Notes -> takeaways ----
  transform: { gap: 12, alignItems: 'center' },
  transformWide: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  rawCard: {
    width: '100%',
    backgroundColor: Colors.text,
    borderRadius: Radius.cardLarge,
    padding: 22,
    gap: 12,
    boxShadow: SHADOW_SOFT,
  },
  rawLabel: { fontFamily: BrandFont.bold, fontSize: 11, letterSpacing: 1, color: '#9A9EB5', textTransform: 'uppercase' },
  rawText: { fontFamily: Fonts.mono, fontSize: 13, lineHeight: 22, color: '#D6D9E6' },
  rawCardWide: { flex: 1 },
  briefCardWide: { flex: 1.15 },
  transformArrow: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOW_SOFT,
  },
  briefCard: {
    width: '100%',
    borderRadius: Radius.cardLarge,
    padding: 22,
    gap: 8,
    boxShadow: SHADOW_GLOW,
  },
  briefLabel: { fontFamily: BrandFont.bold, fontSize: 11, letterSpacing: 1, color: Colors.surface, textTransform: 'uppercase', marginBottom: 4 },
  briefTheme: { fontFamily: BrandFont.extrabold, fontSize: 15, color: Colors.surface, marginTop: 6 },
  briefBulletRow: { flexDirection: 'row', gap: 8 },
  briefBulletDot: { fontFamily: BrandFont.regular, fontSize: 14, lineHeight: 22, color: Colors.surface },
  briefBulletText: { flex: 1, fontFamily: BrandFont.regular, fontSize: 14, lineHeight: 22, color: Colors.surface },

  // ---- Share ----
  share: { gap: 40, alignItems: 'center' },
  shareWide: { flexDirection: 'row' },
  shareCopy: { gap: 16, width: '100%' },
  shareCopyWide: { flex: 1 },
  shareBody: { fontFamily: BrandFont.regular, fontSize: 16, lineHeight: 26, color: Colors.textSecondary, maxWidth: 460 },
  flow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  flowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  flowChipText: { fontFamily: BrandFont.semibold, fontSize: 14, color: Colors.text },
  postPreview: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.cardLarge,
    padding: 20,
    gap: 12,
    boxShadow: SHADOW_GLOW,
  },
  postPreviewTilt: { flex: 1, transform: [{ rotate: '-1.5deg' }] },
  postPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postPreviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPreviewName: { fontFamily: BrandFont.bold, fontSize: 14, color: Colors.text },
  postPreviewCaption: { fontFamily: BrandFont.regular, fontSize: 12, color: Colors.textSecondary },
  postPreviewBody: { fontFamily: BrandFont.regular, fontSize: 15, lineHeight: 23, color: Colors.text },
  postPreviewHashtags: { fontFamily: BrandFont.semibold, fontSize: 14, color: Colors.accent },

  // ---- Closing CTA ----
  ctaWrap: { maxWidth: MaxWidth.wide, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  ctaPanel: {
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
    boxShadow: SHADOW_GLOW,
  },
  ctaTitle: { fontFamily: BrandFont.extrabold, fontSize: 30, lineHeight: 36, color: Colors.surface, textAlign: 'center' },
  ctaBody: { fontFamily: BrandFont.regular, fontSize: 16, lineHeight: 24, color: Colors.surface, textAlign: 'center', maxWidth: 420, marginBottom: 6 },

  footer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  footerBrand: { fontFamily: BrandFont.bold, fontSize: 14, color: Colors.text },
  footerTagline: { fontFamily: BrandFont.regular, fontSize: 13, color: Colors.textSecondary },
  footerMeta: { fontFamily: BrandFont.regular, fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
});
