import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';

import { formatEventDateTime } from './format';
import type { Event } from './types';

// onPressDetails is optional so this card can be reused somewhere that
// isn't tappable-to-detail (there isn't one today, but keeps the component
// honest about what's actually required).
export function EventCard({ event, onPressDetails }: { event: Event; onPressDetails?: () => void }) {
  return (
    <View style={styles.card}>
      {/* Soft tint fading down from the top edge. Lives in its own clipped
          view (rather than overflow:hidden on the card) so the card's shadow
          isn't clipped on iOS. */}
      <View style={styles.tintClip} pointerEvents="none">
        <LinearGradient colors={[Colors.accentTint, 'rgba(234,238,255,0)']} style={styles.tint} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>
      <View style={styles.metaRow}>
        <MaterialIcons name="event" size={15} color={Colors.textSecondary} />
        <Text style={styles.meta}>{formatEventDateTime(event.starts_at)}</Text>
      </View>
      {event.location_name ? (
        <View style={styles.metaRow}>
          <MaterialIcons name="place" size={15} color={Colors.textSecondary} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.location_name}
          </Text>
        </View>
      ) : null}
      {event.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {event.description}
        </Text>
      ) : null}
      {event.topics.length > 0 ? (
        <View style={styles.topics}>
          {event.topics.map((topic) => (
            <View key={topic} style={styles.topicPill}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {onPressDetails ? (
        // A separate tappable affordance rather than making the whole card
        // pressable — the card body is already a drag surface for the swipe
        // gesture, and mixing tap + pan recognizers on the same area is more
        // fragile than one small dedicated hit target.
        <Pressable onPress={onPressDetails} hitSlop={8} style={styles.detailsLink}>
          <Text style={styles.detailsLinkText}>View details & add learnings</Text>
          <MaterialIcons name="arrow-forward" size={14} color={Colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.cardLarge,
    backgroundColor: Colors.surface,
    padding: 24,
    justifyContent: 'flex-end',
    gap: 8,
    boxShadow: '0 16px 32px -12px rgba(23, 24, 27, 0.18), 0 2px 6px rgba(23, 24, 27, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tintClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    borderTopLeftRadius: Radius.cardLarge,
    borderTopRightRadius: Radius.cardLarge,
    overflow: 'hidden',
  },
  tint: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, lineHeight: 27 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexShrink: 1, fontSize: 14, color: Colors.textSecondary },
  description: { fontSize: 14, color: Colors.text, marginTop: 8, lineHeight: 20 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  topicPill: { backgroundColor: Colors.accentTint, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  topicText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  detailsLink: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsLinkText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
});
