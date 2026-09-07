// Small formatting helpers kept local rather than pulling in a date library
// for a handful of call sites — revisit if formatting needs grow.
export function formatEventDateTime(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatMonthLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
