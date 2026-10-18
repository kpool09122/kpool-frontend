import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_UuidV7 = z.string();
const KPool_Common_DateString = z.string();
const PublishedAnnouncementSummary = z
  .object({
    announcement_id: KPool_Common_UuidV7.regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    ).uuid(),
    category_name: z.enum(["NEWS", "UPDATES", "MAINTENANCE"]),
    title: z.string(),
    content: z.string(),
    published_date: KPool_Common_DateString,
  })
  .passthrough();
const ListAnnouncementsPage = z
  .object({
    announcements: z.array(PublishedAnnouncementSummary),
    current_page: z.number().int().gte(1),
    last_page: z.number().int().gte(1),
    total: z.number().int().gte(0),
    per_page: z.number().int().gte(1).lte(100),
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
const KPool_Common_Uuid = z.string();
const KPool_Common_Timestamp = z.string();
const MyContactSummary = z
  .object({
    contactIdentifier: KPool_Common_Uuid,
    principalIdentifier: KPool_Common_Uuid.nullish(),
    category: z.number().int(),
    name: z.string(),
    replyIdentifiers: z.array(KPool_Common_Uuid),
    createdAt: KPool_Common_Timestamp,
    content: z.string(),
  })
  .passthrough();
const ContactReplyDetail = z
  .object({
    replyIdentifier: KPool_Common_Uuid.uuid(),
    content: z.string(),
    sentAt: KPool_Common_Timestamp,
  })
  .passthrough();
const ContactDetail = z
  .object({
    contactIdentifier: KPool_Common_Uuid.uuid(),
    principalIdentifier: KPool_Common_Uuid.nullish(),
    category: z.number().int(),
    name: z.string(),
    createdAt: KPool_Common_Timestamp,
    content: z.string(),
    replies: z.array(ContactReplyDetail),
  })
  .passthrough();
const ContactCategory = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(99),
]);
const SubmitContactRequestBody = z
  .object({
    category: ContactCategory,
    name: z.string(),
    email: z.string(),
    content: z.string(),
  })
  .passthrough();
const ContactSummary = z
  .object({
    contactIdentifier: KPool_Common_Uuid,
    principalIdentifier: KPool_Common_Uuid.nullish(),
    category: z.number().int(),
    name: z.string(),
    email: z.string(),
    content: z.string(),
  })
  .passthrough();
const principalIdentifier = KPool_Common_Uuid.nullish();
const ListContactsPage = z
  .object({
    contacts: z.array(MyContactSummary),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const ReplyContactRequestBody = z
  .object({ content: z.string().min(1) })
  .passthrough();
const AnnouncementCategory = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const AnnouncementLocalizedContent = z
  .object({
    title: z.string().min(1).max(64),
    content: z.string().min(1).max(2048),
  })
  .passthrough();
const AnnouncementContents = z
  .object({
    ja: AnnouncementLocalizedContent,
    ko: AnnouncementLocalizedContent,
    en: AnnouncementLocalizedContent,
  })
  .partial()
  .passthrough();
const DraftAnnouncement = z
  .object({
    announcementIdentifier: KPool_Common_UuidV7.regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    ).uuid(),
    sourceLanguage: z.enum(["ja", "ko", "en"]),
    category: AnnouncementCategory,
    contents: AnnouncementContents,
    publishedDate: KPool_Common_DateString,
  })
  .passthrough();
const ListDraftAnnouncementsPage = z
  .object({
    announcements: z.array(DraftAnnouncement),
    current_page: z.number().int().gte(1),
    last_page: z.number().int().gte(1),
    total: z.number().int().gte(0),
    per_page: z.number().int().gte(1).lte(100),
  })
  .passthrough();
const CreateAnnouncementRequestBody = z
  .object({
    language: z.enum(["ja", "ko", "en"]),
    category: AnnouncementCategory,
    title: z.string().min(1).max(64),
    content: z.string().min(1).max(2048),
    publishedDate: KPool_Common_DateString,
  })
  .passthrough();
const UpdateAnnouncementRequestBody = z
  .object({
    language: z.enum(["ja", "ko", "en"]),
    category: AnnouncementCategory,
    title: z.string().min(1).max(64),
    content: z.string().min(1).max(2048),
    publishedDate: KPool_Common_DateString,
  })
  .passthrough();
const DeleteAnnouncementResponse = z
  .object({ announcements: z.array(DraftAnnouncement).max(1) })
  .passthrough();
const PublishedAnnouncementContents = z
  .object({
    ja: AnnouncementLocalizedContent,
    ko: AnnouncementLocalizedContent,
    en: AnnouncementLocalizedContent,
  })
  .passthrough();
const PublishedAnnouncement = z
  .object({
    announcementIdentifier: KPool_Common_UuidV7.regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    ).uuid(),
    sourceLanguage: z.enum(["ja", "ko", "en"]),
    category: AnnouncementCategory,
    contents: PublishedAnnouncementContents,
    publishedDate: KPool_Common_DateString,
  })
  .passthrough();
