import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const translationSetIdentifier = KPool_Common_Uuid.nullish();
const DraftImageWikiDisplayInformation = z
  .object({ names: z.record(z.string()), slug: z.string() })
  .passthrough();
const DraftImageStatus = z.enum([
  "approved",
  "pending",
  "rejected",
  "under_review",
]);
const DraftImageListItem = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    publishedImageIdentifier: KPool_Common_Uuid.nullable(),
    url: z.string(),
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    displayOrder: z.number().int(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    altText: z.string(),
    wiki: DraftImageWikiDisplayInformation,
    status: DraftImageStatus,
    uploadedAt: z.string().nullable(),
  })
  .passthrough();
const ListDraftImagesResponseBody = z
  .object({
    images: z.array(DraftImageListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
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
const DraftWikiStatus = z.enum([
  "approved",
  "pending",
  "rejected",
  "under_review",
]);
const WikiHexColor = z.string();
const WikiFontStyle = z.enum([
  "ja_pop",
  "ja_gothic",
  "ja_mincho",
  "ja_artistic",
  "ja_handwritten",
  "ko_rounded",
  "ko_gothic",
  "ko_myungjo",
  "ko_modern",
  "ko_handwritten",
  "en_sans",
  "en_serif",
  "en_display",
  "en_modern",
  "en_handwritten",
]);
const SeoTitleText = z.string();
const MetaDescriptionText = z.string();
const SeoKeywordText = z.string();
const DraftWikiRejectionReasonText = z.string();
const DraftWikiListItem = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    publishedWikiIdentifier: KPool_Common_Uuid.nullable(),
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    status: DraftWikiStatus,
    rejectionReason: DraftWikiRejectionReasonText.nullable(),
    name: z.string(),
    normalizedName: z.string(),
    imageIdentifier: KPool_Common_Uuid.nullable(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
    isHidden: z.boolean().nullable(),
    editedAt: z.string().nullable(),
    approvedAt: z.string().nullable(),
    translatedAt: z.string().nullable(),
    mergedAt: z.string().nullable(),
  })
  .passthrough();
const ListDraftWikisResponseBody = z
  .object({
    wikis: z.array(DraftWikiListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const ImageDeletionRequestListItem = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    url: z.string(),
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    displayOrder: z.number().int(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    altText: z.string(),
    isHidden: z.boolean(),
    uploadedAt: z.string().nullable(),
    name: z.string(),
    email: z.string(),
    reason: z.string(),
  })
  .passthrough();
const ListImageDeletionRequestsResponseBody = z
  .object({
    images: z.array(ImageDeletionRequestListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const UploadImageRequestBody = z
  .object({
    publishedImageIdentifier: KPool_Common_Uuid.optional(),
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    base64EncodedImage: z.string(),
    displayOrder: z.number().int(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    altText: z.string(),
    agreedToTermsAt: z.string(),
    rightsConfirmationAgreed: z.boolean(),
  })
  .passthrough();
const ImageDraftSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    status: z.string(),
  })
  .passthrough();
const ImageDeletionApprovalSummary = z
  .object({ imageIdentifier: KPool_Common_Uuid, isHidden: z.boolean() })
  .passthrough();
const ImageSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    isHidden: z.boolean(),
  })
  .passthrough();
const RejectImageDeletionRequestBody = z
  .object({ rejectReason: z.string() })
  .passthrough();
const ImageDeletionRejectionSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    rejectReason: z.string(),
    isHidden: z.boolean(),
  })
  .passthrough();
const RequestImageDeletionRequestBody = z
  .object({
    requesterName: z.string(),
    requesterEmail: z.string(),
    reason: z.string(),
  })
  .passthrough();
const ImageDeletionRequestSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    requesterName: z.string(),
    requesterEmail: z.string(),
    reason: z.string(),
    isHidden: z.boolean(),
  })
  .passthrough();
const UploadedImageListItem = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    url: z.string(),
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    displayOrder: z.number().int(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    altText: z.string(),
    isHidden: z.boolean(),
    uploadedAt: z.string().nullable(),
  })
  .passthrough();
const ListUploadedImagesResponseBody = z
  .object({
    images: z.array(UploadedImageListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const MaterialSearchWikiType = z.enum(["agency", "group", "talent", "song"]);
const MaterialSearchRelatedWiki = z
  .object({
    identifier: KPool_Common_Uuid.uuid(),
    title: z.string().min(1).max(255),
    resourceType: MaterialSearchWikiType,
    relationType: z.string().min(1).max(100),
  })
  .passthrough();
const SearchFreeMaterialsRequestBody = z
  .object({
    title: z.string().max(255).nullish(),
    displayName: z.string().max(255).nullish(),
    resourceType: MaterialSearchWikiType,
    language: z.enum(["ja", "en", "ko"]),
    relatedWikis: z.array(MaterialSearchRelatedWiki).max(100),
  })
  .passthrough();
const FreeMaterialSite = z
  .object({
    siteName: z.string().min(1).max(4096),
    pageUrl: z.string().url(),
    reason: z.string().min(1).max(4096),
    usageEvidence: z.string().min(1).max(4096),
    usageEvidenceUrl: z.string().url(),
  })
  .passthrough();
const SearchFreeMaterialsResponseBody = z
  .object({ sites: z.array(FreeMaterialSite).max(3) })
  .passthrough();
const OfficialCertificationOwnerAccount = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    email: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
    category: z.string(),
  })
  .passthrough();
const WikiListItem = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    imageIdentifier: KPool_Common_Uuid.nullable(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
    isHidden: z.boolean().nullable(),
    name: z.string(),
    normalizedName: z.string(),
    publishedAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  })
  .passthrough();
