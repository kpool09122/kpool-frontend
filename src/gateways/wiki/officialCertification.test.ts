import { describe, expect, it, vi } from "vitest";

import {
  createOfficialCertificationApiClient,
  createOfficialCertificationListUrl,
  createOfficialCertificationRequestBody,
  fetchOfficialCertificationReviews,
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
