import type { IdentitySummary } from "@/gateways/identity/identityApi";

export const getAccountIdentifierFromIdentity = (
  identity: IdentitySummary | null,
): string | null => {
  if (!identity) {
    return null;
  }

  const identityRecord = identity as Record<string, unknown>;
  const accountRecord = identityRecord.account;
  const accounts = identityRecord.accounts;
  const directAccountIdentifier = getAccountIdentifierFromRecord(identityRecord, {
    includeGenericId: false,
  });

  if (directAccountIdentifier) {
    return directAccountIdentifier;
  }

  if (isRecord(accountRecord)) {
    const nestedAccountIdentifier = getAccountIdentifierFromRecord(accountRecord, {
      includeGenericId: true,
    });

    if (nestedAccountIdentifier) {
      return nestedAccountIdentifier;
    }
  }

  if (Array.isArray(accounts)) {
    const account = accounts.find(isRecord);

    return account
      ? getAccountIdentifierFromRecord(account, { includeGenericId: true })
      : null;
  }

  return null;
};

export const getAccountCategoryFromIdentity = (
  identity: IdentitySummary | null,
): string | null => {
  if (!identity) {
    return null;
  }

  const identityRecord = identity as Record<string, unknown>;
  const accountRecord = identityRecord.account;
  const accounts = identityRecord.accounts;
  const directAccountCategory = getAccountCategoryFromRecord(identityRecord);

  if (directAccountCategory) {
    return directAccountCategory;
  }

  if (isRecord(accountRecord)) {
    const nestedAccountCategory = getAccountCategoryFromRecord(accountRecord);

    if (nestedAccountCategory) {
      return nestedAccountCategory;
    }
  }

  if (Array.isArray(accounts)) {
    const account = accounts.find(isRecord);

    return account ? getAccountCategoryFromRecord(account) : null;
  }

  return null;
};

export const getAccountPrincipalIdentifierFromIdentity = (
  identity: IdentitySummary | null,
): string | null => {
  if (!identity) {
    return null;
  }

  const identityRecord = identity as Record<string, unknown>;
  const accountRecord = identityRecord.account;
  const accounts = identityRecord.accounts;
  const directPrincipalIdentifier = getAccountPrincipalIdentifierFromRecord(identityRecord);

  if (directPrincipalIdentifier) {
    return directPrincipalIdentifier;
  }

  if (isRecord(accountRecord)) {
    const nestedPrincipalIdentifier = getAccountPrincipalIdentifierFromRecord(accountRecord);

    if (nestedPrincipalIdentifier) {
      return nestedPrincipalIdentifier;
    }
  }

  if (Array.isArray(accounts)) {
    const account = accounts.find(isRecord);

    return account ? getAccountPrincipalIdentifierFromRecord(account) : null;
  }

  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (
  record: Record<string, unknown>,
  keys: string[],
): string | null => {
  const value = keys
    .map((key) => record[key])
    .find((candidate) => typeof candidate === "string" && candidate.length > 0);

  return typeof value === "string" ? value : null;
};

const getAccountIdentifierFromRecord = (
  record: Record<string, unknown>,
  { includeGenericId }: { includeGenericId: boolean },
): string | null =>
  getStringValue(record, [
    "accountId",
    "accountIdentifier",
    "account_id",
    "account_identifier",
    ...(includeGenericId ? ["id"] : []),
  ]);

const getAccountCategoryFromRecord = (
  record: Record<string, unknown>,
): string | null =>
  getStringValue(record, [
    "accountCategory",
    "account_category",
    "category",
  ]);

const getAccountPrincipalIdentifierFromRecord = (
  record: Record<string, unknown>,
): string | null =>
  getStringValue(record, [
    "accountPrincipalIdentifier",
    "accountPrincipalId",
    "account_principal_identifier",
    "account_principal_id",
  ]);