const OfficialCertificationListItem = z
  .object({
    certificationIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    ownerAccount: OfficialCertificationOwnerAccount.nullable(),
    wikis: z.array(WikiListItem),
    status: z.string(),
    requestedAt: z.string().datetime({ offset: true }),
    approvedAt: z.string().datetime({ offset: true }).nullable(),
    rejectedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const ListMyOwnedWikisResponseBody = z
  .object({
    accountCategory: z.enum(["agency", "talent", "general"]),
    primaryOwnedWikis: z.array(WikiListItem),
    otherOwnedWikis: z.array(WikiListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const PlaylistListItem = z
  .object({
    playlistIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string().min(1).max(32),
    videoCount: z.number().int().gte(0).lte(50),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .passthrough();
const CreatePlaylistRequestBody = z.object({ name: z.string() }).passthrough();
const CreatedPlaylist = z
  .object({
    playlistIdentifier: KPool_Common_Uuid.uuid(),
    name: z.string().min(1).max(32),
    videoCount: z.literal(0),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .passthrough();
const SavePlaylistItem = z.union([
  z
    .object({
      provider: z.literal("youtube"),
      externalVideoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
    })
    .passthrough(),
  z
    .object({
      provider: z.literal("tiktok"),
      externalVideoId: z.string().regex(/^[1-9][0-9]{14,19}$/),
    })
    .passthrough(),
  z.object({ videoLinkIdentifier: KPool_Common_Uuid.uuid() }).passthrough(),
]);
const SavePlaylistRequestBody = z
  .object({ name: z.string(), items: z.array(SavePlaylistItem).max(50) })
  .passthrough();
const PlaylistDetail = PlaylistListItem;
const LikedVideoPlaylist = z
  .object({ playlistIdentifier: KPool_Common_Uuid.uuid(), name: z.string() })
  .passthrough();
const LikedVideoLink = z
  .object({
    provider: z.enum(["youtube", "tiktok"]),
    externalVideoId: z.string(),
    videoLinkIdentifier: KPool_Common_Uuid.uuid(),
    url: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    durationSeconds: z.number().int().gte(0).nullable(),
    language: z.enum(["ja", "ko", "en"]),
    resourceType: z.enum(["agency", "group", "song", "talent"]),
    slug: z.string(),
    likedAt: z.string(),
    isOfficialOwnerLike: z.boolean(),
    playlists: z.array(LikedVideoPlaylist),
  })
  .passthrough();
const VideoLinkLikesPagination = z
  .object({
    currentPage: z.number().int(),
    perPage: z.number().int(),
    total: z.number().int(),
  })
  .passthrough();
const VideoWatchRequestStatus = z
  .object({
    videoLinkIdentifier: KPool_Common_Uuid.uuid(),
    sent: z.boolean(),
    canSend: z.boolean(),
    reason: z
      .enum([
        "target_not_eligible",
        "duration_not_eligible",
        "like_required",
        "resend_not_available",
        "weekly_limit_reached",
        "already_watched",
      ])
      .nullable(),
    lastSentAt: z.string().nullable(),
    nextSendAt: z.string().nullable(),
    remainingRequests: z.number().int().gte(0),
    unlikeRestrictedUntil: z.string().nullable(),
    deleteRestrictedUntil: z.string().nullable(),
  })
  .passthrough();
const SyncOwnedWikiCertificationsRequestBody = z
  .object({ translationSetIdentifiers: z.array(KPool_Common_Uuid) })
  .passthrough();
const SyncedOfficialCertificationResource = z
  .object({
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const RequestCertificationRequestBody = z
  .object({
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const OfficialCertificationSummary = z
  .object({
    certificationIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    translationSetIdentifier: KPool_Common_Uuid,
    status: z.string(),
  })
  .passthrough();
const PolicyConditionClause = z
  .object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.array(z.string()), z.boolean()]),
  })
  .passthrough();
const PolicyCondition = z
  .object({ clauses: z.array(PolicyConditionClause) })
  .partial()
  .passthrough();
const PolicyStatement = z
  .object({
    effect: z.string(),
    actions: z.array(z.string()),
    resourceTypes: z.array(z.string()),
    condition: PolicyCondition.nullish(),
  })
  .passthrough();
const CreatePolicyRequestBody = z
  .object({
    name: z.string(),
    statements: z.array(PolicyStatement),
    accountId: KPool_Common_Uuid.nullish(),
  })
  .passthrough();
const PolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemPolicy: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();
const CreatePrincipalGroupRequestBody = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    description: z.string().max(256).nullish(),
  })
  .passthrough();
const PrincipalGroupSummary = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    description: z.string().max(256).nullish(),
    isDefault: z.boolean(),
    memberCount: z.number().int(),
    createdAt: z.string(),
  })
  .passthrough();
const MutatePrincipalGroupMemberRequestBody = z
  .object({ principalIdentifier: KPool_Common_Uuid })
  .passthrough();
const AttachRoleToPrincipalGroupRequestBody = z
  .object({ roleIdentifier: KPool_Common_Uuid })
  .passthrough();
const KPool_Common_PrincipalStatus = z.enum([
  "active",
  "suspended",
  "forced_stop",
]);
const PrincipalGroupMemberSummary = z
  .object({
    status: KPool_Common_PrincipalStatus,
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    email: z.string(),
  })
  .passthrough();
const PrincipalGroupManagementSummary = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    description: z.string().max(256).nullish(),
    roleIdentifiers: z.array(KPool_Common_Uuid),
    isDefault: z.boolean(),
    members: z.array(PrincipalGroupMemberSummary),
  })
  .passthrough();
const ListPrincipalGroupsResponseBody = z
  .object({ principalGroups: z.array(PrincipalGroupManagementSummary) })
  .passthrough();
const UpdatePrincipalGroupMembersItem = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    principalIdentifiers: z.array(KPool_Common_Uuid),
  })
  .passthrough();
const KPool_Common_PrincipalStatusUpdate = z
  .object({
    principalIdentifier: KPool_Common_Uuid.uuid(),
    status: KPool_Common_PrincipalStatus,
  })
  .passthrough();
const UpdatePrincipalGroupMembersRequestBody = z
  .object({
    principalGroups: z.array(UpdatePrincipalGroupMembersItem),
    principalStatuses: z.array(KPool_Common_PrincipalStatusUpdate).optional(),
  })
  .passthrough();
const KPool_Common_PrincipalStatusConflictProblem = KPool_Common_ProblemDetails;
const CreatePrincipalRequestBody = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const CreatedPrincipalSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    isDelegatedPrincipal: z.boolean(),
    status: KPool_Common_PrincipalStatus,
  })
  .passthrough();
const EffectivePolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemPolicy: z.boolean(),
    statements: z.array(PolicyStatement),
  })
  .passthrough();
const PrincipalSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    isDelegatedPrincipal: z.boolean(),
    status: KPool_Common_PrincipalStatus,
    policies: z.array(EffectivePolicySummary),
    accountPrincipalCount: z.number().int().gte(1),
  })
  .passthrough();
const CreateRoleRequestBody = z
  .object({
    name: z.string(),
    policies: z.array(KPool_Common_Uuid).optional(),
    accountId: KPool_Common_Uuid.nullish(),
  })
  .passthrough();
const RoleSummary = z
  .object({
    roleIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemRole: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();
const AttachPolicyToRoleRequestBody = z
  .object({ policyIdentifier: KPool_Common_Uuid })
  .passthrough();
const SitemapWiki = z
  .object({
    slug: z.string(),
    language: z.string(),
    resourceType: z.enum(["agency", "group", "talent", "song"]),
    lastModifiedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const ListSitemapWikisResponseBody = z
  .object({
    wikis: z.array(SitemapWiki).max(1000),
    nextCursor: KPool_Common_Uuid.nullable(),
  })
  .passthrough();
const CreateVideoLinkRequestBody = z
  .object({
    resourceType: z.enum(["agency", "group", "song", "talent"]),
    wikiIdentifier: KPool_Common_Uuid.uuid(),
    url: z.string().max(255),
    videoUsage: z.enum([
      "music_video",
      "live",
      "interview",
      "behind_the_scenes",
      "cover",
      "collaboration",
      "short",
      "other",
    ]),
    title: z.string().max(255),
    durationSeconds: z.number().int().gte(0).nullish(),
    thumbnailUrl: z.string().nullish(),
    publishedAt: z.string().nullish(),
  })
  .passthrough();
const TranslationSetMasterSearchWikiItem = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    language: z.string(),
    name: z.string(),
    slug: z.string(),
  })
  .passthrough();
const TranslationSetMasterSearchItem = z
  .object({
    translationSetIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    wikis: z.array(TranslationSetMasterSearchWikiItem),
  })
  .passthrough();
const SearchTranslationSetMasterWikisResponseBody = z
  .object({ translationSetMasters: z.array(TranslationSetMasterSearchItem) })
  .passthrough();
const DraftWikiHeroImage = z
  .object({
    imageIdentifier: KPool_Common_Uuid.nullable(),
    src: z.string().nullable(),
    alt: z.string().nullable(),
    sourceUrl: z.string().nullish(),
    sourceName: z.string().nullish(),
    isHidden: z.boolean().nullable(),
  })
  .passthrough();
const AgencyDraftWikiBasic = z
  .object({
    name: z.string(),
    normalizedName: z.string(),
    ceo: z.string(),
    normalizedCeo: z.string(),
    foundedIn: z.string().nullable(),
    parentAgencyIdentifier: KPool_Common_Uuid.nullable(),
    status: z.string().nullable(),
    officialWebsite: z.string().nullable(),
    socialLinks: z.array(z.string()),
  })
  .passthrough();
const AgencyDraftWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    status: z.string(),
    rejectionReason: DraftWikiRejectionReasonText.nullable(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: DraftWikiHeroImage,
    basic: AgencyDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const AutoCreateWikiRequestBody = z
  .object({
    resourceType: z.string(),
    language: z.string(),
    slug: z.string(),
    name: z.string(),
    notes: z.string().max(2000).nullish(),
    agencyIdentifier: KPool_Common_Uuid.nullish(),
    groupIdentifiers: z.array(KPool_Common_Uuid).optional(),
    talentIdentifiers: z.array(KPool_Common_Uuid).optional(),
  })
  .passthrough();
const DraftWikiSummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    language: z.string(),
    name: z.string(),
    resourceType: z.string(),
    status: z.string(),
  })
  .passthrough();
const WikiAssociationTargets = z
  .object({
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    groupIdentifiers: z.array(KPool_Common_Uuid),
    talentIdentifiers: z.array(KPool_Common_Uuid),
  })
  .partial()
  .passthrough();
const CreateWikiRequestBody = WikiAssociationTargets;
const WikiAgencySummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    name: z.string(),
    normalizedName: z.string(),
  })
  .passthrough();
