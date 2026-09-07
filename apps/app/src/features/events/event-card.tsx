import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatEventDateTime } from './format';
import type { Event } from './types';

// onPressDetails is optional so this card can be reused somewhere that
// isn't tappable-to-detail (there isn't one today, but keeps the component
// honest about what's actually required).
export function EventCard({ event, onPressDetails }: { event: Event; onPressDetails?: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>
      <Text style={styles.meta}>{formatEventDateTime(event.starts_at)}</Text>
      {event.location_name ? <Text style={styles.meta}>{event.location_name}</Text> : null}
      {event.description ? (
        <Text style={styles.description} numberOfLines={4}>
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
          <Text style={styles.detailsLinkText}>View details & add learnings →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'white',
    padding: 24,
    justifyContent: 'flex-end',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e8eb',
  },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, color: '#687076' },
  description: { fontSize: 14, color: '#3a3f42', marginTop: 8, lineHeight: 20 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  topicPill: { backgroundColor: '#e6f4fa', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  topicText: { fontSize: 12, color: '#0a7ea4', fontWeight: '600' },
  detailsLink: { marginTop: 12 },
  detailsLinkText: { fontSize: 13, fontWeight: '600', color: '#0a7ea4' },
});
