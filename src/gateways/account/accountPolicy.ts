import type { IdentitySummary } from "@/gateways/identity/identityApi";

type AccountPolicyStatement = {
  actions?: unknown;
  effect?: unknown;
  resourceTypes?: unknown;
};

type AccountEffectivePolicy = {
  statements?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const normalizePolicyValue = (value: string): string => value.trim().toLowerCase();

const valueMatches = (values: string[], target: string): boolean => {
  const normalizedTarget = normalizePolicyValue(target);

  return values
    .map(normalizePolicyValue)
    .some((value) => value === normalizedTarget || value === "*" || value === "all");
};

const toPolicyStatement = (value: unknown): AccountPolicyStatement | null =>
  isRecord(value)
    ? {
        actions: value.actions,
        effect: value.effect,
        resourceTypes: value.resourceTypes,
      }
    : null;

const getAccountPolicies = (identity: IdentitySummary | null): AccountEffectivePolicy[] => {
  if (!identity) {
    return [];
  }

  const record = identity as Record<string, unknown>;
  const directPolicies = record.accountEffectivePolicies ??
    record.effectiveAccountPolicies ??
    record.accountPolicies ??
    record.policies;
  const account = record.account;
  const nestedPolicies = isRecord(account)
    ? account.effectivePolicies ?? account.policies
    : null;
  const policies = Array.isArray(directPolicies) ? directPolicies : nestedPolicies;

  return Array.isArray(policies)
    ? policies.filter(isRecord).map((policy) => ({ statements: policy.statements }))
    : [];
};

const statementMatches = (
  statement: AccountPolicyStatement,
  action: string,
): boolean =>
  valueMatches(getStringArray(statement.actions), action) &&
  (getStringArray(statement.resourceTypes).length === 0 ||
    valueMatches(getStringArray(statement.resourceTypes), "ACCOUNT"));

const hasMatchingStatement = (
  identity: IdentitySummary | null,
  effect: "allow" | "deny",
  action: string,
): boolean =>
  getAccountPolicies(identity).some((policy) =>
    Array.isArray(policy.statements) &&
    policy.statements
      .map(toPolicyStatement)
      .some((statement) =>
        statement &&
        typeof statement.effect === "string" &&
        normalizePolicyValue(statement.effect) === effect &&
        statementMatches(statement, action),
      ),
  );

export const hasAccountPolicy = (identity: IdentitySummary | null): boolean =>
  getAccountPolicies(identity).length > 0;

export const canUpdateAccount = (identity: IdentitySummary | null): boolean =>
  hasMatchingStatement(identity, "allow", "account:update") &&
  !hasMatchingStatement(identity, "deny", "account:update");
