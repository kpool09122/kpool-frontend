import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const architectureBoundarySettings = {
  "boundaries/elements": [
    { type: "app", pattern: "src/app/**" },
    { type: "components", pattern: "src/components/**" },
    { type: "i18n", pattern: "src/i18n/**" },
    { type: "package", pattern: "packages/*/src/**" },
  ],
};

const architectureBoundaryRules = {
  "boundaries/dependencies": [
    "error",
    {
      default: "allow",
      rules: [
        {
          from: { type: "package" },
          disallow: { to: { type: ["app", "components", "i18n"] } },
          message: "packages must not depend on src modules.",
        },
        {
          from: { type: "components" },
          disallow: { to: { type: "app" } },
          message: "src/components must not depend on src/app route or page modules.",
        },
      ],
    },
  ],
};

const baseRestrictedSyntax = [
  {
    selector: "TSEnumDeclaration",
    message: "TypeScript enum is forbidden. Prefer const objects or union types.",
  },
  {
    selector: "ClassDeclaration, ClassExpression",
    message: "Classes are discouraged unless framework or interoperability constraints require them.",
  },
  {
    selector: "CallExpression[callee.name='require']",
    message: "require() is discouraged. Prefer static import declarations.",
  },
  {
    selector: "ImportExpression",
    message: "Dynamic import is discouraged unless the boundary explicitly needs lazy loading.",
  },
  {
    selector:
      "CallExpression[callee.property.name='parse']:not([callee.object.name='JSON'])",
    message: "Zod parse-style calls are forbidden. Use safeParse and explicit error handling.",
  },
];

const applicationRestrictedSyntax = [
  ...baseRestrictedSyntax,
  {
    selector: "ThrowStatement",
    message: "throw is forbidden outside gateways and framework entrypoints. Return an explicit result instead.",
  },
  {
    selector: "TryStatement",
    message: "try/catch is forbidden outside gateways and framework entrypoints.",
  },
  {
    selector: "TSTypeReference[typeName.name='Promise']",
    message: "Explicit Promise<T> types are forbidden outside gateways and framework entrypoints. Prefer result-style async modeling.",
  },
];

const aiCodingGuardrailRules = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["@kpool/types/*", "@kpool/wiki/*"],
          message:
            "Workspace package subpath imports are discouraged. Export from the package barrel and import the package root instead.",
        },
      ],
    },
  ],
  "no-restricted-syntax": ["error", ...applicationRestrictedSyntax],
};

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: { boundaries },
    settings: architectureBoundarySettings,
    rules: {
      ...architectureBoundaryRules,
      ...aiCodingGuardrailRules,
    },
  },
  {
    files: [
      "src/gateways/**/*.{js,jsx,ts,tsx,mjs,cjs}",
      "src/app/api/**/*.{js,jsx,ts,tsx,mjs,cjs}",
      "src/app/**/page.{ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
      "tests/**/*.{js,jsx,ts,tsx}",
      "playwright.config.ts",
      "vitest.config.ts",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...baseRestrictedSyntax],
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    "next-env.d.ts",
  ]),
]);
