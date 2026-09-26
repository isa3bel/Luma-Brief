import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, StatusColors } from '@/constants/design';

import { EventCard } from './event-card';
import type { Event, EventStatus } from './types';

const SWIPE_THRESHOLD = 120;

// Renders the top of the deck as a draggable card (per the PRD: swipe right
// = Went, swipe left = Did Not Go) plus the same two actions as tap targets
// pinned to the card's top corners, since the PRD's primary spec is
// corner buttons that *trigger* the dating-app-style swipe animation —
// dragging is a bonus, not a replacement for it.
function SwipeCard({
  event,
  onResolved,
  isTop,
  depth,
}: {
  event: Event;
  onResolved: (id: string, status: EventStatus) => void;
  isTop: boolean;
  depth: number; // 0 = top card, 1 = next, 2 = the one behind that
}) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Cards behind the top one sit slightly smaller and lower, easing forward
  // when the card in front is resolved — gives the stack depth instead of
  // three identical rectangles overlapping.
  const depthValue = useSharedValue(depth);
  useEffect(() => {
    depthValue.value = withTiming(depth, { duration: 220 });
  }, [depth, depthValue]);
  const depthStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: depthValue.value * 18 }, { scale: 1 - depthValue.value * 0.045 }],
  }));

  const finishSwipe = useCallback(
    (status: EventStatus) => onResolved(event.id, status),
    [event.id, onResolved]
  );

  const flingOffscreen = (direction: 'went' | 'did_not_go') => {
    'worklet';
    const toX = direction === 'went' ? width * 1.5 : -width * 1.5;
    translateX.value = withTiming(toX, { duration: 250 }, (finished) => {
      if (finished) runOnJS(finishSwipe)(direction);
    });
  };

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        flingOffscreen('went');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        flingOffscreen('did_not_go');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-12, 0, 12]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const wentBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));
  const skippedBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  return (
    <Animated.View style={[styles.cardWrapper, depthStyle]} pointerEvents={isTop ? 'auto' : 'none'}>
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        <EventCard
          event={event}
          onPressDetails={isTop ? () => router.push(`/dashboard/${event.id}`) : undefined}
        />
        <Animated.View style={[styles.badge, styles.wentBadge, wentBadgeStyle]}>
          <Text style={styles.badgeText}>WENT</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.skippedBadge, skippedBadgeStyle]}>
          <Text style={styles.badgeText}>DID NOT GO</Text>
        </Animated.View>
        {isTop ? (
          <>
            <Pressable
              onPress={() => flingOffscreen('did_not_go')}
              style={[styles.cornerButton, styles.cornerButtonLeft]}
              accessibilityLabel="Did not go">
              <MaterialIcons name="close" size={22} color={Colors.danger} />
            </Pressable>
            <Pressable
              onPress={() => flingOffscreen('went')}
              style={[styles.cornerButton, styles.cornerButtonRight]}
              accessibilityLabel="Went">
              <MaterialIcons name="check" size={22} color={StatusColors.going.bg} />
            </Pressable>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
    </Animated.View>
  );
}

export function SwipeDeck({
  events,
  onSwipe,
}: {
  events: Event[];
  onSwipe: (id: string, status: EventStatus) => void;
}) {
  if (events.length === 0) return null;

  // Only render the top couple of cards — deeper ones would never be seen
  // before being resolved, and skipping them keeps the gesture handler
  // count small.
  const visible = events.slice(0, 3);

  return (
    <View style={styles.deck}>
      {visible
        .slice()
        .reverse()
        .map((event, indexFromBack) => (
          <SwipeCard
            key={event.id}
            event={event}
            onResolved={onSwipe}
            isTop={indexFromBack === visible.length - 1}
            depth={visible.length - 1 - indexFromBack}
          />
        ))}
    </View>
  );
}

// Extra bottom margin leaves room for the cards stacked behind the top one
// (each sits 18px lower).
const DECK_HEIGHT = 320;

const styles = StyleSheet.create({
  deck: { height: DECK_HEIGHT, marginBottom: 28 },
  cardWrapper: { ...StyleSheet.absoluteFill },
  // top: 68, not up at the same 12-52px band the corner buttons occupy —
  // the badge's own rotation (±12deg) pushes its rendered bounding box out
  // wider than its literal top/left anchor suggests, so at the buttons'
  // old top:20 it visibly collided with (and covered) the corner X/check
  // circles rather than just sitting near them.
  badge: {
    position: 'absolute',
    top: 68,
    borderWidth: 3,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  wentBadge: { left: 20, borderColor: StatusColors.going.bg, transform: [{ rotate: '-12deg' }] },
  skippedBadge: { right: 20, borderColor: Colors.danger, transform: [{ rotate: '12deg' }] },
  badgeText: { fontWeight: '800', fontSize: 16 },
  cornerButton: {
    position: 'absolute',
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px -2px rgba(23, 24, 27, 0.2)',
  },
  cornerButtonLeft: { left: 12 },
  cornerButtonRight: { right: 12 },
});

export { DECK_HEIGHT };
