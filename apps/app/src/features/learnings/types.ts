// Mirrors the `monthly_summaries` table (supabase/migrations/0002_monthly_summaries.sql).
export type MonthlySummary = {
  month: string; // 'YYYY-MM'
  summary: string;
  sourceEventIds: string[];
  model?: string; // undefined in mock mode — see use-monthly-summary.ts
  generatedAt: string; // ISO timestamp
};
