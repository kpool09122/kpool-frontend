import { describe, expect, it, vi } from "vitest";

import {
  createOfficialCertificationApiClient,
  createOfficialCertificationListUrl,
  createOfficialCertificationRequestBody,
  createSyncOwnedWikiCertificationsRequestBody,
  fetchMyOfficialCertificationsFromBrowser,
  fetchMyOwnedWikisFromBrowser,
  fetchOfficialCertificationReviews,
  fetchRelatedWikisFromBrowser,
  syncOwnedWikiCertificationsFromBrowser,
} from "./officialCertification";

describe("officialCertification", () => {
  it("creates pending list URLs with status and pagination", () => {
    expect(createOfficialCertificationListUrl({
      baseUrl: "https://api.example.test/",
      page: 2,
      perPage: 20,
      status: "pending",
    })).toBe("https://api.example.test/api/wiki/official-certifications?status=pending&page=2&perPage=20");
  });

  it("fetches pending official certifications from the browser BFF", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      officialCertifications: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 20,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(fetchOfficialCertificationReviews({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      page: 1,
      perPage: 20,
      status: "pending",
    })).resolves.toMatchObject({ officialCertifications: [] });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "/api/wiki/official-certification?page=1&perPage=20&status=pending",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("backend client lists pending official certifications", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      officialCertifications: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 20,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = createOfficialCertificationApiClient("https://api.example.test", {}, fetchAdapter);

    await expect(client?.listCertifications({
      page: 1,
      perPage: 20,
      status: "pending",
    })).resolves.toMatchObject({ officialCertifications: [] });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/official-certifications?status=pending&page=1&perPage=20",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("fetches applicant official certification and owned wiki routes from the browser", async () => {
    const fetchAdapter = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        officialCertifications: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 100,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        accountCategory: "agency",
        primaryOwnedWikis: [],
        otherOwnedWikis: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 100,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        wikis: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(fetchMyOfficialCertificationsFromBrowser({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      perPage: 100,
      status: "approved",
    })).resolves.toMatchObject({ officialCertifications: [] });
    await expect(fetchMyOwnedWikisFromBrowser({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      perPage: 100,
    })).resolves.toMatchObject({ accountCategory: "agency" });
    await expect(fetchRelatedWikisFromBrowser({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      resourceType: "agency",
      translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
    })).resolves.toMatchObject({ wikis: [] });
    expect(fetchAdapter).toHaveBeenNthCalledWith(
      1,
      "/api/wiki/my/official-certifications?perPage=100&status=approved",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
    expect(fetchAdapter).toHaveBeenNthCalledWith(
      2,
      "/api/wiki/my/owned-wikis?perPage=100",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
    expect(fetchAdapter).toHaveBeenNthCalledWith(
      3,
      "/api/wiki/official-certification/related-wikis?resourceType=agency&translationSetIdentifier=11111111-1111-4111-8111-111111111111",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("backend client lists related wikis by primary translation set", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      wikis: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = createOfficialCertificationApiClient("https://api.example.test", {}, fetchAdapter);

    await expect(client?.listRelatedWikis({
      resourceType: "agency",
      translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
    })).resolves.toMatchObject({ wikis: [] });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wiki/agency/11111111-1111-4111-8111-111111111111/related-wikis",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates and sends owned wiki certification sync bodies", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      approved: [],
      rejected: [],
      unchanged: [{
        resourceType: "group",
        translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    expect(createSyncOwnedWikiCertificationsRequestBody([
      "11111111-1111-4111-8111-111111111111",
      "11111111-1111-4111-8111-111111111111",
    ])).toEqual({ translationSetIdentifiers: ["11111111-1111-4111-8111-111111111111"] });
    await expect(syncOwnedWikiCertificationsFromBrowser({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      requestBody: { translationSetIdentifiers: ["11111111-1111-4111-8111-111111111111"] },
    })).resolves.toMatchObject({ unchanged: [{ resourceType: "group" }] });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "/api/wiki/official-certification/owned-wikis",
      expect.objectContaining({
        credentials: "include",
        method: "PUT",
        body: JSON.stringify({ translationSetIdentifiers: ["11111111-1111-4111-8111-111111111111"] }),
      }),
    );
  });

  it("creates request bodies with translationSetIdentifier instead of wikiId", () => {
    expect(
      createOfficialCertificationRequestBody({
        resourceType: "agency",
        translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
        wikiId: "22222222-2222-4222-8222-222222222222",
        ownerAccountId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toEqual({
      resourceType: "agency",
      translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
    });
  });
});
