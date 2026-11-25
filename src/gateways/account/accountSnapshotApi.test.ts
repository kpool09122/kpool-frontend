import { describe, expect, it, vi } from "vitest";
import { fetchCurrentAccountSnapshot, saveAccountSnapshot, requestAccountSnapshotChange, snapshotSchemas } from "./accountSnapshotApi";
const id = "22222222-2222-4222-8222-222222222222";
const summary = { snapshotIdentifier: id, accountIdentifier: id, status: "approved", savedAt: "2026-11-25T00:00:00Z" };
describe("account snapshot contract", () => {
  it("does not expose uncontracted snapshot storage data", () => {
    expect(snapshotSchemas.summary.safeParse({ ...summary, documentPath: "private/file", hash: "secret" })).toMatchObject({ success: true, data: summary });
    const parsed = snapshotSchemas.summary.safeParse({ ...summary, documentPath: "private/file", hash: "secret" });
    if (parsed.success) expect(parsed.data).not.toHaveProperty("hash");
  });
  it("saves registered information without resending documents and preserves an identical summary", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json(summary));
    expect(await saveAccountSnapshot(id, "ja", fetchAdapter)).toEqual(summary);
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/account/accounts/${id}/snapshot`, expect.objectContaining({ method: "PUT", credentials: "include" }));
    expect(fetchAdapter.mock.calls[0][1].body).toBeUndefined();
  });
  it("treats a missing current snapshot as unsaved, not other failures", async () => {
    expect(await fetchCurrentAccountSnapshot(id, "en", vi.fn().mockResolvedValue(new Response(null, { status: 404 })))).toBeNull();
    await expect(fetchCurrentAccountSnapshot(id, "en", vi.fn().mockResolvedValue(Response.json({ message: "denied" }, { status: 403 })))).rejects.toMatchObject({ accountRouteStatus: 403 });
  });
  it("sends only the required change reason", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Updated address", status: "pending", requestedAt: summary.savedAt, reviewedBy: null, reviewedAt: null, rejectionReason: null }));
    await requestAccountSnapshotChange(id, "en", { changeReason: "Updated address" }, fetchAdapter);
    expect(JSON.parse(fetchAdapter.mock.calls[0][1].body)).toEqual({ changeReason: "Updated address" });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(requestAccountSnapshotChange(id, "en", { changeReason: "" }, fetchAdapter)).rejects.toBeDefined();
    errorLog.mockRestore();
  });
  it("requires complete snapshot comparison data rather than accepting a summary as detail", () => {
    expect(snapshotSchemas.detail.safeParse(summary).success).toBe(false);
    expect(snapshotSchemas.changeBody.safeParse({ changeReason: "x".repeat(2001) }).success).toBe(false);
  });
});