const OfficialColor = z
  .object({ colorCode: WikiHexColor, label: z.string().max(16) })
  .passthrough();
const GroupDraftWikiBasic = z
  .object({
    name: z.string(),
    normalizedName: z.string(),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    agency: WikiAgencySummary.nullable(),
    groupType: z.string().nullable(),
    status: z.string().nullable(),
    generation: z.string().nullable(),
    debutDate: z.string().nullable(),
    disbandDate: z.string().nullable(),
    fandomName: z.string(),
    officialColors: z.array(OfficialColor),
    emoji: z.string(),
    representativeSymbol: z.string(),
  })
  .passthrough();
const DraftWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    status: z.string(),
    rejectionReason: DraftWikiRejectionReasonText.nullable(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: DraftWikiHeroImage,
    basic: GroupDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const SongDraftWikiGroupSummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    groupType: z.string().nullable(),
    status: z.string().nullable(),
    generation: z.string().nullable(),
    debutDate: z.string().nullable(),
    disbandDate: z.string().nullable(),
    fandomName: z.string(),
    officialColors: z.array(OfficialColor),
    emoji: z.string(),
    representativeSymbol: z.string(),
  })
  .passthrough();
const SongDraftWikiTalentSummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    realName: z.string(),
    normalizedRealName: z.string(),
    birthday: z.string().nullable(),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    emoji: z.string(),
    representativeSymbol: z.string(),
    position: z.string(),
    mbti: z.string().nullable(),
    zodiacSign: z.string().nullable(),
    englishLevel: z.string().nullable(),
    height: z.union([z.number(), z.string()]).nullable(),
    bloodType: z.string().nullable(),
    fandomName: z.string(),
  })
  .passthrough();
const SongDraftWikiBasic = z
  .object({
    name: z.string(),
    normalizedName: z.string(),
    songType: z.string().nullable(),
    genres: z.array(z.string()),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    agency: WikiAgencySummary.nullable(),
    releaseDate: z.string().nullable(),
    albumName: z.string().nullable(),
    lyricist: z.string(),
    normalizedLyricist: z.string(),
    composer: z.string(),
    normalizedComposer: z.string(),
    arranger: z.string(),
    normalizedArranger: z.string(),
    groups: z.array(SongDraftWikiGroupSummary),
    talents: z.array(SongDraftWikiTalentSummary),
  })
  .passthrough();
const SongDraftWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    status: z.string(),
    rejectionReason: DraftWikiRejectionReasonText.nullable(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: DraftWikiHeroImage,
    basic: SongDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const TalentDraftWikiGroupSummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    groupType: z.string().nullable(),
    status: z.string().nullable(),
    generation: z.string().nullable(),
    debutDate: z.string().nullable(),
    disbandDate: z.string().nullable(),
    fandomName: z.string(),
    officialColors: z.array(OfficialColor),
    emoji: z.string(),
    representativeSymbol: z.string(),
  })
  .passthrough();
const TalentDraftWikiBasic = z
  .object({
    name: z.string(),
    normalizedName: z.string(),
    realName: z.string(),
    normalizedRealName: z.string(),
    birthday: z.string().nullable(),
    agencyIdentifier: KPool_Common_Uuid.nullable(),
    agency: WikiAgencySummary.nullable(),
    emoji: z.string(),
    representativeSymbol: z.string(),
    position: z.string(),
    mbti: z.string().nullable(),
    zodiacSign: z.string().nullable(),
    englishLevel: z.string().nullable(),
    height: z.union([z.number(), z.string()]).nullable(),
    bloodType: z.string().nullable(),
    fandomName: z.string(),
    groups: z.array(TalentDraftWikiGroupSummary),
  })
  .passthrough();
const TalentDraftWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    status: z.string(),
    rejectionReason: DraftWikiRejectionReasonText.nullable(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: DraftWikiHeroImage,
    basic: TalentDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const WikiHeroImage = z
  .object({
    imageIdentifier: KPool_Common_Uuid.nullable(),
    src: z.string().nullable(),
    alt: z.string().nullable(),
    sourceUrl: z.string().nullish(),
    sourceName: z.string().nullish(),
    isHidden: z.boolean().nullable(),
  })
  .passthrough();
const AgencyWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    isOfficial: z.boolean(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: WikiHeroImage,
    basic: AgencyDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const WikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    isOfficial: z.boolean(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: WikiHeroImage,
    basic: GroupDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const SongWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    isOfficial: z.boolean(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: WikiHeroImage,
    basic: SongDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const TalentWikiDetail = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    translationSetIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    isOfficial: z.boolean(),
    themeColor: WikiHexColor.nullable(),
    fontStyle: WikiFontStyle.nullable(),
    title: SeoTitleText.nullable(),
    metaDescription: MetaDescriptionText.nullable(),
    keywords: z.array(SeoKeywordText).max(5).nullable(),
    heroImage: WikiHeroImage,
    basic: TalentDraftWikiBasic,
    sections: z.array(z.unknown()),
  })
  .passthrough();
const Video = z
  .object({
    provider: z.enum(["youtube", "tiktok"]),
    externalVideoId: z.string(),
    videoLinkIdentifier: KPool_Common_Uuid.uuid(),
    likeCount: z.number().int().gte(0),
    hasOfficialOwnerLike: z.boolean(),
    hasOfficialOwnerWatch: z.boolean().optional(),
    url: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    publishedAt: z.string().nullable(),
    durationSeconds: z.number().int().gte(0).nullable(),
    creatorPrincipalIdentifier: KPool_Common_Uuid.nullable(),
    creatorIdentityName: z.string().nullable(),
    videoUsage: z.enum([
      "music_video",
      "live",
      "interview",
      "behind_the_scenes",
      "cover",
      "collaboration",
      "short",
      "other",
      "youtube_auto_view_count",
      "youtube_auto_like_count",
      "youtube_auto_recent_popular",
    ]),
  })
  .passthrough();
const RelatedProfileItem = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    imageIdentifier: KPool_Common_Uuid.nullable(),
    imageUrl: z.string().nullable(),
    imageAltText: z.string().nullable(),
  })
  .passthrough();
