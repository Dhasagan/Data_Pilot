import * as XLSX from "xlsx";

export type DataRow = Record<string, string | number | null>;

type NumericSummary = {
  column: string;
  count: number;
  min: number;
  max: number;
  average: number;
  sum: number;
};

export type DatasetAnalysis = {
  columns: string[];
  rows: DataRow[];
  rowCount: number;
  columnCount: number;
  numericColumns: NumericSummary[];
  categoricalColumns: string[];
  dateColumns: string[];
  missingByColumn: Array<{ column: string; missing: number; rate: number }>;
  chartData: {
    bar: { categoryKey: string; valueKey: string; data: DataRow[] };
    line: { xKey: string; yKey: string; data: DataRow[] };
    pie: { nameKey: string; valueKey: string; data: Array<{ name: string; value: number }> };
  };
};

function cleanValue(value: unknown): string | number | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return String(value);
}

export function parseDataset(buffer: Buffer): DataRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[firstSheet],
    { defval: null, raw: true }
  );
  return rawRows.map(row =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim() || "Column", cleanValue(value)]))
  );
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isDateLike(column: string, values: unknown[]) {
  const lower = column.toLowerCase();
  if (/(date|time|month|year|week)/.test(lower)) return true;
  const nonEmpty = values.filter(value => value !== null && value !== "").slice(0, 20);
  if (nonEmpty.length < 3) return false;
  return nonEmpty.filter(value => typeof value === "string" && !Number.isNaN(Date.parse(value))).length / nonEmpty.length > 0.7;
}

