import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadow } from '@/constants/design';

type IconName = keyof typeof MaterialIcons.glyphMap;

// Shared building blocks for the signed-in screens, so Learnings, Settings
// and the event page all read as the same product as the Dashboard.

export function PageHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <Text role="heading" aria-level={1} style={styles.pageTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

// A framed surface. With `title`, gets a header row: tinted icon chip, title,
// and an optional right-aligned `badge` (e.g. connection status).
export function Card({
  title,
  icon,
  badge,
  children,
}: {
  title?: string;
  icon?: IconName;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.cardHeader}>
          {icon ? (
            <View style={styles.cardIcon}>
              <MaterialIcons name={icon} size={18} color={Colors.accent} />
            </View>
          ) : null}
          <Text role="heading" aria-level={2} style={styles.cardTitle}>
            {title}
          </Text>
          {badge ? <View style={styles.cardBadge}>{badge}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'neutral' }) {
  const success = tone === 'success';
  return (
    <View style={[styles.badge, success ? styles.badgeSuccess : styles.badgeNeutral]}>
      {success ? <MaterialIcons name="check" size={12} color={Colors.success} /> : null}
      <Text style={[styles.badgeText, { color: success ? Colors.success : Colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: IconName;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={(state) => {
        // `hovered` exists only on web (react-native-web).
        const hovered = (state as { hovered?: boolean }).hovered;
        return [
          styles.button,
          primary ? styles.buttonPrimary : styles.buttonSecondary,
          hovered && !disabled && styles.buttonHover,
          state.pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ];
      }}>
      {icon ? <MaterialIcons name={icon} size={16} color={primary ? Colors.surface : Colors.accent} /> : null}
      <Text style={[styles.buttonText, { color: primary ? Colors.surface : Colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  pageHeaderText: { flex: 1, gap: 4 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
    boxShadow: Shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },
  cardBadge: { marginLeft: 'auto' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeSuccess: { backgroundColor: '#EAF7F0' },
  badgeNeutral: { backgroundColor: Colors.surfaceMuted },
  badgeText: { fontSize: 12, fontWeight: '700' },

  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
  },
  buttonPrimary: { backgroundColor: Colors.accent, boxShadow: Shadow.accentGlow },
  buttonSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.accent },
  buttonHover: { transform: [{ translateY: -1 }] },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  buttonDisabled: { opacity: 0.5, boxShadow: 'none' },
  buttonText: { fontSize: 14, fontWeight: '700' },
});
