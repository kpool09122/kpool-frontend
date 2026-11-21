import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const ProvisionMonetizationAccountRequestBody = z
  .object({ accountId: KPool_Common_Uuid })
  .passthrough();
const MonetizationCapability = z.enum(["purchase", "sell", "receive_payout"]);
const MonetizationAccountSummary = z
  .object({
    monetizationAccountIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    capabilities: z.array(MonetizationCapability),
    stripeCustomerId: z.string().nullish(),
    stripeConnectedAccountId: z.string().nullish(),
  })
  .passthrough();
const KPool_Common_ProblemDetails = z
  .object({
    type: z.string(),
    status: z.number().int(),
    title: z.string(),
    detail: z.string(),
    instance: z.string(),
    code: z.string(),
  })
  .partial()
  .passthrough();
const AccountHolderType = z.enum(["individual", "company"]);
const SyncPayoutAccountRequestBody = z
  .object({
    connectedAccountId: z.string(),
    externalAccountId: z.string(),
    eventType: z.string(),
    bankName: z.string().nullish(),
    last4: z.string().nullish(),
    country: z.string().nullish(),
    currency: z.string().nullish(),
    accountHolderType: AccountHolderType.nullish(),
    isDefault: z.boolean().optional(),
  })
  .passthrough();
const SellerOnboardingCountryCode = z.enum(["JP", "KR", "US"]);
const OnboardSellerRequestBody = z
  .object({
    email: z.string(),
    countryCode: SellerOnboardingCountryCode,
    refreshUrl: z.string(),
    returnUrl: z.string(),
  })
  .passthrough();
const SellerOnboardingSummary = z
  .object({ onboardingUrl: z.string().nullable() })
  .partial()
  .passthrough();
const AccountPaymentMethodType = z.literal("card");
const RegisterPaymentMethodRequestBody = z
  .object({ paymentMethodId: z.string(), type: AccountPaymentMethodType })
  .passthrough();
const RegisteredPaymentMethodSummary = z
  .object({
    registeredPaymentMethodIdentifier: KPool_Common_Uuid,
    paymentMethodId: z.string(),
    type: AccountPaymentMethodType,
    brand: z.string().nullish(),
    last4: z.string().nullish(),
    expMonth: z.number().int().nullish(),
    expYear: z.number().int().nullish(),
    isDefault: z.boolean(),
    skipped: z.boolean(),
  })
  .passthrough();
const InvoiceLineRequestItem = z
  .object({
    description: z.string(),
    unitPriceAmount: z.number().int(),
    quantity: z.number().int(),
  })
  .passthrough();
const CurrencyCode = z.enum(["JPY", "USD", "KRW"]);
const InvoiceTaxLineRequestItem = z
  .object({ label: z.string(), rate: z.number().int(), inclusive: z.boolean() })
  .passthrough();
const CreateInvoiceRequestBody = z
  .object({
    orderIdentifier: KPool_Common_Uuid,
    buyerMonetizationAccountIdentifier: KPool_Common_Uuid,
    lines: z.array(InvoiceLineRequestItem),
    shippingCostAmount: z.number().int(),
    currency: CurrencyCode,
    discountPercentage: z.number().int().nullish(),
    discountCode: z.string().nullish(),
    taxLines: z.array(InvoiceTaxLineRequestItem).nullish(),
    sellerCountry: z.string(),
    sellerRegistered: z.boolean(),
    qualifiedInvoiceRequired: z.boolean(),
    buyerCountry: z.string(),
    buyerIsBusiness: z.boolean(),
    paidByCard: z.boolean(),
    registrationNumber: z.string().nullish(),
  })
  .passthrough();
const InvoiceStatus = z.string();
const KPool_Common_Timestamp = z.string();
const InvoiceSummary = z
  .object({
    invoiceIdentifier: KPool_Common_Uuid,
    orderIdentifier: KPool_Common_Uuid,
    buyerMonetizationAccountIdentifier: KPool_Common_Uuid,
    subtotal: z.number().int(),
    discountAmount: z.number().int(),
    taxAmount: z.number().int(),
    total: z.number().int(),
    currency: CurrencyCode,
    status: InvoiceStatus,
    issuedAt: KPool_Common_Timestamp,
    dueDate: KPool_Common_Timestamp,
    paidAt: KPool_Common_Timestamp.nullish(),
  })
  .passthrough();
const RecordPaymentRequestBody = z
  .object({ paymentIdentifier: KPool_Common_Uuid })
  .passthrough();
