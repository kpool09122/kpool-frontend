import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.string();

const ContactReplyDetail = z.object({
  replyIdentifier: uuid,
  // Older responses omit author metadata; current replies include it even before mail delivery.
  replyNumber: z.number().int().positive().optional(),
  principalIdentifier: uuid.nullish(),
  name: z.string().nullish(),
  content: z.string(),
  sentAt: timestamp.nullable(),
  createdAt: timestamp.optional(),
}).passthrough();

const MyContactSummary = z.object({
  contactIdentifier: uuid,
  identityIdentifier: uuid.nullish(),
  principalIdentifier: uuid.nullish(),
  category: z.number().int(),
  name: z.string(),
  replyIdentifiers: z.array(uuid),
  replies: z.array(ContactReplyDetail.extend({ replyNumber: z.number().int().positive() })).default([]),
  createdAt: timestamp,
  content: z.string(),
}).passthrough();

const ContactDetail = z.object({
  contactIdentifier: uuid,
  identityIdentifier: uuid.nullish(),
  principalIdentifier: uuid.nullish(),
  category: z.number().int(),
  name: z.string(),
  createdAt: timestamp,
  content: z.string(),
  replies: z.array(ContactReplyDetail),
}).passthrough();

export const schemas = {
  ContactDetail,
  ContactReplyDetail,
  MyContactSummary,
};
