import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, StatusColors, StatusLabel } from '@/constants/design';
import { useBreakpoint } from '@/hooks/use-breakpoint';

import { formatEventDateTime } from './format';
import type { Event, EventStatus } from './types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Rows visible directly in a wide-layout cell before it collapses to
// "+N more" — matches roughly what Apple/Google Calendar fit at this cell
// height without needing to measure text.
const MAX_VISIBLE_ROWS = 3;

// Only the statuses this calendar ever actually renders (see
// CALENDAR_STATUSES in dashboard/index.tsx) — a Partial view onto the full
// StatusColors/StatusLabel maps in @/constants/design.
const DOT_COLOR: Partial<Record<EventStatus, string>> = {
  went: StatusColors.went.bg,
  going: StatusColors.going.bg,
  pending: StatusColors.pending.bg,
};

// Shared between the day picker modal and search results below — same row
// shape, two different lists it can appear in.
function EventRow({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <Pressable style={styles.modalRow} onPress={onPress}>
      <View style={styles.modalRowMain}>
        <Text style={styles.modalRowTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.modalRowMeta}>{formatEventDateTime(event.starts_at)}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: DOT_COLOR[event.status] ?? Colors.textSecondary }]}>
        <Text style={styles.statusPillText}>{StatusLabel[event.status] ?? event.status}</Text>
      </View>
    </Pressable>
  );
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// A month grid always lands on full weeks — from the Sunday on/before the
// 1st through the Saturday on/after the last day of the month — so the
// leading/trailing days from adjacent months fill out the rows instead of
// leaving ragged edges.
function getMonthGridDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const gridEnd = new Date(year, month, lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const days: Date[] = [];
  for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

// Renders past ("went") and future ("going"/"pending") events on the day
// they fall on. Wide screens get Apple/Google-Calendar-style rows (colored
// bar + truncated title) directly in the cell, each tappable straight to
// its detail+Learnings screen; a cell's overflow beyond MAX_VISIBLE_ROWS
// collapses to a "+N more" row that opens a picker with the full list.
// Narrow/mobile cells are too thin for readable title text (~50px wide on
// a phone), so those fall back to plain colored dots, and any day with
// events opens the same picker on tap.
export function CalendarView({ events }: { events: Event[] }) {
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dayPicker, setDayPicker] = useState<{ label: string; events: Event[] } | null>(null);
  const [query, setQuery] = useState('');

  // Matches title or description (the event's own body text from Luma —
  // not Learnings, which already has its own search surface via the
  // monthly summary). Non-null only while there's an actual query, so it
  // doubles as the "are we in search mode" flag below. Sorted most-recent
  // first — a description search is usually "what was that thing I went
  // to about X", and recent events are the likeliest hit.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return events
      .filter((event) => event.title.toLowerCase().includes(q) || (event.description ?? '').toLowerCase().includes(q))
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  }, [events, query]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.starts_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const days = useMemo(() => getMonthGridDays(monthDate), [monthDate]);
  const todayKey = dateKey(new Date());
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const goToMonth = (delta: number) =>
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const openDayPicker = (date: Date, dayEvents: Event[]) => {
    setDayPicker({
      label: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
      events: dayEvents,
    });
  };

  // Narrow layout: any tap on a day with events opens the picker, since
  // there's no per-event row to tap directly.
  const openDayNarrow = (date: Date, dayEvents: Event[]) => {
    if (dayEvents.length === 0) return;
    if (dayEvents.length === 1) {
      router.push(`/dashboard/${dayEvents[0].id}`);
      return;
    }
    openDayPicker(date, dayEvents);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search events by title or description…"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {searchResults ? (
        searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((event) => (
              <EventRow key={event.id} event={event} onPress={() => router.push(`/dashboard/${event.id}`)} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptySearchText}>No events match &quot;{query.trim()}&quot;.</Text>
        )
      ) : (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => goToMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
              <MaterialIcons name="chevron-left" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => goToMonth(1)} hitSlop={8} accessibilityLabel="Next month">
              <MaterialIcons name="chevron-right" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((date) => {
              const key = dateKey(date);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isCurrentMonth = date.getMonth() === monthDate.getMonth();
              const isToday = key === todayKey;
              const dayNumber = (
                <Text
                  style={[
                    styles.dayNumber,
                    !isCurrentMonth && styles.dayNumberMuted,
                    isToday && styles.dayNumberToday,
                  ]}>
                  {date.getDate()}
                </Text>
              );

              if (!isWide) {
                return (
                  <Pressable
                    key={key}
                    onPress={() => openDayNarrow(date, dayEvents)}
                    disabled={dayEvents.length === 0}
                    style={styles.cellNarrow}>
                    {dayNumber}
                    {dayEvents.length > 0 ? (
                      <View style={styles.dots}>
                        {dayEvents.slice(0, 3).map((event) => (
                          <View
                            key={event.id}
                            style={[styles.dot, { backgroundColor: DOT_COLOR[event.status] ?? Colors.textSecondary }]}
                          />
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              }

              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_ROWS);
              const overflowCount = dayEvents.length - visibleEvents.length;

              return (
                <View key={key} style={styles.cellWide}>
                  <View style={styles.cellWideHeader}>{dayNumber}</View>
                  <View style={styles.eventRows}>
                    {visibleEvents.map((event) => (
                      <Pressable
                        key={event.id}
                        onPress={() => router.push(`/dashboard/${event.id}`)}
                        style={({ pressed }) => [styles.eventRow, pressed && styles.eventRowPressed]}>
                        <View
                          style={[styles.eventBar, { backgroundColor: DOT_COLOR[event.status] ?? Colors.textSecondary }]}
                        />
                        <Text style={styles.eventRowText} numberOfLines={1}>
                          {event.title}
                        </Text>
                      </Pressable>
                    ))}
                    {overflowCount > 0 ? (
                      <Pressable onPress={() => openDayPicker(date, dayEvents)} style={styles.moreRow}>
                        <Text style={styles.moreRowText}>+{overflowCount} more</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            {(['went', 'going', 'pending'] as const).map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: DOT_COLOR[status] }]} />
                <Text style={styles.legendLabel}>{StatusLabel[status]}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {dayPicker ? (
        // Unmounted entirely (rather than an always-mounted <Modal
        // visible={...}>) so navigating away — which sets dayPicker back to
        // null — removes the overlay immediately instead of depending on
        // Modal's own show/hide transition, which on web left a stale empty
        // backdrop behind when a row's onPress fired setDayPicker(null) and
        // router.push in the same tick.
        <Modal transparent animationType="fade" onRequestClose={() => setDayPicker(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDayPicker(null)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{dayPicker.label}</Text>
              <ScrollView>
                {dayPicker.events.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onPress={() => {
                      setDayPicker(null);
                      router.push(`/dashboard/${event.id}`);
                    }}
                  />
                ))}
              </ScrollView>
              <Pressable onPress={() => setDayPicker(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  searchResults: { gap: 2 },
  emptySearchText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  monthLabel: { fontSize: 16, fontWeight: '700', minWidth: 160, textAlign: 'center', color: Colors.text },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    flexBasis: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  // Narrow (mobile) layout — compact square cells, dots only.
  cellNarrow: {
    flexBasis: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Wide (desktop/tablet) layout — Apple/Google-Calendar-style rows.
  cellWide: {
    flexBasis: `${100 / 7}%`,
    minHeight: 112,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cellWideHeader: { alignItems: 'flex-end', paddingRight: 6, paddingBottom: 2 },
  eventRows: { gap: 1 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  eventRowPressed: { backgroundColor: Colors.accentTint },
  eventBar: { width: 3, height: 12, borderRadius: 2 },
  eventRowText: { flex: 1, fontSize: 11, color: Colors.text },
  moreRow: { paddingHorizontal: 4, paddingVertical: 1 },
  moreRowText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },

  dayNumber: { fontSize: 13, color: Colors.text, minWidth: 20, textAlign: 'center' },
  dayNumberMuted: { color: Colors.textTertiary },
  dayNumberToday: {
    color: Colors.surface,
    backgroundColor: Colors.accent,
    fontWeight: '700',
    width: 22,
    height: 22,
    lineHeight: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },

  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLabel: { fontSize: 12, color: Colors.textSecondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalRowMain: { flex: 1, gap: 2 },
  modalRowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  modalRowMeta: { fontSize: 13, color: Colors.textSecondary },
  statusPill: { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  statusPillText: { fontSize: 12, fontWeight: '700', color: Colors.surface },
  modalClose: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  modalCloseText: { color: Colors.accent, fontWeight: '600' },
});
