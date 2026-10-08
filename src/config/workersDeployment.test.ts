import localConfig from "../../wrangler.json";
import { describe, expect, it } from "vitest";
import { validateDeploymentConfig } from "../../scripts/workers-deployment-config.mjs";

const valid = () => ({
  ...localConfig,
  name: "approved-worker",
  services: [{ binding: "WORKER_SELF_REFERENCE", service: "approved-worker" }],
  r2_buckets: [{ binding: "NEXT_INC_CACHE_R2_BUCKET", bucket_name: "approved-cache" }],
  vars: Object.fromEntries([
    "KPOOL_WIKI_PRIVATE_API_BASE_URL", "KPOOL_IDENTITY_API_BASE_URL",
    "KPOOL_ACCOUNT_API_BASE_URL", "KPOOL_SITE_MANAGEMENT_API_BASE_URL",
  ].map((key) => [key, "https://api.example.org"])),
});

describe("Workers deployment gate", () => {
  it("accepts explicit runtime API URLs and consistent resource names", () => {
    expect(validateDeploymentConfig(valid())).toEqual([]);
  });
  it.each([
    undefined,
    null,
    {},
    [],
    [null],
    [{ tag: "v1" }],
    [{ tag: "v1", new_sqlite_classes: "DOQueueHandler" }],
    [{ tag: "v1", new_sqlite_classes: ["AnotherHandler"] }],
    [{ tag: "v1", new_classes: ["DOQueueHandler"] }],
    [{ new_sqlite_classes: ["DOQueueHandler"] }],
    [{ tag: " ", new_sqlite_classes: ["DOQueueHandler"] }],
  ].map((migrations) => ({ migrations })))("rejects missing or invalid queue SQLite migration %j", ({ migrations }) => {
    expect(validateDeploymentConfig({ ...valid(), migrations })).toEqual([
      "A tagged new_sqlite_classes migration for DOQueueHandler is required",
    ]);
  });
  it("accepts queue initialization in a later migration with a custom tag", () => {
    expect(validateDeploymentConfig({
      ...valid(),
      migrations: [
        { tag: "initial", new_sqlite_classes: ["AnotherHandler"] },
        { tag: "add-cache-queue", new_sqlite_classes: ["DOQueueHandler"] },
        { tag: "follow-up", new_sqlite_classes: ["OtherHandler"] },
      ],
    })).toEqual([]);
  });
  it("rejects missing cache queue, image and Node compatibility bindings", () => {
    expect(validateDeploymentConfig({ ...valid(), durable_objects: {}, images: {}, compatibility_flags: [] }).length).toBeGreaterThan(0);
  });
  it("rejects local resources and incomplete configuration", () => {
    expect(validateDeploymentConfig({ name: "k-pool-frontend-local" }).length).toBeGreaterThan(0);
  });
  it("rejects missing bindings, mismatched self reference and local cache", () => {
    const config = valid();
    config.services[0].service = "another-worker";
    config.r2_buckets[0].bucket_name = "k-pool-frontend-local-cache";
    expect(validateDeploymentConfig(config).length).toBeGreaterThan(0);
  });
  it.each(["", "http://localhost:8080", "https://user:password@api.example.org", "https://api.example.org?token=x", "https://api.example.org/#fragment"])("rejects unsafe API base URL %s", (url) => {
    const config = valid();
    config.vars.KPOOL_IDENTITY_API_BASE_URL = url;
    expect(validateDeploymentConfig(config).length).toBeGreaterThan(0);
  });
});
