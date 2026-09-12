import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';

import { navItems } from './nav-items';

// Renders navItems as a persistent dark top bar on wide viewports (modeled
// on Luma's own header — see the reference screenshot), or a bottom tab bar
// on narrow ones — same config array either way, so adding a future page
// (per the PRD) is a one-line change to nav-items.ts, not a layout change
// here.
export function AdaptiveShell({ children }: PropsWithChildren) {
  const { isWide } = useBreakpoint();
  return (
    <View style={styles.root}>
      {isWide ? <TopBar /> : null}
      <View style={styles.content}>{children}</View>
      {isWide ? null : <BottomTabs />}
    </View>
  );
}

function NavLink({ item, variant }: { item: (typeof navItems)[number]; variant: 'topBar' | 'bottomTabs' }) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  const iconColor = isActive ? Colors.accent : Colors.textSecondary;

  return (
    <Pressable
      // replace, not push: these are top-level tab-like destinations, not a
      // drill-down hierarchy — pushing would grow the stack indefinitely as
      // someone clicks between Dashboard/Network/Settings, leaving a pile
      // of hidden mounted screens behind and requiring many browser-back
      // presses to actually leave the app.
      onPress={() => router.replace(item.href as never)}
      style={[
        variant === 'topBar' ? styles.topBarLink : styles.bottomTabLink,
        isActive && (variant === 'topBar' ? styles.topBarLinkActive : styles.bottomTabLinkActive),
      ]}>
      <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={variant === 'topBar' ? 20 : 22} color={iconColor} />
      <Text
        style={[
          variant === 'topBar' ? styles.topBarLabel : styles.bottomTabLabel,
          isActive && (variant === 'topBar' ? styles.topBarLabelActive : styles.bottomTabLabelActive),
        ]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function TopBar() {
  const { signOut } = useAuth();
  return (
    // A soft blue-to-white wash instead of a hard border line (see the
    // reference screenshot) — the bottom color matches Colors.surface so it
    // fades into the page content beneath with no visible seam.
    <LinearGradient
      colors={[Colors.navGradientTop, Colors.surface]}
      style={styles.topBar}>
      <View style={styles.topBarBrand}>
        <MaterialIcons name="auto-awesome" size={20} color={Colors.accent} />
        <Text style={styles.topBarBrandText}>Luma Brief</Text>
      </View>
      <View style={styles.topBarLinks}>
        {navItems.map((item) => (
          <NavLink key={item.key} item={item} variant="topBar" />
        ))}
      </View>
      <Pressable onPress={signOut} style={styles.topBarLink}>
        <MaterialIcons name="logout" size={20} color={Colors.textSecondary} />
        <Text style={styles.topBarLabel}>Sign out</Text>
      </Pressable>
    </LinearGradient>
  );
}

function BottomTabs() {
  const { signOut } = useAuth();
  return (
    <View style={styles.bottomTabs}>
      {navItems.map((item) => (
        <NavLink key={item.key} item={item} variant="bottomTabs" />
      ))}
      <Pressable onPress={signOut} style={styles.bottomTabLink}>
        <MaterialIcons name="logout" size={22} color={Colors.textSecondary} />
        <Text style={styles.bottomTabLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },

  // Wide layout — light top bar matching the rest of the app, brand left /
  // links center / sign-out right, per the Luma-style reference layout.
  // Background comes from the LinearGradient this style is applied to, not
  // a flat color — no border here, the gradient itself is the transition.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 20,
    gap: 24,
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarBrandText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  topBarLinks: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  topBarLinkActive: { backgroundColor: Colors.accentTint },
  topBarLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  topBarLabelActive: { color: Colors.accent },

  // Narrow layout — unchanged light bottom tab bar.
  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  bottomTabLink: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingVertical: 4, paddingHorizontal: 8 },
  bottomTabLinkActive: {},
  bottomTabLabel: { fontSize: 13, color: Colors.textSecondary },
  bottomTabLabelActive: { color: Colors.accent, fontWeight: '600' },
});