const PaymentMethodType = z.enum(["card", "bank_transfer", "wallet"]);
const AuthorizePaymentRequestBody = z
  .object({
    orderId: KPool_Common_Uuid,
    buyerMonetizationAccountId: KPool_Common_Uuid,
    amount: z.number().int(),
    currency: CurrencyCode,
    paymentMethodId: KPool_Common_Uuid,
    paymentMethodType: PaymentMethodType,
    paymentMethodLabel: z.string(),
    paymentMethodRecurringEnabled: z.boolean(),
  })
  .passthrough();
const PaymentStatus = z.enum([
  "pending",
  "authorized",
  "captured",
  "partially_refunded",
  "refunded",
  "failed",
]);
const PaymentSummary = z
  .object({
    paymentId: KPool_Common_Uuid,
    orderIdentifier: KPool_Common_Uuid,
    buyerMonetizationAccountIdentifier: KPool_Common_Uuid,
    amount: z.number().int(),
    currency: CurrencyCode,
    paymentMethodIdentifier: KPool_Common_Uuid,
    paymentMethodType: PaymentMethodType,
    paymentMethodLabel: z.string(),
    paymentMethodRecurringEnabled: z.boolean(),
    status: PaymentStatus,
    createdAt: KPool_Common_Timestamp,
    authorizedAt: KPool_Common_Timestamp.nullish(),
    capturedAt: KPool_Common_Timestamp.nullish(),
    failedAt: KPool_Common_Timestamp.nullish(),
    failureReason: z.string().nullish(),
    refundedAmount: z.number().int(),
    refundedCurrency: CurrencyCode,
    lastRefundedAt: KPool_Common_Timestamp.nullish(),
    lastRefundReason: z.string().nullish(),
  })
  .passthrough();
const RefundPaymentRequestBody = z
  .object({
    refundAmount: z.number().int(),
    refundCurrency: CurrencyCode,
    reason: z.string(),
  })
  .passthrough();
const PrincipalConditionClause = z
  .object({
    field: z.literal("resource:accountId"),
    operator: z.enum(["eq", "ne", "in", "not_in"]),
    value: z.union([z.string(), z.array(z.string())]),
  })
  .passthrough();
const PrincipalPolicyStatement = z
  .object({
    effect: z.enum(["allow", "deny"]),
    actions: z.array(
      z.enum(["principal_group_read", "principal_group_manage"])
    ),
    resourceTypes: z.array(z.literal("principal_group")),
    condition: z
      .object({ clauses: z.array(PrincipalConditionClause) })
      .passthrough()
      .nullable(),
  })
  .passthrough();
const PrincipalPolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string(),
    statements: z.array(PrincipalPolicyStatement),
  })
  .passthrough();
const PrincipalSnapshot = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    identityIdentifier: KPool_Common_Uuid.uuid(),
    status: z.enum(["active", "suspended", "forced_stop"]),
    accountPrincipalCount: z.number().int().gte(1),
    policies: z.array(PrincipalPolicySummary),
  })
  .passthrough();
const PrincipalSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    identityIdentifier: KPool_Common_Uuid.uuid(),
  })
  .passthrough();
const PaidAmountRequestItem = z
  .object({ amount: z.number().int(), currency: CurrencyCode })
  .passthrough();
const KPool_Common_DateString = z.string();
const SettleRevenueRequestBody = z
  .object({
    settlementScheduleId: KPool_Common_Uuid,
    paidAmounts: z.array(PaidAmountRequestItem),
    gatewayFeeRate: z.number().int(),
    platformFeeRate: z.number().int(),
    fixedFeeAmount: z.number().int().nullish(),
    fixedFeeCurrency: CurrencyCode.nullish(),
    periodStart: KPool_Common_DateString,
    periodEnd: KPool_Common_DateString,
  })
  .passthrough();
const SettlementStatus = z.enum(["pending", "processing", "paid", "failed"]);
const TransferStatus = z.enum(["pending", "sent", "failed"]);
const SettlementResultSummary = z
  .object({
    settlementBatchIdentifier: KPool_Common_Uuid,
    monetizationAccountIdentifier: KPool_Common_Uuid,
    currency: CurrencyCode,
    grossAmount: z.number().int(),
    feeAmount: z.number().int(),
    netAmount: z.number().int(),
    status: SettlementStatus,
    periodStart: KPool_Common_Timestamp,
    periodEnd: KPool_Common_Timestamp,
    transferIdentifier: KPool_Common_Uuid,
    transferStatus: TransferStatus,
  })
  .passthrough();
const KPool_Common_PrincipalStatusConflictProblem = KPool_Common_ProblemDetails;

