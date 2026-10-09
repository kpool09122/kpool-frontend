const apiPrefixes = {
  KPOOL_WIKI_PRIVATE_API_BASE_URL: "/api/v1/wiki",
  KPOOL_IDENTITY_API_BASE_URL: "/api/v1/identity",
  KPOOL_ACCOUNT_API_BASE_URL: "/api/v1/account",
  KPOOL_SITE_MANAGEMENT_API_BASE_URL: "/api/v1/site-management",
};

/**
 * Validate deployment resource bindings, queue initialization and runtime API URLs.
 * @param {Record<string, unknown>} config
 * @returns {string[]} Configuration errors that prevent deployment.
 */
export const validateDeploymentConfig = (config) => {
  const errors = [];
  if (typeof config.name !== "string" || !config.name || config.name.includes("local")) {
    errors.push("An approved non-local Worker name is required");
  }
  const services = Array.isArray(config.services) ? config.services : [];
  if (!services.some((item) => item.binding === "WORKER_SELF_REFERENCE" && item.service === config.name)) {
    errors.push("WORKER_SELF_REFERENCE must match the Worker name");
  }
  const buckets = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
  if (!buckets.some((item) => item.binding === "NEXT_INC_CACHE_R2_BUCKET" && typeof item.bucket_name === "string" && item.bucket_name && !item.bucket_name.includes("local"))) {
    errors.push("An approved NEXT_INC_CACHE_R2_BUCKET is required");
  }
  const vars = config.vars && typeof config.vars === "object" ? config.vars : {};
  for (const [key, prefix] of Object.entries(apiPrefixes)) {
    const value = vars[key];
    const url = typeof value === "string" && URL.canParse(value) ? new URL(value) : null;
    if (!url || url.protocol !== "https:" || url.username || url.password || url.search || url.hash || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      errors.push(`${key} requires a credential-free public HTTPS base URL`);
    } else if (!["", prefix].includes(url.pathname.replace(/\/+$/, ""))) {
      errors.push(`${key} requires an origin or matching ${prefix} prefix`);
    }
  }
  const objects = config.durable_objects;
  const bindings = objects && typeof objects === "object" && Array.isArray(objects.bindings) ? objects.bindings : [];
  if (!bindings.some((item) => item.name === "NEXT_CACHE_DO_QUEUE" && item.class_name === "DOQueueHandler")) {
    errors.push("NEXT_CACHE_DO_QUEUE / DOQueueHandler is required");
  }
  const migrations = Array.isArray(config.migrations) ? config.migrations : [];
  const hasQueueMigration = migrations.some((migration) =>
    migration &&
    typeof migration.tag === "string" && migration.tag.trim() &&
    Array.isArray(migration.new_sqlite_classes) &&
    migration.new_sqlite_classes.includes("DOQueueHandler"),
  );
  if (!hasQueueMigration) {
    errors.push("A tagged new_sqlite_classes migration for DOQueueHandler is required");
  }
  if (!config.images || config.images.binding !== "IMAGES") {
    errors.push("IMAGES binding is required");
  }
  if (!Array.isArray(config.compatibility_flags) || !config.compatibility_flags.includes("nodejs_compat")) {
    errors.push("nodejs_compat is required");
  }
  return errors;
};
