import { describe, expect, it } from "vitest";
import { canReplyToMyContact, findSavedMyContactReply, normalizeMyContactReplyContent } from "./contactConversation";

const operator = { replyIdentifier: "operator", content: "運営返信", replyType: "operator" as const, sentAt: "2026-10-01T00:00:00Z", createdAt: "2026-09-30T00:00:00Z" };
describe("own conversation rules", () => {
  it("matches Laravel TrimStrings at the boundary, preserving interior whitespace", () => {
    expect(normalizeMyContactReplyContent(" \n\u0000\u200B\u00AD追加\n情報\u3000\u200D")).toBe("追加\n情報");
    expect(normalizeMyContactReplyContent("\u200B\u0000\n ")).toBe("");
  });
  it("requires a successfully sent operator reply, accepting historical sent replies without inventing fields", () => {
    expect(canReplyToMyContact([])).toBe(false);
    expect(canReplyToMyContact([{ ...operator, sentAt: null }])).toBe(false);
    expect(canReplyToMyContact([{ ...operator, replyType: "submitter" }])).toBe(false);
    expect(canReplyToMyContact([operator])).toBe(true);
    expect(canReplyToMyContact([{ ...operator, replyType: undefined, createdAt: undefined }])).toBe(true);
    expect(canReplyToMyContact([{ ...operator, replyType: undefined, sentAt: null }])).toBe(false);
  });
  it("confirms only a newly persisted submitter identifier with the same content, independent of notification delivery", () => {
    const post = { ...operator, replyIdentifier: "new", replyType: "submitter" as const, content: "追加", sentAt: null };
    expect(findSavedMyContactReply([post], ["old"], "追加")).toEqual(post);
    expect(findSavedMyContactReply([post], ["new"], "追加")).toBeUndefined();
    expect(findSavedMyContactReply([post], [], "別の文面")).toBeUndefined();
    expect(findSavedMyContactReply([{ ...post, replyType: "operator" }], [], "追加")).toBeUndefined();
    expect(findSavedMyContactReply([{ ...post, replyType: undefined }], [], "追加")).toBeUndefined();
  });
});
