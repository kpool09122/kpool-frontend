import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.string();

const MyContactSummary = z.object({
  contactIdentifier: uuid,
  identityIdentifier: uuid.nullish(),
  category: z.number().int(),
  name: z.string(),
  replyIdentifiers: z.array(uuid),
  createdAt: timestamp,
}).passthrough();

const ContactReplyDetail = z.object({
  replyIdentifier: uuid,
  content: z.string(),
  sentAt: timestamp,
}).passthrough();

const ContactDetail = z.object({
  contactIdentifier: uuid,
  identityIdentifier: uuid.nullish(),
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
