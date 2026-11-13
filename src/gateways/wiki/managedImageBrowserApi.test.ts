import { afterEach, expect, it, vi } from "vitest";
import { fetchManagedImages } from "./managedImageBrowserApi";

afterEach(() => vi.unstubAllGlobals());
it("encodes selected filters with pagination and omits disabled filters", async () => {
  const fetch = vi.fn().mockImplementation(async () => Response.json({ images: [], current_page: 1, last_page: 1, per_page: 12, total: 0 }));
  vi.stubGlobal("fetch", fetch);
  await fetchManagedImages(2, "Failed", { license: "CC-BY-SA-4.0", authorMissing: true });
  expect(fetch).toHaveBeenLastCalledWith("/api/wiki/managed-images?status=approved&perPage=12&page=2&license=CC-BY-SA-4.0&authorMissing=true");
  await fetchManagedImages(1, "Failed", { licenseMissing: true, authorMissing: true });
  expect(fetch).toHaveBeenLastCalledWith("/api/wiki/managed-images?status=approved&perPage=12&page=1&licenseMissing=true&authorMissing=true");
  await fetchManagedImages(1, "Failed", { authorMissing: false });
  expect(fetch).toHaveBeenLastCalledWith("/api/wiki/managed-images?status=approved&perPage=12&page=1");
});
