import { MaterialIcons } from '@expo/vector-icons';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';
import { useBreakpoint } from '@/hooks/use-breakpoint';

import { formatConnectedOn } from './format';
import type { ConnectionWithEvent } from './types';

// Percentage widths shared by the header, filter, and body rows so columns
// line up — the LinkedIn column isn't part of the tanstack column model at
// all (see below) but still needs a slot in this same layout.
const COLUMN_WIDTHS: Record<string, number> = {
  full_name: 20,
  role: 16,
  company: 16,
  connected_on: 14,
  event_title: 22,
  linkedin: 12,
};

const columnHelper = createColumnHelper<ConnectionWithEvent>();

// LinkedIn Profile is deliberately not one of these — it has nothing to
// sort or filter, so it doesn't belong in the column model. It's rendered
// directly from row data as an appended visual column in both layouts
// (see LinkedInLink below).
const columns: ColumnDef<ConnectionWithEvent, any>[] = [
  columnHelper.accessor('full_name', {
    id: 'full_name',
    header: 'Name',
    cell: (info) => info.getValue(),
    filterFn: 'includesString',
  }),
  columnHelper.accessor((row) => row.role ?? '', {
    id: 'role',
    header: 'Role',
    cell: (info) => info.getValue() || '—',
    filterFn: 'includesString',
  }),
  columnHelper.accessor((row) => row.company ?? '', {
    id: 'company',
    header: 'Current Company',
    cell: (info) => info.getValue() || '—',
    filterFn: 'includesString',
  }),
  columnHelper.accessor('connected_on', {
    id: 'connected_on',
    header: 'Date Connected',
    cell: (info) => formatConnectedOn(info.getValue()),
    // Free-text filtering a formatted date ("Aug 24, 2026") isn't a very
    // usable interaction, so this column is sortable but not filterable —
    // sorting covers the real use case here.
    enableColumnFilter: false,
    enableGlobalFilter: false,
    // ISO YYYY-MM-DD strings sort correctly with plain lexicographic
    // compare (they're zero-padded in mock-data.ts) — pin 'text' rather
    // than the default sorter so that stays true regardless of future
    // value shapes.
    sortingFn: 'text',
  }),
  columnHelper.accessor('event_title', {
    id: 'event_title',
    header: 'Event Connected At',
    cell: (info) => info.getValue(),
    filterFn: 'includesString',
  }),
];

// Always exactly one sorted column, 2-state (asc/desc) rather than
// tanstack's default 3-state cycle that includes "unsorted" — the PRD's
// "initially sorted by Date Connected" implies a sort is the steady state,
// not an incidental mode, so there's always one active whichever column a
// user last touched.
function toggleSort(table: Table<ConnectionWithEvent>, columnId: string) {
  const current = table.getColumn(columnId)?.getIsSorted();
  table.setSorting([{ id: columnId, desc: current === 'asc' }]);
}

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  if (!state) return null;
  return <MaterialIcons name={state === 'asc' ? 'arrow-upward' : 'arrow-downward'} size={14} color={Colors.accent} />;
}

function LinkedInLink({ url }: { url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} hitSlop={8} accessibilityLabel="Open LinkedIn profile">
      <MaterialIcons name="open-in-new" size={18} color={Colors.accent} />
    </Pressable>
  );
}

function EmptyFiltered({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <View style={styles.emptyFiltered}>
      <Text style={styles.emptyFilteredText}>No connections match your {label}.</Text>
      <Pressable onPress={onClear}>
        <Text style={styles.clearLink}>Clear {label}</Text>
      </Pressable>
    </View>
  );
}