export const schemas = {
  KPool_Common_Uuid,
  ProvisionMonetizationAccountRequestBody,
  MonetizationCapability,
  MonetizationAccountSummary,
  KPool_Common_ProblemDetails,
  AccountHolderType,
  SyncPayoutAccountRequestBody,
  SellerOnboardingCountryCode,
  OnboardSellerRequestBody,
  SellerOnboardingSummary,
  AccountPaymentMethodType,
  RegisterPaymentMethodRequestBody,
  RegisteredPaymentMethodSummary,
  InvoiceLineRequestItem,
  CurrencyCode,
  InvoiceTaxLineRequestItem,
  CreateInvoiceRequestBody,
  InvoiceStatus,
  KPool_Common_Timestamp,
  InvoiceSummary,
  RecordPaymentRequestBody,
  PaymentMethodType,
  AuthorizePaymentRequestBody,
  PaymentStatus,
  PaymentSummary,
  RefundPaymentRequestBody,
  PrincipalConditionClause,
  PrincipalPolicyStatement,
  PrincipalPolicySummary,
  PrincipalSnapshot,
  PrincipalSummary,
  PaidAmountRequestItem,
  KPool_Common_DateString,
  SettleRevenueRequestBody,
  SettlementStatus,
  TransferStatus,
  SettlementResultSummary,
  KPool_Common_PrincipalStatusConflictProblem,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/accounts",
    alias: "MonetizationAccountOperations_provisionMonetizationAccount",
    description: `Provision a monetization account for an existing account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ProvisionMonetizationAccountRequestBody,
      },
    ],
    response: MonetizationAccountSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts/:monetizationAccountId/onboard-seller",
    alias: "MonetizationAccountOperations_onboardSeller",
    description: `Create a seller onboarding URL for the specified monetization account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OnboardSellerRequestBody,
      },
      {
        name: "monetizationAccountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z
      .object({ onboardingUrl: z.string().nullable() })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts/:monetizationAccountId/register-payment-method",
    alias: "MonetizationAccountOperations_registerPaymentMethod",
    description: `Register a payment method on the specified monetization account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RegisterPaymentMethodRequestBody,
      },
      {
        name: "monetizationAccountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: RegisteredPaymentMethodSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts/sync-payout-account",
    alias: "MonetizationAccountOperations_syncPayoutAccount",
    description: `Synchronize payout account data from a gateway event payload.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SyncPayoutAccountRequestBody,
      },
    ],
    response: z.array(z.unknown()),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/invoices",
    alias: "MonetizationBillingOperations_createInvoice",
    description: `Create an invoice for an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateInvoiceRequestBody,
      },
    ],
    response: InvoiceSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/invoices/:invoiceId/record-payment",
    alias: "MonetizationBillingOperations_recordPayment",
    description: `Record a captured payment against an invoice.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RecordPaymentRequestBody,
      },
      {
        name: "invoiceId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: InvoiceSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/payments/:paymentId/capture",
    alias: "MonetizationPaymentOperations_capturePayment",
    description: `Capture a previously authorized payment.`,
    requestFormat: "json",
    parameters: [
      {
        name: "paymentId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PaymentSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/payments/:paymentId/refund",
    alias: "MonetizationPaymentOperations_refundPayment",
    description: `Refund a captured payment.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RefundPaymentRequestBody,
      },
      {
        name: "paymentId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PaymentSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/payments/authorize",
    alias: "MonetizationPaymentOperations_authorizePayment",
    description: `Authorize a payment for an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AuthorizePaymentRequestBody,
      },
    ],
    response: PaymentSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/principal/me",
    alias: "PrincipalOperations_getCurrentPrincipal",
    description: `Return the original authenticated identity&#x27;s Monetization principal for the current effective Account. No arbitrary account selection is accepted. Returns 404 when not enabled. Account, Account Principal and Monetization Principal suspension does not prevent reading this snapshot. Does not require group management permissions.`,
    requestFormat: "json",
    response: PrincipalSnapshot,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/principals",
    alias: "PrincipalOperations_createPrincipal",
    description: `Explicitly enable Monetization for the original authenticated identity and current effective Account. No identity or account input is accepted. Requires active direct membership. All members join Default with General; Account Owners also join Owners with Owner. Duplicate enrollment returns 409 without restoring status or permissions. Does not enable payment, billing or settlement APIs.`,
    requestFormat: "json",
    response: PrincipalSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/settlements/settle-revenue",
    alias: "MonetizationSettlementOperations_settleRevenue",
    description: `Create a settlement batch and transfer from paid amounts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SettleRevenueRequestBody,
      },
    ],
    response: SettlementResultSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/transfers/:transferId/execute",
    alias: "MonetizationSettlementOperations_executeTransfer",
    description: `Execute a pending transfer.`,
    requestFormat: "json",
    parameters: [
      {
        name: "transferId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(z.unknown()),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 429,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 503,
        description: `Service unavailable.`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
]);

export const monetizationApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