const PublishAnnouncementResponse = z
  .object({ announcements: z.array(PublishedAnnouncement).min(1).max(1) })
  .passthrough();
const TranslateAnnouncementResponse = z
  .object({ announcements: z.array(DraftAnnouncement).min(1).max(1) })
  .passthrough();
const PrincipalGroupMember = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    identityIdentifier: KPool_Common_Uuid.uuid(),
    identityName: z.string(),
    email: z.string(),
  })
  .passthrough();
const PrincipalGroup = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid.uuid(),
    accountIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    roleIdentifiers: z.array(KPool_Common_Uuid),
    isDefault: z.boolean(),
    members: z.array(PrincipalGroupMember),
  })
  .passthrough();
const PrincipalGroupList = z
  .object({
    principalGroups: z.array(PrincipalGroup),
    principals: z.array(PrincipalGroupMember),
  })
  .passthrough();
const UpdatePrincipalGroupMembersItem = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid.uuid(),
    principalIdentifiers: z.array(KPool_Common_Uuid),
  })
  .passthrough();
const UpdatePrincipalGroupMembersRequestBody = z
  .object({ principalGroups: z.array(UpdatePrincipalGroupMembersItem) })
  .passthrough();
const UpdatedPrincipalGroup = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid.uuid(),
    accountIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isDefault: z.boolean(),
    memberCount: z.number().int(),
  })
  .passthrough();
const UpdatePrincipalGroupMembersResponse = z
  .object({ principalGroups: z.array(UpdatedPrincipalGroup) })
  .passthrough();