export function analyzeRows(rows: DataRow[]): DatasetAnalysis {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const numericColumns = columns.flatMap(column => {
    const values = rows.map(row => asNumber(row[column])).filter((value): value is number => value !== null);
    if (values.length < 2 || values.length / Math.max(rows.length, 1) < 0.5) return [];
    const sum = values.reduce((total, value) => total + value, 0);
    return [{ column, count: values.length, min: Math.min(...values), max: Math.max(...values), average: sum / values.length, sum }];
  });
  const dateColumns = columns.filter(column => isDateLike(column, rows.map(row => row[column])));
  const categoricalColumns = columns.filter(column => !numericColumns.some(item => item.column === column) && !dateColumns.includes(column));
  const missingByColumn = columns.map(column => {
    const missing = rows.filter(row => row[column] === null || row[column] === undefined || row[column] === "").length;
    return { column, missing, rate: rows.length ? missing / rows.length : 0 };
  });

  const categoryKey = categoricalColumns[0] ?? columns[0] ?? "category";
  const valueKey = numericColumns[0]?.column ?? columns[1] ?? columns[0] ?? "value";
  const xKey = dateColumns[0] ?? columns[0] ?? "x";
  const yKey = numericColumns[0]?.column ?? columns[1] ?? columns[0] ?? "y";
  const barData = rows.slice(0, 12).map(row => ({
    [categoryKey]: String(row[categoryKey] ?? "Unknown"),
    [valueKey]: asNumber(row[valueKey]) ?? 0,
  }));
  const lineData = rows.slice(0, 30).map((row, index) => ({
    [xKey]: String(row[xKey] ?? index + 1),
    [yKey]: asNumber(row[yKey]) ?? 0,
  }));
  const pieGroups = new Map<string, number>();
  rows.forEach(row => {
    const key = String(row[categoryKey] ?? "Unknown");
    pieGroups.set(key, (pieGroups.get(key) ?? 0) + (asNumber(row[valueKey]) ?? 0));
  });
  const pieData = Array.from(pieGroups.entries()).slice(0, 8).map(([name, value]) => ({ name, value }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    columnCount: columns.length,
    numericColumns,
    categoricalColumns,
    dateColumns,
    missingByColumn,
    chartData: {
      bar: { categoryKey, valueKey, data: barData },
      line: { xKey, yKey, data: lineData },
      pie: { nameKey: "name", valueKey: "value", data: pieData },
    },
  };
}

export function buildDatasetContext(rows: DataRow[], analysis = analyzeRows(rows)) {
  return JSON.stringify({
    rowCount: analysis.rowCount,
    columns: analysis.columns,
    numericColumns: analysis.numericColumns,
    missingByColumn: analysis.missingByColumn,
    sampleRows: rows.slice(0, 40),
  });
}

export type InsightDraft = {
  title: string;
  category: string;
  severity: string;
  summary: string;
  metric?: string;
};

export function calculateInsightDrafts(rows: DataRow[], analysis = analyzeRows(rows)): InsightDraft[] {
  const drafts: InsightDraft[] = [];
  const missing = analysis.missingByColumn.filter(item => item.rate > 0);
  if (missing.length) {
    const mostIncomplete = [...missing].sort((a, b) => b.rate - a.rate)[0];
    drafts.push({
      title: "Data quality watch",
      category: "Quality",
      severity: mostIncomplete.rate > 0.2 ? "attention" : "monitor",
      summary: `${mostIncomplete.column} contains ${Math.round(mostIncomplete.rate * 100)}% missing values. Consider validating or imputing this field before making decisions.`,
      metric: `${mostIncomplete.missing} missing rows`,
    });
  }
  const topMetric = analysis.numericColumns[0];
  if (topMetric) {
    drafts.push({
      title: `${topMetric.column} baseline`,
      category: "Performance",
      severity: "positive",
      summary: `The average ${topMetric.column} is ${topMetric.average.toLocaleString(undefined, { maximumFractionDigits: 2 })}, with observed values ranging from ${topMetric.min.toLocaleString()} to ${topMetric.max.toLocaleString()}.`,
      metric: `Sum ${topMetric.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    });
    if (rows.length >= 6) {
      const values = rows.map(row => asNumber(row[topMetric.column])).filter((value): value is number => value !== null);
      const midpoint = Math.floor(values.length / 2);
      const firstAvg = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / Math.max(midpoint, 1);
      const secondAvg = values.slice(midpoint).reduce((a, b) => a + b, 0) / Math.max(values.length - midpoint, 1);
      const change = firstAvg ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;
      drafts.push({
        title: change >= 0 ? "Positive direction" : "Momentum is softening",
        category: "Trend",
        severity: change >= 0 ? "positive" : "attention",
        summary: `${topMetric.column} moved ${Math.abs(change).toFixed(1)}% between the first and second halves of the dataset, suggesting ${change >= 0 ? "an improving direction" : "a need to investigate recent softness"}.`,
        metric: `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}% half-over-half`,
      });
    }
  }
  return drafts.slice(0, 4);
}

export function buildForecast(rows: DataRow[], dateColumn: string, targetColumn: string, horizon: number) {
  const points = rows.map((row, index) => ({
    index,
    label: String(row[dateColumn] ?? index + 1),
    value: asNumber(row[targetColumn]),
  })).filter(point => point.value !== null) as Array<{ index: number; label: string; value: number }>;
  if (points.length < 3) throw new Error("Forecasting requires at least three numeric observations.");
  const n = points.length;
  const xMean = (n - 1) / 2;
  const yMean = points.reduce((sum, point) => sum + point.value, 0) / n;
  const numerator = points.reduce((sum, point) => sum + (point.index - xMean) * (point.value - yMean), 0);
  const denominator = points.reduce((sum, point) => sum + (point.index - xMean) ** 2, 0) || 1;
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  const historical = points.slice(-30).map(point => ({ period: point.label, actual: Number(point.value.toFixed(2)), forecast: null as number | null }));
  const future = Array.from({ length: Math.max(1, Math.min(horizon, 24)) }, (_, offset) => ({
    period: `Future ${offset + 1}`,
    actual: null as number | null,
    forecast: Number((intercept + slope * (n + offset)).toFixed(2)),
  }));
  return {
    points: [...historical, ...future],
    slope,
    direction: slope > 0.01 ? "upward" : slope < -0.01 ? "downward" : "stable",
    lastValue: points[points.length - 1].value,
    projectedValue: future[future.length - 1].forecast,
    observations: n,
  };
}
