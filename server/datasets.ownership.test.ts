import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { deleteDatasetForUser, getDatasetForUser, listDatasets } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, deleteDatasetForUser: vi.fn(), getDatasetForUser: vi.fn(), listDatasets: vi.fn() };
});

function createContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "owner-7",
      email: "owner@example.com",
      name: "Owner",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("dataset ownership boundaries", () => {
  it("does not expose a dataset when the user-scoped lookup cannot find it", async () => {
    vi.mocked(getDatasetForUser).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.datasets.get({ datasetId: 42 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(getDatasetForUser).toHaveBeenCalledWith(7, 42);
  });

  it("passes the authenticated user ID into dataset listing", async () => {
    vi.mocked(listDatasets).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.datasets.list()).resolves.toEqual([]);
    expect(listDatasets).toHaveBeenCalledWith(7);
  });

  it("denies deletion when the user-scoped delete helper reports no owned dataset", async () => {
    vi.mocked(deleteDatasetForUser).mockResolvedValue(false);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.datasets.delete({ datasetId: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(deleteDatasetForUser).toHaveBeenCalledWith(7, 99);
  });
});
