import type { IdentitySummary } from "@/gateways/identity/identityApi";

type AccountPolicyStatement = {
  actions?: unknown;
  condition?: unknown;
  effect?: unknown;
  resourceTypes?: unknown;
};

type AccountEffectivePolicy = {
  statements?: unknown;
};

type AccountPolicyConditionClause = {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
};

type AccountPolicyCondition = {
  clauses?: unknown;
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
        condition: value.condition,
        effect: value.effect,
        resourceTypes: value.resourceTypes,
      }
    : null;

const toCondition = (value: unknown): AccountPolicyCondition | null =>
  isRecord(value) ? { clauses: value.clauses } : null;

const toConditionClause = (value: unknown): AccountPolicyConditionClause | null =>
  isRecord(value)
    ? {
        field: value.field,
        operator: value.operator,
        value: value.value,
      }
    : null;

const getStringProperty = (value: unknown, keys: string[]): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
};

export const getAccountTypeFromIdentity = (identity: IdentitySummary | null): string | null => {
  if (!identity) {
    return null;
  }

  const directType = getStringProperty(identity, ["accountType", "type"]);
  if (directType) {
    return directType;
  }

  const record = identity as Record<string, unknown>;
  const nestedType = getStringProperty(record.account, ["accountType", "type"]);
  if (nestedType) {
    return nestedType;
  }

  const accounts = record.accounts;
  if (Array.isArray(accounts)) {
    return accounts.map((account) => getStringProperty(account, ["accountType", "type"])).find(Boolean) ?? null;
  }

  return null;
};

export const isCorporationAccount = (identity: IdentitySummary | null): boolean =>
  normalizePolicyValue(getAccountTypeFromIdentity(identity) ?? "") === "corporation";

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
  identity: IdentitySummary | null,
): boolean =>
  valueMatches(getStringArray(statement.actions), action) &&
  (getStringArray(statement.resourceTypes).length === 0 ||
    valueMatches(getStringArray(statement.resourceTypes), "ACCOUNT")) &&
  conditionMatches(statement.condition, identity);

const conditionMatches = (conditionValue: unknown, identity: IdentitySummary | null): boolean => {
  if (conditionValue === null || conditionValue === undefined) {
    return true;
  }

  const condition = toCondition(conditionValue);
  if (!condition) {
    return false;
  }

  const clauses = Array.isArray(condition.clauses) ? condition.clauses : [];

  return clauses
    .map(toConditionClause)
    .every((clause) => clause !== null && conditionClauseMatches(clause, identity));
};

const conditionClauseMatches = (
  clause: AccountPolicyConditionClause,
  identity: IdentitySummary | null,
): boolean => {
  const actualValue = getConditionActualValue(clause.field, identity);

  if (actualValue === null) {
    return false;
  }

  const operator = typeof clause.operator === "string" ? normalizePolicyValue(clause.operator) : "";

  switch (operator) {
    case "eq":
      return actualValue === clause.value;
    case "ne":
      return actualValue !== clause.value;
    case "in":
      return (Array.isArray(clause.value) ? clause.value : [clause.value]).includes(actualValue);
    case "not_in":
      return !(Array.isArray(clause.value) ? clause.value : [clause.value]).includes(actualValue);
    default:
      return false;
  }
};

const getConditionActualValue = (
  field: unknown,
  identity: IdentitySummary | null,
): string | null => {
  if (field !== "resource:accountType") {
    return null;
  }

  return getAccountTypeFromIdentity(identity);
};

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
        statementMatches(statement, action, identity),
      ),
  );

export const hasAccountPolicy = (identity: IdentitySummary | null): boolean =>
  getAccountPolicies(identity).length > 0;

export const canUpdateAccount = (identity: IdentitySummary | null): boolean =>
  hasMatchingStatement(identity, "allow", "account:update") &&
  !hasMatchingStatement(identity, "deny", "account:update");

export const canInviteAccountMembers = (identity: IdentitySummary | null): boolean =>
  hasMatchingStatement(identity, "allow", "account:member:invite") &&
  !hasMatchingStatement(identity, "deny", "account:member:invite");

export const canManagePrincipalGroups = (identity: IdentitySummary | null): boolean =>
  hasMatchingStatement(identity, "allow", "account:principal-group:manage") &&
  !hasMatchingStatement(identity, "deny", "account:principal-group:manage");


export const canManageAccountCategoryChangeRequests = (identity: IdentitySummary | null): boolean =>
  hasMatchingStatement(identity, "allow", "account:category-change-request:manage") &&
  !hasMatchingStatement(identity, "deny", "account:category-change-request:manage");
