import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';

import { navItems } from './nav-items';

// Renders navItems as a persistent side rail on wide viewports, or a bottom
// tab bar on narrow ones — same config array either way, so adding a future
// page (per the PRD) is a one-line change to nav-items.ts, not a layout
// change here.
export function AdaptiveShell({ children }: PropsWithChildren) {
  const { isWide } = useBreakpoint();
  return (
    <View style={[styles.root, { flexDirection: isWide ? 'row' : 'column' }]}>
      {isWide ? <SideRail /> : null}
      <View style={styles.content}>{children}</View>
      {isWide ? null : <BottomTabs />}
    </View>
  );
}

function NavLink({ item, direction }: { item: (typeof navItems)[number]; direction: 'row' | 'column' }) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      style={[styles.navLink, direction === 'row' && styles.navLinkRow, isActive && styles.navLinkActive]}>
      <MaterialIcons
        name={item.icon as keyof typeof MaterialIcons.glyphMap}
        size={22}
        color={isActive ? '#0a7ea4' : '#687076'}
      />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
    </Pressable>
  );
}

function SideRail() {
  const { signOut } = useAuth();
  return (
    <View style={styles.sideRail}>
      <Text style={styles.brand}>Tech Event Dashboard</Text>
      <View style={styles.sideRailLinks}>
        {navItems.map((item) => (
          <NavLink key={item.key} item={item} direction="column" />
        ))}
      </View>
      <Pressable onPress={signOut} style={styles.navLink}>
        <MaterialIcons name="logout" size={22} color="#687076" />
        <Text style={styles.navLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function BottomTabs() {
  const { signOut } = useAuth();
  return (
    <View style={styles.bottomTabs}>
      {navItems.map((item) => (
        <NavLink key={item.key} item={item} direction="row" />
      ))}
      <Pressable onPress={signOut} style={styles.navLinkRow}>
        <MaterialIcons name="logout" size={22} color="#687076" />
        <Text style={styles.navLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  sideRail: {
    width: 220,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e6e8eb',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sideRailLinks: { gap: 4 },
  brand: { fontSize: 16, fontWeight: '600', marginBottom: 24 },
  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e8eb',
  },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  navLinkRow: { flexDirection: 'column', alignItems: 'center', gap: 2 },
  navLinkActive: { backgroundColor: '#e6f4fa' },
  navLabel: { fontSize: 13, color: '#687076' },
  navLabelActive: { color: '#0a7ea4', fontWeight: '600' },
});