// One useReactTable instance shared by both layouts below — useBreakpoint()
// only picks which controls/renderer wrap the same underlying sorted +
// filtered rows, same branching pattern as calendar-view.tsx's wide/narrow
// split.
export function NetworkTable({ data }: { data: ConnectionWithEvent[] }) {
  const { isWide } = useBreakpoint();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'connected_on', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Wide uses per-column filters; narrow uses one search-all box. They're
  // independent tanstack states, so crossing the breakpoint could otherwise
  // leave an invisible filter silently active with no visible control to
  // clear it — reset whichever mechanism the current layout doesn't expose.
  useEffect(() => {
    if (isWide) setGlobalFilter('');
    else setColumnFilters([]);
  }, [isWide]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    getRowId: (row) => `${row.id}::${row.event_id}`,
    globalFilterFn: 'includesString',
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return isWide ? <WideTable table={table} /> : <NarrowList table={table} />;
}

function WideTable({ table }: { table: Table<ConnectionWithEvent> }) {
  const rows = table.getRowModel().rows;
  const headers = table.getHeaderGroups()[0].headers;

  return (
    <View style={styles.tableWide}>
      <View style={styles.headerRow}>
        {headers.map((header) => (
          <Pressable
            key={header.id}
            onPress={() => toggleSort(table, header.column.id)}
            style={[styles.headerCell, { flexBasis: `${COLUMN_WIDTHS[header.column.id]}%` }]}>
            <Text style={styles.headerText}>{flexRender(header.column.columnDef.header, header.getContext())}</Text>
            <SortIcon state={header.column.getIsSorted()} />
          </Pressable>
        ))}
        <View style={[styles.headerCell, { flexBasis: `${COLUMN_WIDTHS.linkedin}%` }]}>
          <Text style={styles.headerText}>LinkedIn</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {headers.map((header) => (
          <View key={header.id} style={[styles.filterCell, { flexBasis: `${COLUMN_WIDTHS[header.column.id]}%` }]}>
            {header.column.getCanFilter() ? (
              <TextInput
                value={(header.column.getFilterValue() as string) ?? ''}
                onChangeText={(text) => header.column.setFilterValue(text)}
                placeholder="Filter…"
                style={styles.filterInput}
              />
            ) : null}
          </View>
        ))}
        <View style={[styles.filterCell, { flexBasis: `${COLUMN_WIDTHS.linkedin}%` }]} />
      </View>

      {rows.length === 0 ? (
        <EmptyFiltered label="filters" onClear={() => table.resetColumnFilters()} />
      ) : (
        rows.map((row) => (
          <View key={row.id} style={styles.bodyRow}>
            {row.getVisibleCells().map((cell) => (
              <View key={cell.id} style={[styles.bodyCell, { flexBasis: `${COLUMN_WIDTHS[cell.column.id]}%` }]}>
                <Text style={styles.bodyText} numberOfLines={1}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Text>
              </View>
            ))}
            <View style={[styles.bodyCell, { flexBasis: `${COLUMN_WIDTHS.linkedin}%` }]}>
              <LinkedInLink url={row.original.linkedin_profile_url} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const SORT_CHIPS = [
  { id: 'connected_on', label: 'Date Connected' },
  { id: 'full_name', label: 'Name' },
  { id: 'company', label: 'Company' },
] as const;

function NarrowList({ table }: { table: Table<ConnectionWithEvent> }) {
  const rows = table.getRowModel().rows;

  return (
    <View style={styles.narrowContainer}>
      <TextInput
        value={(table.getState().globalFilter as string) ?? ''}
        onChangeText={(text) => table.setGlobalFilter(text)}
        placeholder="Search name, role, company, or event…"
        style={styles.searchInput}
      />
      <View style={styles.sortChips}>
        {SORT_CHIPS.map((chip) => {
          const sortState = table.getColumn(chip.id)?.getIsSorted() ?? false;
          return (
            <Pressable
              key={chip.id}
              onPress={() => toggleSort(table, chip.id)}
              style={[styles.chip, sortState && styles.chipActive]}>
              <Text style={[styles.chipText, sortState && styles.chipTextActive]}>{chip.label}</Text>
              {sortState ? (
                <MaterialIcons
                  name={sortState === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                  size={14}
                  color={sortState ? Colors.surface : Colors.textSecondary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {rows.length === 0 ? (
        <EmptyFiltered label="search" onClear={() => table.setGlobalFilter('')} />
      ) : (
        rows.map((row) => {
          const connection = row.original;
          return (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{connection.full_name}</Text>
                <LinkedInLink url={connection.linkedin_profile_url} />
              </View>
              <Text style={styles.cardMeta}>
                {[connection.role, connection.company].filter(Boolean).join(' @ ') || '—'}
              </Text>
              <Text style={styles.cardMeta}>{formatConnectedOn(connection.connected_on)}</Text>
              <Text style={styles.cardMeta}>{connection.event_title}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableWide: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerCell: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 10 },
  headerText: { fontSize: 12, fontWeight: '700', color: Colors.text, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  filterCell: { paddingHorizontal: 8, paddingVertical: 6 },
  filterInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  bodyCell: { paddingVertical: 10, paddingHorizontal: 10 },
  bodyText: { fontSize: 14, color: Colors.text },

  narrowContainer: { gap: 12 },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderInput,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sortChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceMuted,
  },
  chipActive: { backgroundColor: Colors.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.surface },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 14,
    gap: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 13, color: Colors.textSecondary },

  emptyFiltered: { padding: 24, alignItems: 'center', gap: 8 },
  emptyFilteredText: { color: Colors.textSecondary },
  clearLink: { color: Colors.accent, fontWeight: '600' },
});
