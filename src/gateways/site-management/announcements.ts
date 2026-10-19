import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export const announcementSchemas = siteManagementApiTypes.schemas;
export type DraftAnnouncement = z.infer<
  typeof announcementSchemas.DraftAnnouncement
>;
export type AnnouncementInput = z.infer<
  typeof announcementSchemas.CreateAnnouncementRequestBody
>;
export const announcementInputSchema =
  announcementSchemas.CreateAnnouncementRequestBody.strip().extend({
    title: z
      .string()
      .max(64)
      .refine((value) => value.trim().length > 0),
    content: z
      .string()
      .max(2048)
      .refine((value) => value.trim().length > 0),
  });
export const announcementIdentifierSchema =
  announcementSchemas.DraftAnnouncement.shape.announcementIdentifier;
export const announcementRequest = async <T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: AnnouncementInput,
) => {
  const response = await browserApiFetch(`/api/site-management/${path}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    throw Object.assign(new Error("Announcement request failed."), {
      status: response.status,
    });
  return parseWithSchemaLog(
    "announcement response",
    schema,
    await response.json(),
  );
};
export const isAnnouncementPublishable = (draft: DraftAnnouncement) =>
  ["ja", "en", "ko"].every((language) => {
    const content = draft.contents[language];
    return (
      !!content &&
      typeof content === "object" &&
      "title" in content &&
      "content" in content &&
      typeof content.title === "string" &&
      typeof content.content === "string" &&
      !!content.title.trim() &&
      !!content.content.trim()
    );
  });