export const schemas = {
  KPool_Common_UuidV7,
  KPool_Common_DateString,
  PublishedAnnouncementSummary,
  ListAnnouncementsPage,
  KPool_Common_ProblemDetails,
  KPool_Common_Uuid,
  KPool_Common_Timestamp,
  MyContactSummary,
  ContactReplyDetail,
  ContactDetail,
  ContactCategory,
  SubmitContactRequestBody,
  ContactSummary,
  principalIdentifier,
  ListContactsPage,
  ReplyContactRequestBody,
  AnnouncementCategory,
  AnnouncementLocalizedContent,
  AnnouncementContents,
  DraftAnnouncement,
  ListDraftAnnouncementsPage,
  CreateAnnouncementRequestBody,
  UpdateAnnouncementRequestBody,
  DeleteAnnouncementResponse,
  PublishedAnnouncementContents,
  PublishedAnnouncement,
  PublishAnnouncementResponse,
  TranslateAnnouncementResponse,
  PrincipalGroupMember,
  PrincipalGroup,
  PrincipalGroupList,
  UpdatePrincipalGroupMembersItem,
  UpdatePrincipalGroupMembersRequestBody,
  UpdatedPrincipalGroup,
  UpdatePrincipalGroupMembersResponse,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/announcements",
    alias: "AnnouncementOperations_listAnnouncements",
    description: `List published announcements without authentication. Filter by the requested language before pagination; drafts and unavailable translations are excluded. When language is omitted or null, resolve ja/ko/en from Accept-Language, falling back to English. Laravel resolves the page query automatically.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Query",
        schema: z.enum(["ja", "ko", "en"]).nullish(),
      },
      {
        name: "Accept-Language",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).nullish(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).nullish(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.enum(["asc", "desc"]).nullish(),
      },
      {
        name: "sort",
        type: "Query",
        schema: z.enum(["published_date", "title"]).nullish(),
      },
      {
        name: "searchWords",
        type: "Query",
        schema: z.string().nullish(),
      },
    ],
    response: ListAnnouncementsPage,
    errors: [
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
    path: "/announcements/:announcementIdentifier",
    alias: "AnnouncementOperations_getAnnouncement",
    description: `Get a published announcement without authentication in the selected language. When language is omitted or null, resolve Accept-Language with an English fallback. A missing announcement, a draft-only identifier or an unavailable translation returns 404.`,
    requestFormat: "json",
    parameters: [
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
      {
        name: "language",
        type: "Query",
        schema: z.enum(["ja", "ko", "en"]).nullish(),
      },
      {
        name: "Accept-Language",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: PublishedAnnouncementSummary,
    errors: [
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
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
    path: "/contact/principals/:principalIdentifier",
    alias: "ContactOperations_listContactsByPrincipal",
    description: `List contact inquiries for the specified principal. Requires a site-management Operator.`,
    requestFormat: "json",
    parameters: [
      {
        name: "principalIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(MyContactSummary),
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
    path: "/contact/principals/:principalIdentifier/:contactIdentifier",
    alias: "ContactOperations_getContactDetail",
    description: `Get the specified contact inquiry for an principal. Requires a site-management Operator.`,
    requestFormat: "json",
    parameters: [
      {
        name: "principalIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "contactIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ContactDetail,
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
    path: "/contact/submit",
    alias: "ContactOperations_submitContact",
    description: `Submit a contact inquiry.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SubmitContactRequestBody,
      },
    ],
    response: ContactSummary,
    errors: [
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
    path: "/contacts",
    alias: "ContactListOperations_listContacts",
    description: `List all contact inquiries, optionally filtered by principal. Requires a site-management Operator.`,
    requestFormat: "json",
    parameters: [
      {
        name: "principalIdentifier",
        type: "Query",
        schema: principalIdentifier,
      },
      {
        name: "hasReply",
        type: "Query",
        schema: z.enum(["0", "1"]).nullish(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).nullish(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).nullish(),
      },
    ],
    response: ListContactsPage,
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
    path: "/contacts/:contactIdentifier/replies",
    alias: "ContactListOperations_replyContact",
    description: `Send a reply to a contact inquiry. Requires a site-management Operator. Returns no payload; mail delivery failures retain failed reply history and return 500.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ content: z.string().min(1) }).passthrough(),
      },
      {
        name: "contactIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: z.void(),
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
    path: "/draft-announcements",
    alias: "DraftAnnouncementOperations_listDraftAnnouncements",
    description: `List draft announcements, including untranslated drafts, with all available language contents. Requires announcement:view-draft on announcement, granted to the system Operator role. General and Administrator alone are denied. The acting principal is resolved from the session; no principal or Account identifier is accepted as a selector. Search matches titles and bodies across available languages. Laravel resolves the page query automatically. Matching drafts are ordered by the selected field and then by identifier for stable pagination.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).nullish(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).nullish(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.enum(["asc", "desc"]).nullish(),
      },
      {
        name: "sort",
        type: "Query",
        schema: z.enum(["published_date", "created_at"]).nullish(),
      },
      {
        name: "searchWords",
        type: "Query",
        schema: z.string().nullish(),
      },
    ],
    response: ListDraftAnnouncementsPage,
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
    path: "/draft-announcements",
    alias: "DraftAnnouncementCommandOperations_createAnnouncement",
    description: `Create a draft. Requires announcement:create on announcement. Acting principal is resolved from the session. Returns one draft with its generated identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateAnnouncementRequestBody,
      },
    ],
    response: DraftAnnouncement,
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
    path: "/draft-announcements/:announcementIdentifier",
    alias: "DraftAnnouncementOperations_getDraftAnnouncement",
    description: `Get a draft announcement with all available language contents. Requires announcement:view-draft on announcement, granted to the system Operator role. Authorization is checked before reading the draft. A missing or deleted draft, including an identifier that exists only as a published announcement, returns 404. Invalid identifiers return 422.`,
    requestFormat: "json",
    parameters: [
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: DraftAnnouncement,
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
    method: "put",
    path: "/draft-announcements/:announcementIdentifier",
    alias: "DraftAnnouncementCommandOperations_updateAnnouncement",
    description: `Update an existing draft&#x27;s common metadata and selected language content. Requires announcement:update on announcement. A missing draft returns 404.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateAnnouncementRequestBody,
      },
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: DraftAnnouncement,
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
    method: "delete",
    path: "/draft-announcements/:announcementIdentifier",
    alias: "DraftAnnouncementCommandOperations_deleteAnnouncement",
    description: `Delete only the draft and all its language contents. Requires announcement:delete on announcement. Published contents are never deleted. Missing drafts succeed with an empty announcements array.`,
    requestFormat: "json",
    parameters: [
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: DeleteAnnouncementResponse,
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
    path: "/draft-announcements/:announcementIdentifier/publish",
    alias: "DraftAnnouncementCommandOperations_publishAnnouncement",
    description: `Publish a draft under the same identifier. Requires announcement:publish on announcement. Non-blank titles and bodies in all ja/ko/en languages are required; incomplete contents return 422. A missing draft returns 404. Saving the published contents and deleting the draft occur in one transaction. Existing published contents are updated under the same identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: PublishAnnouncementResponse,
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
    path: "/draft-announcements/:announcementIdentifier/translate",
    alias: "DraftAnnouncementCommandOperations_translateAnnouncement",
    description: `Fill only missing ja/ko/en contents from the draft&#x27;s source language. Requires announcement:translate on announcement. Retains the same identifier, existing translations and manual edits. Saves only after all requested translations succeed. Translation-provider failure returns 500 and leaves the draft unchanged.`,
    requestFormat: "json",
    parameters: [
      {
        name: "announcementIdentifier",
        type: "Path",
        schema: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          .uuid(),
      },
    ],
    response: TranslateAnnouncementResponse,
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
    path: "/my/contact",
    alias: "MyContactOperations_listMyContacts",
    description: `List contact inquiries associated with the signed-in principal, newest first.`,
    requestFormat: "json",
    response: z.array(MyContactSummary),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    path: "/my/contact/:contactIdentifier",
    alias: "MyContactOperations_getMyContactDetail",
    description: `Get a contact inquiry associated with the signed-in principal.`,
    requestFormat: "json",
    parameters: [
      {
        name: "contactIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ContactDetail,
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
    path: "/principal-groups",
    alias: "PrincipalGroupOperations_listPrincipalGroups",
    description: `List all editable groups and all principals of the server-resolved current Account. Requires principal-group:manage on principal_group. No accountIdentifier query. Missing Principal or insufficient permission returns 403. Existing identity/auth/me provides the current Principal and policies.`,
    requestFormat: "json",
    response: PrincipalGroupList,
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
    method: "patch",
    path: "/principal-groups/members",
    alias: "PrincipalGroupOperations_updatePrincipalGroupMembers",
    description: `Replace membership of specified groups and retain omitted groups. Empty member arrays remove all members. Duplicate group IDs and duplicate members within one group return 422; multiple group membership is allowed. Requires principal-group:manage on principal_group. System Operator groups, including mixed-role groups, return 403. Missing or other-Account groups/principals return 404. Removing the last real same-Account Administrator across editable groups returns 422. Returns summaries of the updated groups only; clients fetch the list separately. Self-removal succeeds when another Administrator remains, without reauthorization until the next request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdatePrincipalGroupMembersRequestBody,
      },
    ],
    response: UpdatePrincipalGroupMembersResponse,
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

export const siteManagementApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
