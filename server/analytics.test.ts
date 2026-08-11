import { describe, expect, it } from "vitest";
import { analyzeRows, buildForecast, calculateInsightDrafts, type DataRow } from "./analytics";

describe("dataset analytics", () => {
  const rows: DataRow[] = [
    { Month: "2026-01", Region: "North", Revenue: 100 },
    { Month: "2026-02", Region: "South", Revenue: 120 },
    { Month: "2026-03", Region: "North", Revenue: 140 },
    { Month: "2026-04", Region: "South", Revenue: 160 },
  ];

  it("detects numeric, categorical, and date fields and prepares chart data", () => {
    const analysis = analyzeRows(rows);
    expect(analysis.columns).toEqual(["Month", "Region", "Revenue"]);
    expect(analysis.numericColumns[0]?.column).toBe("Revenue");
    expect(analysis.dateColumns).toContain("Month");
    expect(analysis.categoricalColumns).toContain("Region");
    expect(analysis.chartData.bar.data).toHaveLength(4);
    expect(analysis.chartData.pie.data).toEqual(expect.arrayContaining([{ name: "North", value: 240 }]));
  });

  it("surfaces a calculated performance finding", () => {
    const insights = calculateInsightDrafts(rows);
    expect(insights.some(item => item.category === "Performance")).toBe(true);
    expect(insights.some(item => item.summary.includes("130"))).toBe(true);
  });

  it("projects a directional future value from historical observations", () => {
    const forecast = buildForecast(rows, "Month", "Revenue", 3);
    expect(forecast.direction).toBe("upward");
    expect(forecast.points).toHaveLength(7);
    expect(forecast.projectedValue).toBeGreaterThan(forecast.lastValue);
  });
});