const ListRelatedProfilesResponseBody = z
  .object({ profiles: z.array(RelatedProfileItem) })
  .passthrough();
const ListRelatedWikisResponseBody = z
  .object({ wikis: z.array(WikiListItem) })
  .passthrough();
const DeleteWikiRequestBody = WikiAssociationTargets;
const WikiWorkflowRequestBody = WikiAssociationTargets;
const UpdateWikiDraftRequestBody = WikiAssociationTargets;
const PublishedWikiSummary = z
  .object({
    wikiIdentifier: KPool_Common_Uuid,
    language: z.string(),
    name: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    isOfficial: z.boolean(),
  })
  .passthrough();
const RejectWikiRequestBody = WikiAssociationTargets;
const RollbackWikiRequestBody = WikiAssociationTargets;
const RollbackWikiResponseBody = z
  .object({ wikis: z.array(PublishedWikiSummary) })
  .passthrough();
const TranslateWikiResponseBody = z
  .object({ draftWikis: z.array(DraftWikiSummary) })
  .passthrough();
const WithdrawWikiRequestBody = WikiAssociationTargets;
const ListWikisResponseBody = z
  .object({
    wikis: z.array(WikiListItem),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const WikiMasterSearchItem = z
  .object({
    id: KPool_Common_Uuid,
    name: z.string(),
    slug: z.string(),
    resourceType: z.string(),
  })
  .passthrough();
const SearchMasterWikisResponseBody = z
  .object({ wikis: z.array(WikiMasterSearchItem) })
  .passthrough();
const PlaylistItem = z
  .object({
    sourceVideoLinkIdentifier: KPool_Common_Uuid.nullable(),
    provider: z.enum(["youtube", "tiktok"]),
    externalVideoId: z
      .string()
      .regex(/^([a-zA-Z0-9_-]{11}|[1-9][0-9]{14,19})$/),
    position: z.number().int().gte(0).lte(49),
    url: z.string().url(),
    title: z.string(),
    thumbnailUrl: z.string().url().nullable(),
    durationSeconds: z.number().int().nullable(),
  })
  .passthrough();

export const schemas = {
  KPool_Common_Uuid,
  translationSetIdentifier,
  DraftImageWikiDisplayInformation,
  DraftImageStatus,
  DraftImageListItem,
  ListDraftImagesResponseBody,
  KPool_Common_ProblemDetails,
  DraftWikiStatus,
  WikiHexColor,
  WikiFontStyle,
  SeoTitleText,
  MetaDescriptionText,
  SeoKeywordText,
  DraftWikiRejectionReasonText,
  DraftWikiListItem,
  ListDraftWikisResponseBody,
  ImageDeletionRequestListItem,
  ListImageDeletionRequestsResponseBody,
  UploadImageRequestBody,
  ImageDraftSummary,
  ImageDeletionApprovalSummary,
  ImageSummary,
  RejectImageDeletionRequestBody,
  ImageDeletionRejectionSummary,
  RequestImageDeletionRequestBody,
  ImageDeletionRequestSummary,
  UploadedImageListItem,
  ListUploadedImagesResponseBody,
  MaterialSearchWikiType,
  MaterialSearchRelatedWiki,
  SearchFreeMaterialsRequestBody,
  FreeMaterialSite,
  SearchFreeMaterialsResponseBody,
  OfficialCertificationOwnerAccount,
  WikiListItem,
  OfficialCertificationListItem,
  ListMyOwnedWikisResponseBody,
  PlaylistListItem,
  CreatePlaylistRequestBody,
  CreatedPlaylist,
  SavePlaylistItem,
  SavePlaylistRequestBody,
  PlaylistDetail,
  LikedVideoPlaylist,
  LikedVideoLink,
  VideoLinkLikesPagination,
  VideoWatchRequestStatus,
  SyncOwnedWikiCertificationsRequestBody,
  SyncedOfficialCertificationResource,
  RequestCertificationRequestBody,
  OfficialCertificationSummary,
  PolicyConditionClause,
  PolicyCondition,
  PolicyStatement,
  CreatePolicyRequestBody,
  PolicySummary,
  CreatePrincipalGroupRequestBody,
  PrincipalGroupSummary,
  MutatePrincipalGroupMemberRequestBody,
  AttachRoleToPrincipalGroupRequestBody,
  KPool_Common_PrincipalStatus,
  PrincipalGroupMemberSummary,
  PrincipalGroupManagementSummary,
  ListPrincipalGroupsResponseBody,
  UpdatePrincipalGroupMembersItem,
  KPool_Common_PrincipalStatusUpdate,
  UpdatePrincipalGroupMembersRequestBody,
  KPool_Common_PrincipalStatusConflictProblem,
  CreatePrincipalRequestBody,
  CreatedPrincipalSummary,
  EffectivePolicySummary,
  PrincipalSummary,
  CreateRoleRequestBody,
  RoleSummary,
  AttachPolicyToRoleRequestBody,
  SitemapWiki,
  ListSitemapWikisResponseBody,
  CreateVideoLinkRequestBody,
  TranslationSetMasterSearchWikiItem,
  TranslationSetMasterSearchItem,
  SearchTranslationSetMasterWikisResponseBody,
  DraftWikiHeroImage,
  AgencyDraftWikiBasic,
  AgencyDraftWikiDetail,
  AutoCreateWikiRequestBody,
  DraftWikiSummary,
  WikiAssociationTargets,
  CreateWikiRequestBody,
  WikiAgencySummary,
  OfficialColor,
  GroupDraftWikiBasic,
  DraftWikiDetail,
  SongDraftWikiGroupSummary,
  SongDraftWikiTalentSummary,
  SongDraftWikiBasic,
  SongDraftWikiDetail,
  TalentDraftWikiGroupSummary,
  TalentDraftWikiBasic,
  TalentDraftWikiDetail,
  WikiHeroImage,
  AgencyWikiDetail,
  WikiDetail,
  SongWikiDetail,
  TalentWikiDetail,
  Video,
  RelatedProfileItem,
  ListRelatedProfilesResponseBody,
  ListRelatedWikisResponseBody,
  DeleteWikiRequestBody,
  WikiWorkflowRequestBody,
  UpdateWikiDraftRequestBody,
  PublishedWikiSummary,
  RejectWikiRequestBody,
  RollbackWikiRequestBody,
  RollbackWikiResponseBody,
  TranslateWikiResponseBody,
  WithdrawWikiRequestBody,
  ListWikisResponseBody,
  WikiMasterSearchItem,
  SearchMasterWikisResponseBody,
  PlaylistItem,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/draft-images",
    alias: "DraftImageListOperations_listDraftImages",
    description: `List draft images.`,
    requestFormat: "json",
    parameters: [
      {
        name: "translationSetIdentifier",
        type: "Query",
        schema: translationSetIdentifier,
      },
      {
        name: "status",
        type: "Query",
        schema: z.enum(["approved", "pending", "rejected", "under_review"]),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: ListDraftImagesResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    path: "/draft-wikis",
    alias: "DraftWikiListOperations_listDraftWikis",
    description: `List draft wikis with read policy authorization.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "translationSetIdentifier",
        type: "Query",
        schema: z.string().uuid().optional(),
      },
      {
        name: "statuses",
        type: "Query",
        schema: z.array(DraftWikiStatus),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ListDraftWikisResponseBody,
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
    method: "get",
    path: "/image-deletion-requests",
    alias: "ImageDeletionRequestListOperations_listImageDeletionRequests",
    description: `List uploaded images with pending image deletion requests.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().nullish(),
      },
    ],
    response: ListImageDeletionRequestsResponseBody,
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
    method: "delete",
    path: "/image/:imageId",
    alias: "ImageOperations_deleteImage",
    description: `Delete an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/image/:imageId/approve",
    alias: "ImageOperations_approveImage",
    description: `Approve an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageDraftSummary,
    errors: [
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
    path: "/image/:imageId/approve-deletion",
    alias: "ImageOperations_approveImageDeletionRequest",
    description: `Approve an image deletion request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageDeletionApprovalSummary,
    errors: [
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
    path: "/image/:imageId/reject",
    alias: "ImageOperations_rejectImage",
    description: `Reject an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageSummary,
    errors: [
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
    path: "/image/:imageId/reject-deletion",
    alias: "ImageOperations_rejectImageDeletionRequest",
    description: `Reject an image deletion request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ rejectReason: z.string() }).passthrough(),
      },
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageDeletionRejectionSummary,
    errors: [
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
    path: "/image/:imageId/request-deletion",
    alias: "ImageOperations_requestImageDeletion",
    description: `Request that an image be hidden.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestImageDeletionRequestBody,
      },
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageDeletionRequestSummary,
    errors: [
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
    path: "/image/:imageId/unhide",
    alias: "ImageOperations_unhideImage",
    description: `Unhide an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageSummary,
    errors: [
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
    path: "/image/upload",
    alias: "ImageOperations_uploadImage",
    description: `Upload a new image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UploadImageRequestBody,
      },
    ],
    response: ImageDraftSummary,
    errors: [
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
    path: "/images",
    alias: "ImageListOperations_listUploadedImages",
    description: `List uploaded images.`,
    requestFormat: "json",
    parameters: [
      {
        name: "translationSetIdentifier",
        type: "Query",
        schema: z.string().uuid(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: ListUploadedImagesResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    path: "/images/search-free-materials",
    alias: "FreeMaterialSearchOperations_searchFreeMaterials",
    description: `Search free image materials for an unsaved Wiki. Operator and SeniorCollaborator only. Does not store input/results or download images. Provider configuration, transport and parsing failures return 503.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SearchFreeMaterialsRequestBody,
      },
    ],
    response: SearchFreeMaterialsResponseBody,
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
    path: "/my/draft-wikis",
    alias: "MyDraftWikiListOperations_listMyDraftWikis",
    description: `List draft wikis edited by the current principal.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "translationSetIdentifier",
        type: "Query",
        schema: z.string().uuid().optional(),
      },
      {
        name: "statuses",
        type: "Query",
        schema: z.array(DraftWikiStatus),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ListDraftWikisResponseBody,
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
    path: "/my/official-certifications",
    alias: "OfficialCertificationListOperations_listMyOfficialCertifications",
    description: `List official certification requests owned by the current account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z.string().nullish(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().nullish(),
      },
    ],
    response: z
      .object({
        officialCertifications: z.array(OfficialCertificationListItem),
        current_page: z.number().int(),
        last_page: z.number().int(),
        total: z.number().int(),
        per_page: z.number().int(),
      })
      .passthrough(),
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
    method: "get",
    path: "/my/owned-wikis",
    alias: "MyOwnedWikiListOperations_listMyOwnedWikis",
    description: `List published wikis owned by the current account, grouped by account-category relevance.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: ListMyOwnedWikisResponseBody,
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
    path: "/my/playlists",
    alias: "PlaylistOperations_listMyPlaylists",
    description: `List only the authenticated Wiki Principal&#x27;s private playlists in ascending creation time, then identifier order. Requires an active Account/Principal and Wiki collaborator LIST_MY_PLAYLISTS permission. Returns an empty array when none exist, with no pagination. videoCount counts stored PlaylistItems, including items whose source VideoLink was deleted, unliked or unpublished. The caller cannot specify the owner.`,
    requestFormat: "json",
    response: z
      .object({ playlists: z.array(PlaylistListItem).max(3) })
      .passthrough(),
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
    path: "/my/playlists",
    alias: "PlaylistOperations_createPlaylist",
    description: `Create an empty private playlist for the authenticated Wiki Principal; the owner cannot be supplied by the caller. Requires an active Account/Principal and Wiki collaborator CREATE_PLAYLIST permission. Accepts a name of 1-32 characters after trimming, including duplicate names. Returns 409 when the owner already has three playlists; deleting one allows creation again. Invalid names return 422. This endpoint never accepts video metadata from the caller. Playlist items store independent server-provided snapshots and retain them when source VideoLinks disappear.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string() }).passthrough(),
      },
    ],
    response: CreatedPlaylist,
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
    path: "/my/playlists/:playlistId",
    alias: "PlaylistOperations_savePlaylist",
    description: `Atomically replace the authenticated Wiki Principal&#x27;s playlist name, membership and stored order. Each item specifies either an existing provider/externalVideoId pair or a new videoLinkIdentifier. Existing items must belong to this playlist and remain editable after source deletion, unpublication or unlike. New sources must exist in published Wikis (404 otherwise) and be liked by the caller (403 otherwise); all snapshots are resolved by the server. Foreign/missing playlists and foreign/missing items return 404. Invalid names, input shapes, more than 50 entries or duplicate provider/externalVideoId in the final state return 422. Omitting an existing item removes it; an empty array clears the playlist. Repeating a new-source selection reuses an existing item for the same video, preserving its snapshot, but duplicate selections in the same array are rejected. Returns 204 with no body. VideoLinks, likes and other playlists are not modified. Requires active Account/Principal and Wiki collaborator SAVE_PLAYLIST permission. Playback shuffle order is independent of stored order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SavePlaylistRequestBody,
      },
      {
        name: "playlistId",
        type: "Path",
        schema: z.string().uuid(),
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
    method: "delete",
    path: "/my/playlists/:playlistId",
    alias: "PlaylistOperations_deletePlaylist",
    description: `Delete the authenticated Wiki Principal&#x27;s private playlist and its items, returning 204 without a body. Requires an active Account/Principal and Wiki collaborator DELETE_PLAYLIST permission. Other owners and missing identifiers return the same 404; malformed identifiers return 422. Original VideoLinks and likes are preserved. Deletion is reflected in list/detail queries and frees one of the owner&#x27;s three creation slots.`,
    requestFormat: "json",
    parameters: [
      {
        name: "playlistId",
        type: "Path",
        schema: z.string().uuid(),
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
    path: "/my/playlists/:playlistId",
    alias: "PlaylistOperations_getMyPlaylist",
    description: `Return the authenticated Wiki Principal&#x27;s private playlist with all stored items, ordered by position, without pagination. Requires an active Account/Principal and Wiki collaborator GET_MY_PLAYLIST permission. Other owners and missing identifiers return the same 404; malformed identifiers return 422. Empty playlists return items: []. videoCount equals the stored item count. Snapshots remain available after source deletion (sourceVideoLinkIdentifier becomes null), Wiki unpublication or unlike. No YouTube/TikTok requests or collection jobs are triggered; playback failures are handled by the player.`,
    requestFormat: "json",
    parameters: [
      {
        name: "playlistId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PlaylistDetail,
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
    method: "get",
    path: "/my/video-link-likes",
    alias: "VideoLinkLikeOperations_listMyVideoLinkLikes",
    description: `Return likes of the authenticated active Wiki Principal. With videoLinkIds[], return all matching liked IDs in identifier order without pagination, even for non-public or missing wikis; videos includes only existing videos on published wikis and pagination is null. Omitted IDs list existing videos on published wikis across languages and resource types, sorted by likedAt descending then videoLinkIdentifier ascending, with matching IDs in the same order and pagination metadata. Each VideoLink is counted independently even when URLs match. Empty lists return 200. Explicit empty IDs, invalid UUIDs, more than 100 IDs or invalid pagination return 422. Does not accept a principal ID or like kind. Both ordinary and official-owner likes appear in likedVideoLinkIdentifiers and videos; isOfficialOwnerLike on each video identifies the saved kind, not current ownership. The usual authenticated active Account/Principal checks and permissions apply to both kinds.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkIds[]",
        type: "Query",
        schema: z.array(KPool_Common_Uuid).min(1).max(100).optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
    ],
    response: z
      .object({
        likedVideoLinkIdentifiers: z.array(KPool_Common_Uuid),
        videos: z.array(LikedVideoLink),
        pagination: VideoLinkLikesPagination.nullable(),
      })
      .passthrough(),
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
    method: "get",
    path: "/my/video-watch-requests",
    alias: "VideoWatchRequestOperations_listMyVideoWatchRequests",
    description: `Return personal watch-request state for 1 to 100 explicitly supplied video IDs, ordered by videoLinkIdentifier with duplicate IDs collapsed. All IDs must exist (404 otherwise). Requires LIST_MY_VIDEO_WATCH_REQUESTS permission for every target resource type. Send permission is evaluated per video with its real resource attributes; a rejected send policy returns canSend&#x3D;false with target_not_eligible, without rejecting the entire batch. No sender identifier input. Uses the same stored database duration and rolling 168-hour eligibility boundary as sending; missing stored duration yields canSend&#x3D;false with duration_not_eligible. lastSentAt includes historical sends; sent only means an active send. Restrictions are independent: another sender can keep deletion restricted after this caller&#x27;s unlike restriction expires. remainingRequests is scoped to each video&#x27;s exact wiki and caller. This is a snapshot; send always revalidates. This endpoint does not send requests. Missing/empty IDs, invalid UUIDs or more than 100 IDs return 422.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkIds[]",
        type: "Query",
        schema: z.array(KPool_Common_Uuid).min(1).max(100),
      },
    ],
    response: z
      .object({ videoWatchRequests: z.array(VideoWatchRequestStatus) })
      .passthrough(),
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
    method: "post",
    path: "/official-certification/:certificationId/approve",
    alias: "OfficialCertificationOperations_approveCertification",
    description: `Approve an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "certificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: OfficialCertificationSummary,
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
    path: "/official-certification/:certificationId/reject",
    alias: "OfficialCertificationOperations_rejectCertification",
    description: `Reject an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "certificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: OfficialCertificationSummary,
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
    method: "put",
    path: "/official-certification/owned-wikis",
    alias: "OfficialCertificationOperations_syncOwnedWikiCertifications",
    description: `Synchronize official certifications for agency-owned group and song wikis.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SyncOwnedWikiCertificationsRequestBody,
      },
    ],
    response: z
      .object({
        approved: z.array(SyncedOfficialCertificationResource),
        rejected: z.array(SyncedOfficialCertificationResource),
        unchanged: z.array(SyncedOfficialCertificationResource),
      })
      .passthrough(),
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
    path: "/official-certification/request",
    alias: "OfficialCertificationOperations_requestCertification",
    description: `Create an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestCertificationRequestBody,
      },
    ],
    response: OfficialCertificationSummary,
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
    path: "/official-certifications",
    alias: "OfficialCertificationListOperations_listOfficialCertifications",
    description: `List official certification requests for operators.`,
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z.string().nullish(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().nullish(),
      },
    ],
    response: z
      .object({
        officialCertifications: z.array(OfficialCertificationListItem),
        current_page: z.number().int(),
        last_page: z.number().int(),
        total: z.number().int(),
        per_page: z.number().int(),
      })
      .passthrough(),
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
    method: "delete",
    path: "/policy/:policyId",
    alias: "PrincipalOperations_deletePolicy",
    description: `Delete a policy.`,
    requestFormat: "json",
    parameters: [
      {
        name: "policyId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/policy/create",
    alias: "PrincipalOperations_createPolicy",
    description: `Create a policy.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePolicyRequestBody,
      },
    ],
    response: PolicySummary,
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
    method: "delete",
    path: "/principal-group/:principalGroupId",
    alias: "PrincipalOperations_deletePrincipalGroup",
    description: `Delete a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/principal-group/:principalGroupId/add-member",
    alias: "PrincipalOperations_addPrincipalToPrincipalGroup",
    description: `Add a principal to a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutatePrincipalGroupMemberRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PrincipalGroupSummary,
    errors: [
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
    path: "/principal-group/:principalGroupId/attach-role",
    alias: "PrincipalOperations_attachRoleToPrincipalGroup",
    description: `Attach a role to a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachRoleToPrincipalGroupRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/principal-group/:principalGroupId/detach-role",
    alias: "PrincipalOperations_detachRoleFromPrincipalGroup",
    description: `Detach a role from a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachRoleToPrincipalGroupRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/principal-group/:principalGroupId/remove-member",
    alias: "PrincipalOperations_removePrincipalFromPrincipalGroup",
    description: `Remove a principal from a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutatePrincipalGroupMemberRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PrincipalGroupSummary,
    errors: [
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
    path: "/principal-group/create",
    alias: "PrincipalOperations_createPrincipalGroup",
    description: `Create a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePrincipalGroupRequestBody,
      },
    ],
    response: PrincipalGroupSummary,
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
    path: "/principal-groups",
    alias: "PrincipalOperations_listPrincipalGroups",
    description: `List Wiki principal groups for management. Excludes every group containing the system Operator role, including mixed-role groups.`,
    requestFormat: "json",
    parameters: [
      {
        name: "accountIdentifier",
        type: "Query",
        schema: z.string().uuid(),
      },
    ],
    response: ListPrincipalGroupsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    alias: "PrincipalOperations_updatePrincipalGroupMembers",
    description: `Atomically save specified group memberships and Principal statuses while preserving omitted groups and statuses. The final combined state must retain a reachable active permission manager; an active replacement and suspension of the old manager can be saved together. Duplicate status identifiers return 422; missing or out-of-scope Principals return 404; insufficient permission or protected Operator groups return 403. An unchanged forced_stop is accepted. A forbidden status change returns 409 code principal_status_change_forbidden; losing the last active manager returns 409 code last_active_manager. Both roll back the entire save. Success returns only the submitted groups and Principal statuses; clients refetch management lists separately. Status restrictions take effect on the next request even for logged-in cached sessions.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdatePrincipalGroupMembersRequestBody,
      },
    ],
    response: z
      .object({
        principalGroups: z.array(PrincipalGroupSummary),
        principalStatuses: z.array(KPool_Common_PrincipalStatusUpdate),
      })
      .passthrough(),
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
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_PrincipalStatusConflictProblem,
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
    path: "/principal/create",
    alias: "PrincipalOperations_createPrincipal",
    description: `Create a principal.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePrincipalRequestBody,
      },
    ],
    response: CreatedPrincipalSummary,
    errors: [
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
    description: `Get the principal associated with the authenticated identity.`,
    requestFormat: "json",
    response: PrincipalSummary,
    errors: [
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
    method: "delete",
    path: "/role/:roleId",
    alias: "PrincipalOperations_deleteRole",
    description: `Delete a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/:roleId/attach-policy",
    alias: "PrincipalOperations_attachPolicyToRole",
    description: `Attach a policy to a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachPolicyToRoleRequestBody,
      },
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/:roleId/detach-policy",
    alias: "PrincipalOperations_detachPolicyFromRole",
    description: `Detach a policy from a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachPolicyToRoleRequestBody,
      },
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/create",
    alias: "PrincipalOperations_createRole",
    description: `Create a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateRoleRequestBody,
      },
    ],
    response: RoleSummary,
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
    path: "/sitemap/wikis",
    alias: "SitemapWikiOperations_listSitemapWikis",
    description: `Enumerate published agency/group/talent/song wikis in all languages, ordered by immutable wiki UUID ascending. No authentication is required; the existing screen/query IP rate limit applies (default 300 requests/minute, also subject to the global query limit). Fetch the first page without cursor, then repeat using nextCursor until null. Deleted cursor rows remain valid boundaries. No cross-request snapshot is guaranteed: concurrent publications below an already visited cursor appear on the next enumeration started without cursor. Drafts and history are never included. Only sitemap fields are returned; no content, images or basic information is loaded.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().gte(1).lte(1000).nullish(),
      },
      {
        name: "cursor",
        type: "Query",
        schema: translationSetIdentifier,
      },
    ],
    response: ListSitemapWikisResponseBody,
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
    method: "delete",
    path: "/video-link/:videoLinkId",
    alias: "VideoLinkOperations_deleteVideoLink",
    description: `Delete only the specified video link. Requires an authenticated Wiki collaborator with an active Account/Principal and DELETE_VIDEO_LINK permission. Manual videos may be deleted only by their creator; all three automatically collected video categories may be deleted by any Wiki collaborator. Returns 204 without a body, 403 when forbidden, 404 when missing, and 422 for an invalid identifier. Deletion does not prevent future automatic re-collection. Any request less than 168 hours old prevents deletion with 409 (video_watch_request_active), regardless of sender. The latest sender determines expiry; at exactly 168 hours that request stops blocking deletion.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkId",
        type: "Path",
        schema: z.string().uuid(),
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
    path: "/video-link/:videoLinkId/like",
    alias: "VideoLinkLikeOperations_likeVideoLink",
    description: `Like a manual or automatically collected VideoLink as the authenticated Wiki Principal. Requires LIKE_VIDEO_LINK permission for its resource type. The server classifies a like as official-owner only when the exact target wiki and video are talent resources, the wiki is official, and the non-delegated Principal belongs to its owner Account. Editing rights, roles, other wiki ownership and delegated owner Accounts do not confer this classification. No caller-supplied owner, sender or kind is accepted. Exactly one record per video/Principal, never counted twice. Returns 409 if the Principal has already liked the VideoLink, regardless of kind; existing classification is not changed by retry.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkId",
        type: "Path",
        schema: z.string().uuid(),
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
    method: "delete",
    path: "/video-link/:videoLinkId/like",
    alias: "VideoLinkLikeOperations_unlikeVideoLink",
    description: `Remove only the authenticated Wiki Principal&#x27;s like, including official-owner likes; another Principal&#x27;s like is never removed. Requires UNLIKE_VIDEO_LINK permission. Repeated removal is idempotent (204); a missing VideoLink returns 404. Returns 409 (video_watch_request_active) while the authenticated sender has a request less than 168 hours old. At exactly 168 hours this restriction expires.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkId",
        type: "Path",
        schema: z.string().uuid(),
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
    path: "/video-link/:videoLinkId/watch-requests",
    alias: "VideoWatchRequestOperations_sendVideoWatchRequest",
    description: `A video already watched by its current official owner returns 409 video_already_watched. Send a persistent watch request as an active authenticated Wiki collaborator with SEND_VIDEO_WATCH_REQUEST permission. The video must belong directly to an officially certified talent wiki and be user-created, liked by the caller, and confirmed to be at most 30 seconds (30 inclusive). The send policy requires a talent video on an officially certified talent wiki and user-created usage; policy rejection returns 403. Unknown/long stored durations are rejected with 409. Sender and target wiki are determined on the server. Eligibility uses durationSeconds stored in the database for both YouTube and TikTok; a missing stored duration is ineligible. No external duration lookup is performed. Sender, exact target wiki/video and server timestamp are stored permanently. Maximum three requests per caller/talent translation set across all languages in the last 168 hours; same-video resend, own unlike and any deletion are blocked for 168 hours, expiring exactly at that boundary. Success 204. A missing target wiki returns 409 video_watch_request_target_not_eligible. Other eligibility/limit failures return 409 video_watch_request_duration_not_eligible, video_watch_request_like_required, video_watch_request_resend_not_available or video_watch_request_weekly_limit_reached. Other callers&#x27; histories are never returned.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkId",
        type: "Path",
        schema: z.string().uuid(),
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
    path: "/video-link/:videoLinkId/watched",
    alias: "VideoLinkWatchOperations_recordVideoLinkWatch",
    description: `Record completed playback of a video on its exact officially certified talent wiki. Only its active, non-delegated owner Account may record completion; editors, other owners and delegated Principals receive 403. Video, owner, Principal and first completion time are resolved by the server. Idempotent per video and owner Account, returning 204 for repeated completion; does not create a like or request. A current-owner completion permanently prevents new watch requests for this video with 409 video_already_watched, independent of the rolling request window. Manual skips and playback errors must not invoke this endpoint.`,
    requestFormat: "json",
    parameters: [
      {
        name: "videoLinkId",
        type: "Path",
        schema: z.string().uuid(),
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
    method: "post",
    path: "/video-link/create",
    alias: "VideoLinkOperations_createVideoLink",
    description: `Create one manual video without replacing existing videos. Requires an authenticated Wiki collaborator. YouTube requires a non-negative frontend-player duration; zero is allowed. TikTok ignores client thumbnail/duration and resolves the selected public video before storing its cover. The creator is determined on the server. Duplicate provider/video IDs within the wiki return 409, including URL variants. Invalid URL or resolved non-video share links return 422. Unavailable, restricted, changed or invalid public metadata/image and storage failures return 502 (video_metadata_unavailable); no video is saved. Successful response is 204 without a body.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateVideoLinkRequestBody,
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
        status: 502,
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
    path: "/wiki-translation-sets/masters",
    alias: "WikiTranslationSetOperations_searchTranslationSetMasterWikis",
    description: `Search wiki masters grouped by translation set for official certification requests.`,
    requestFormat: "json",
    parameters: [
      {
        name: "resourceType",
        type: "Query",
        schema: z.enum(["agency", "group", "talent", "song"]),
      },
      {
        name: "keyword",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: SearchTranslationSetMasterWikisResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    path: "/wiki/:language/:resourceType/:slug/videos",
    alias: "PublicVideoLinkOperations_listVideos",
    description: `Public, unauthenticated list of videos for the exact published wiki. Includes manually created and automatically collected videos. creatorPrincipalIdentifier is the saved creator for manual videos and null for automatically collected videos. Agency includes manual videos only. Ordered by creation time descending, then videoLinkIdentifier ascending. A missing published wiki returns 404; zero videos returns videos: []. Viewing never calls YouTube or TikTok or dispatches collection jobs.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.enum(["ja", "ko", "en"]),
      },
      {
        name: "resourceType",
        type: "Path",
        schema: z.enum(["agency", "group", "song", "talent"]),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "minDurationSeconds",
        type: "Query",
        schema: z.number().int().gte(0).nullish(),
      },
      {
        name: "maxDurationSeconds",
        type: "Query",
        schema: z.number().int().gte(0).nullish(),
      },
      {
        name: "recentWatchRequestsOnly",
        type: "Query",
        schema: z.boolean().nullish(),
      },
      {
        name: "sortByWatchRequests",
        type: "Query",
        schema: z.boolean().nullish(),
      },
    ],
    response: z.object({ videos: z.array(Video) }).passthrough(),
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
    path: "/wiki/:language/:slug/related-profiles",
    alias: "WikiOperations_listRelatedProfiles",
    description: `List related published wiki profiles for a source wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: ListRelatedProfilesResponseBody,
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
    path: "/wiki/:language/agency/:slug",
    alias: "WikiOperations_getAgencyWiki",
    description: `Fetch the published agency wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: AgencyWikiDetail,
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
    path: "/wiki/:language/agency/:slug/my/draft",
    alias: "MyWikiOperations_getMyAgencyDraftWiki",
    description: `Fetch the current principal&#x27;s agency draft wiki by language and slug.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: AgencyDraftWikiDetail,
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
    path: "/wiki/:language/group/:slug",
    alias: "WikiOperations_getGroupWiki",
    description: `Fetch the published group wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: WikiDetail,
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
    path: "/wiki/:language/group/:slug/my/draft",
    alias: "MyWikiOperations_getMyGroupDraftWiki",
    description: `Fetch the current principal&#x27;s group draft wiki by language and slug.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: DraftWikiDetail,
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
    path: "/wiki/:language/song/:slug",
    alias: "WikiOperations_getSongWiki",
    description: `Fetch the published song wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: SongWikiDetail,
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
    path: "/wiki/:language/song/:slug/my/draft",
    alias: "MyWikiOperations_getMySongDraftWiki",
    description: `Fetch the current principal&#x27;s song draft wiki by language and slug.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: SongDraftWikiDetail,
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
    path: "/wiki/:language/talent/:slug",
    alias: "WikiOperations_getTalentWiki",
    description: `Fetch the published talent wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TalentWikiDetail,
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
    path: "/wiki/:language/talent/:slug/my/draft",
    alias: "MyWikiOperations_getMyTalentDraftWiki",
    description: `Fetch the current principal&#x27;s talent draft wiki by language and slug.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TalentDraftWikiDetail,
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
    path: "/wiki/:resourceType/:translationSetIdentifier/related-wikis",
    alias: "WikiOperations_listRelatedWikis",
    description: `List related published wikis for an agency or talent translation set.`,
    requestFormat: "json",
    parameters: [
      {
        name: "resourceType",
        type: "Path",
        schema: z.enum(["agency", "talent"]),
      },
      {
        name: "translationSetIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ListRelatedWikisResponseBody,
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
    method: "delete",
    path: "/wiki/:wikiId",
    alias: "WikiOperations_deleteWiki",
    description: `Delete a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: DeleteWikiRequestBody.optional(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/wiki/:wikiId/approve",
    alias: "WikiOperations_approveWiki",
    description: `Approve a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/edit",
    alias: "WikiOperations_editWiki",
    description: `Edit an existing wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateWikiDraftRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/merge",
    alias: "WikiOperations_mergeWiki",
    description: `Merge changes into an existing wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateWikiDraftRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/publish",
    alias: "WikiOperations_publishWiki",
    description: `Publish an approved wiki draft as the next generation. Translated drafts catch up to the latest published version. Returns 409 when the selected publication version is inconsistent.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PublishedWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/publish-same-version",
    alias: "WikiOperations_publishWikiAtSameVersion",
    description: `Publish an approved draft into its linked published wiki without changing its identifier or version. Other languages are unchanged. wikiId is the draft ID. Returns 409 for an unapproved draft or a draft without a published-wiki link, 404 when the draft or linked published wiki does not exist, and 403 for insufficient publish permission.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PublishedWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/reject",
    alias: "WikiOperations_rejectWiki",
    description: `Reject a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RejectWikiRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/rollback",
    alias: "WikiOperations_rollbackWiki",
    description: `Roll back a wiki to a previous published version.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RollbackWikiRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: RollbackWikiResponseBody,
    errors: [
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
    path: "/wiki/:wikiId/submit",
    alias: "WikiOperations_submitWiki",
    description: `Submit a wiki draft for review.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/translate",
    alias: "WikiOperations_translateWiki",
    description: `Translate a wiki draft into additional languages.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: TranslateWikiResponseBody,
    errors: [
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
    path: "/wiki/:wikiId/withdraw",
    alias: "WikiOperations_withdrawWiki",
    description: `Withdraw a wiki draft review request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WithdrawWikiRequestBody.optional(),
      },
      {
        name: "X-Kpool-Visitor-Country",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Region",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Timestamp",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "X-Kpool-Visitor-Signature",
        type: "Header",
        schema: z.string().nullish(),
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/agency/:wikiIdentifier/draft",
    alias: "WikiOperations_getAgencyDraftWiki",
    description: `Fetch an agency draft wiki by draft wiki identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "wikiIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AgencyDraftWikiDetail,
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
    method: "post",
    path: "/wiki/auto-create",
    alias: "WikiOperations_autoCreateWiki",
    description: `Automatically create a wiki draft from the provided metadata.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AutoCreateWikiRequestBody,
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/create",
    alias: "WikiOperations_createWiki",
    description: `Create a new wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateWikiRequestBody,
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/group/:wikiIdentifier/draft",
    alias: "WikiOperations_getGroupDraftWiki",
    description: `Fetch a group draft wiki by draft wiki identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "wikiIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiDetail,
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
    path: "/wiki/song/:wikiIdentifier/draft",
    alias: "WikiOperations_getSongDraftWiki",
    description: `Fetch a song draft wiki by draft wiki identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "wikiIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: SongDraftWikiDetail,
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
    path: "/wiki/talent/:wikiIdentifier/draft",
    alias: "WikiOperations_getTalentDraftWiki",
    description: `Fetch a talent draft wiki by draft wiki identifier.`,
    requestFormat: "json",
    parameters: [
      {
        name: "wikiIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: TalentDraftWikiDetail,
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
    path: "/wikis/:language",
    alias: "WikiListOperations_listWikis",
    description: `List published wikis by language.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "keyword",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sort",
        type: "Query",
        schema: z.enum(["updatedAt", "name", "createdAt", "version"]).nullish(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ListWikisResponseBody,
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
    path: "/wikis/:language/masters",
    alias: "WikiListOperations_searchMasterWikis",
    description: `Search published wiki masters for lightweight selection candidates.`,
    requestFormat: "json",
    parameters: [
      {
        name: "language",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.enum(["agency", "group", "talent", "song"]),
      },
      {
        name: "keyword",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: SearchMasterWikisResponseBody,
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
    path: "/wikis/version-inconsistencies",
    alias: "WikiListOperations_listVersionInconsistentWikis",
    description: `List published wikis with version inconsistencies across translation sets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "resourceType",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sort",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: ListWikisResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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

export const wikiPrivateApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
