import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analyses,
  chatConversations,
  chatMessages,
  datasets,
  datasetRows,
  forecasts,
  insights,
  reports,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listDatasets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(datasets).where(eq(datasets.userId, userId)).orderBy(desc(datasets.createdAt));
}

export async function getDatasetForUser(userId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId))).limit(1);
  return result[0];
}

export async function insertDataset(value: typeof datasets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(datasets).values(value).$returningId();
  return result[0]?.id;
}

export async function insertDatasetRows(values: Array<typeof datasetRows.$inferInsert>) {
  const db = await getDb();
  if (!db || !values.length) return;
  for (let index = 0; index < values.length; index += 250) {
    await db.insert(datasetRows).values(values.slice(index, index + 250));
  }
}

export async function listDatasetRowsForUser(userId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(datasetRows).where(and(eq(datasetRows.userId, userId), eq(datasetRows.datasetId, datasetId))).orderBy(datasetRows.rowIndex);
}

export async function deleteDatasetForUser(userId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
  if (result[0].affectedRows > 0) {
    await db.delete(datasetRows).where(and(eq(datasetRows.datasetId, datasetId), eq(datasetRows.userId, userId)));
  }
  return result[0].affectedRows > 0;
}

export async function insertAnalysis(value: typeof analyses.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(analyses).values(value).$returningId();
  return result[0]?.id;
}

export async function listInsights(userId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insights).where(and(eq(insights.userId, userId), eq(insights.datasetId, datasetId))).orderBy(desc(insights.createdAt));
}

export async function replaceInsights(userId: number, datasetId: number, values: Array<typeof insights.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.delete(insights).where(and(eq(insights.userId, userId), eq(insights.datasetId, datasetId)));
  if (values.length) await db.insert(insights).values(values);
}

export async function insertForecast(value: typeof forecasts.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(forecasts).values(value).$returningId();
  return result[0]?.id;
}

export async function listReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function getReportForUser(userId: number, reportId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reports).where(and(eq(reports.userId, userId), eq(reports.id, reportId))).limit(1);
  return result[0];
}

export async function insertReport(value: typeof reports.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reports).values(value).$returningId();
  return result[0]?.id;
}

export async function ensureConversation(userId: number, datasetId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(chatConversations).where(and(eq(chatConversations.userId, userId), eq(chatConversations.datasetId, datasetId))).orderBy(desc(chatConversations.updatedAt)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(chatConversations).values({ userId, datasetId, title }).$returningId();
  const created = await db.select().from(chatConversations).where(eq(chatConversations.id, result[0].id)).limit(1);
  return created[0];
}

export async function getConversationForUser(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chatConversations).where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId))).limit(1);
  return result[0];
}

export async function listMessages(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.conversationId, conversationId))).orderBy(chatMessages.createdAt);
}

export async function addMessage(value: typeof chatMessages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(chatMessages).values(value).$returningId();
  return result[0]?.id;
}
