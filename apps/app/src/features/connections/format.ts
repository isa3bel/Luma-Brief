// Small local date formatting, mirroring features/events/format.ts's
// philosophy of no date library. `connected_on` is a plain YYYY-MM-DD date
// string with no time component, so this is parsed by hand rather than via
// `new Date(dateOnlyString)` — the latter is treated as UTC midnight by JS
// and can render as the previous day once read back through local getters
// in a negative-UTC-offset timezone.
export function formatConnectedOn(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
