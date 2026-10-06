import { readFileSync, writeFileSync } from "node:fs";

// Only repository-owned HTML is bundled; no network or runtime filesystem access.
const documents = Object.fromEntries(["ja", "en", "ko"].map((locale) => [
  locale,
  Object.fromEntries(["privacy", "terms"].map((kind) => [
    kind,
    readFileSync(new URL(`../public/legal/${locale}/${kind}.html`, import.meta.url), "utf8"),
  ])),
]));
writeFileSync(new URL("../src/app/[language]/legal/documents.json", import.meta.url), `${JSON.stringify(documents, null, 2)}
`);
