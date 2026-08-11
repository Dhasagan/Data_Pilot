import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { storagePut } from "./storage";
import {
  addMessage,
  ensureConversation,
  getConversationForUser,
  getDatasetForUser,
  getReportForUser,
  insertAnalysis,
  insertDataset,
  insertDatasetRows,
  insertForecast,
  insertReport,
  listDatasets,
  listDatasetRowsForUser,
  listInsights,
  listMessages,
  listReports,
  replaceInsights,
  deleteDatasetForUser,
} from "./db";
import {
  analyzeRows,
  buildDatasetContext,
  buildForecast,
  calculateInsightDrafts,
  parseDataset,
  type DataRow,
} from "./analytics";
import { reports } from "../drizzle/schema";
import { systemRouter } from "./_core/systemRouter";

const idInput = z.object({ datasetId: z.number().int().positive() });
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function parseStoredRows(dataJson: string): DataRow[] {
  try {
    const parsed = JSON.parse(dataJson);
    return Array.isArray(parsed) ? parsed as DataRow[] : [];
  } catch {
    return [];
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

function extractText(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter(part => part.type === "text").map(part => part.text).join("\n");
  return "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [datasetRows, reportRows] = await Promise.all([listDatasets(ctx.user.id), listReports(ctx.user.id)]);
      return {
        datasets: datasetRows,
        totalDatasets: datasetRows.length,
        totalRows: datasetRows.reduce((sum, dataset) => sum + dataset.rowCount, 0),
        totalAnalyses: datasetRows.length,
        totalReports: reportRows.length,
        recentReports: reportRows.slice(0, 3),
      };
    }),
  }),

  datasets: router({
    list: protectedProcedure.query(({ ctx }) => listDatasets(ctx.user.id)),
    get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      return dataset;
    }),
    rows: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const rows = await listDatasetRowsForUser(ctx.user.id, input.datasetId);
      return rows.map(row => JSON.parse(row.dataJson) as DataRow);
    }),
    upload: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string().min(1).max(160),
      contentBase64: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.contentBase64, "base64");
      if (buffer.length > MAX_UPLOAD_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Please upload a file smaller than 12 MB." });
      const extension = input.fileName.toLowerCase().split(".").pop();
      if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only CSV and Excel files are supported." });
      }
      let rows: DataRow[];
      try {
        rows = parseDataset(buffer);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The dataset could not be parsed. Please check the file format." });
      }
      if (!rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The uploaded dataset is empty." });
      const analysis = analyzeRows(rows);
      const storage = await storagePut(`${ctx.user.id}/datasets/${Date.now()}-${input.fileName}`, buffer, input.mimeType);
      const id = await insertDataset({
        userId: ctx.user.id,
        name: input.fileName.replace(/\.[^.]+$/, ""),
        originalName: input.fileName,
        mimeType: input.mimeType,
        storageKey: storage.key,
        storageUrl: storage.url,
        sizeBytes: buffer.length,
        rowCount: analysis.rowCount,
        columnCount: analysis.columnCount,
        columnsJson: JSON.stringify(analysis.columns),
        previewJson: JSON.stringify(rows.slice(0, 10)),
        dataJson: JSON.stringify(rows.slice(0, 2000)),
      });
      if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The dataset could not be indexed." });
      await insertDatasetRows(rows.map((row, rowIndex) => ({ userId: ctx.user.id, datasetId: id, rowIndex, dataJson: JSON.stringify(row) })));
      return { id, name: input.fileName, rowCount: analysis.rowCount, columnCount: analysis.columnCount };
    }),
    delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const deleted = await deleteDatasetForUser(ctx.user.id, input.datasetId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      return { success: true } as const;
    }),
  }),

  analytics: router({
    overview: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const analysis = analyzeRows(parseStoredRows(dataset.dataJson));
      return { dataset, analysis };
    }),
    save: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const analysis = analyzeRows(parseStoredRows(dataset.dataJson));
      await insertAnalysis({ userId: ctx.user.id, datasetId: dataset.id, kind: "overview", dataJson: JSON.stringify(analysis) });
      return analysis;
    }),
  }),

  insights: router({
    list: protectedProcedure.input(idInput).query(({ ctx, input }) => listInsights(ctx.user.id, input.datasetId)),
    generate: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const rows = parseStoredRows(dataset.dataJson);
      const analysis = analyzeRows(rows);
      const drafts = calculateInsightDrafts(rows, analysis);
      let narrative = "";
      try {
        narrative = extractText(await invokeLLM({
          messages: [
            { role: "system", content: "You are a precise analytics editor. Write one concise paragraph that synthesizes the calculated findings. Do not invent metrics." },
            { role: "user", content: `Dataset calculations: ${buildDatasetContext(rows, analysis)}\nFindings: ${JSON.stringify(drafts)}` },
          ],
        }));
      } catch {
        narrative = "The highlights below are calculated directly from the uploaded dataset.";
      }
      const values = drafts.map(draft => ({ ...draft, userId: ctx.user.id, datasetId: dataset.id, metric: draft.metric ?? null }));
      await replaceInsights(ctx.user.id, dataset.id, values);
      return { insights: drafts, narrative };
    }),
  }),

  forecast: router({
    run: protectedProcedure.input(z.object({ datasetId: z.number().int().positive(), dateColumn: z.string().min(1), targetColumn: z.string().min(1), horizon: z.number().int().min(1).max(24) })).mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const rows = parseStoredRows(dataset.dataJson);
      const result = buildForecast(rows, input.dateColumn, input.targetColumn, input.horizon);
      let summary = `The projection is ${result.direction}. The modeled value moves from ${result.lastValue.toLocaleString()} to ${result.projectedValue?.toLocaleString()} across the selected horizon.`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a forecasting analyst. Summarize the calculated forecast in two concise sentences. Mention direction, starting value, projected value, and that this is a linear projection. Do not invent confidence intervals." },
            { role: "user", content: JSON.stringify({ dataset: dataset.name, dateColumn: input.dateColumn, targetColumn: input.targetColumn, horizon: input.horizon, result }) },
          ],
        });
        summary = extractText(response) || summary;
      } catch {
        // Deterministic fallback keeps forecasting useful even if the LLM is temporarily unavailable.
      }
      await insertForecast({ userId: ctx.user.id, datasetId: dataset.id, dateColumn: input.dateColumn, targetColumn: input.targetColumn, horizon: input.horizon, dataJson: JSON.stringify(result), summary });
      return { ...result, summary };
    }),
  }),

  chat: router({
    history: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const conversation = await ensureConversation(ctx.user.id, dataset.id, `Questions about ${dataset.name}`);
      const messages = await listMessages(ctx.user.id, conversation.id);
      return { conversationId: conversation.id, messages };
    }),
    send: protectedProcedure.input(z.object({ datasetId: z.number().int().positive(), conversationId: z.number().int().positive().optional(), message: z.string().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const conversation = input.conversationId ? await getConversationForUser(ctx.user.id, input.conversationId) : await ensureConversation(ctx.user.id, dataset.id, `Questions about ${dataset.name}`);
      if (!conversation || conversation.datasetId !== dataset.id) throw new TRPCError({ code: "FORBIDDEN", message: "Conversation does not belong to this dataset." });
      await addMessage({ userId: ctx.user.id, conversationId: conversation.id, role: "user", content: input.message });
      const history = await listMessages(ctx.user.id, conversation.id);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are DataPilot AI, a grounded data analyst. Answer only from the dataset context below. If a question cannot be answered from it, say so. Use concise markdown. Dataset: ${dataset.name}. Context: ${buildDatasetContext(parseStoredRows(dataset.dataJson))}` },
          ...history.slice(-12).map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
        ],
      });
      const answer = extractText(response) || "I could not generate an answer from this dataset right now.";
      await addMessage({ userId: ctx.user.id, conversationId: conversation.id, role: "assistant", content: answer });
      return { conversationId: conversation.id, answer };
    }),
  }),

  reports: router({
    list: protectedProcedure.query(({ ctx }) => listReports(ctx.user.id)),
    get: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const report = await getReportForUser(ctx.user.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      return report;
    }),
    generate: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetForUser(ctx.user.id, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
      const rows = parseStoredRows(dataset.dataJson);
      const analysis = analyzeRows(rows);
      const insightDrafts = calculateInsightDrafts(rows, analysis);
      const reportPayload = { dataset: dataset.name, generatedAt: new Date().toISOString(), overview: { rows: analysis.rowCount, columns: analysis.columnCount, numericColumns: analysis.numericColumns }, chartData: analysis.chartData, insights: insightDrafts };
      const title = `${dataset.name} analysis report`;
      const summary = `A structured analysis of ${dataset.name} covering ${analysis.rowCount.toLocaleString()} rows, ${analysis.columnCount} columns, and ${insightDrafts.length} calculated highlights.`;
      const reportHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#111;max-width:860px;margin:0 auto;padding:56px;line-height:1.55}h1{font-size:42px;letter-spacing:-.06em;margin:0 0 12px}h2{font-size:20px;border-top:1px solid #111;padding-top:20px;margin-top:38px}p{color:#555}.meta{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e4002b;font-weight:700}.finding{border-left:4px solid #e4002b;padding:12px 16px;background:#f4f4f1;margin:12px 0}.metric{font-family:monospace;color:#666;font-size:12px}</style></head><body><div class="meta">DataPilot / Analysis report</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p><p class="metric">Generated ${escapeHtml(reportPayload.generatedAt)}</p><h2>Dataset overview</h2><p>${analysis.rowCount.toLocaleString()} rows · ${analysis.columnCount} columns · ${analysis.numericColumns.length} numeric signals</p><h2>Calculated highlights</h2>${insightDrafts.map(item => `<div class="finding"><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.summary)}</span>${item.metric ? `<br><span class="metric">${escapeHtml(item.metric)}</span>` : ""}</div>`).join("")}<h2>Machine-readable appendix</h2><pre>${escapeHtml(JSON.stringify(reportPayload, null, 2))}</pre></body></html>`;
      const fileName = `${dataset.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-analysis-report.html`;
      const storage = await storagePut(`${ctx.user.id}/reports/${Date.now()}-${fileName}`, Buffer.from(reportHtml, "utf8"), "text/html; charset=utf-8");
      const id = await insertReport({ userId: ctx.user.id, datasetId: dataset.id, title, summary, reportJson: JSON.stringify(reportPayload), storageKey: storage.key, storageUrl: storage.url, fileName, mimeType: "text/html" });
      return { id, title, summary, reportPayload, fileName, storageUrl: storage.url };
    }),
    delete: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await import("./db").then(module => module.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
      const result = await db.delete(reports).where(and(eq(reports.id, input.reportId), eq(reports.userId, ctx.user.id)));
      if (result[0].affectedRows === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
