import type { MyContactDetail } from "./contactApi";

type Reply = MyContactDetail["replies"][number];

// Laravel Str::trim (TrimStrings middleware), including invisible boundary chars.
const boundaryWhitespace = `[\\p{White_Space}${String.fromCodePoint(0)}\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u2060-\u2065\u206A-\u206F\u2800\u3164\uFEFF\uFFA0\u{1D159}\u{1D173}-\u{1D17A}\u{E0020}]`;
const boundaryWhitespacePattern = new RegExp(`^${boundaryWhitespace}+|${boundaryWhitespace}+$`, "gu");
export const normalizeMyContactReplyContent = (content: string): string => content.replace(boundaryWhitespacePattern, "");

// Historical successful replies predate replyType. Keep their wire shape intact.
export const canReplyToMyContact = (replies: readonly Reply[]): boolean =>
  replies.some((reply) => reply.replyType !== "submitter" && reply.sentAt !== null);

export const findSavedMyContactReply = (replies: readonly Reply[], previousIdentifiers: readonly string[], content: string): Reply | undefined =>
  replies.find((reply) => reply.replyType === "submitter" && reply.content === normalizeMyContactReplyContent(content) && !previousIdentifiers.includes(reply.replyIdentifier));
