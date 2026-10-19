import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { getApiErrorBody, readApiErrorBody } from "@/gateways/support/apiError";
import { getCsrfForwardHeaders } from "@/gateways/support/csrfForwardHeaders";

/** Shared atomic-save boundary. Once PATCH is accepted, only GET/auth may be retried. */
export async function savePrincipalGroups(
  request: NextRequest,
  options: {
    baseUrl: string | null;
    requestSchema: z.ZodTypeAny;
    responseSchema: z.ZodTypeAny;
    unavailable: string;
    refresh: (
      body: unknown,
      headers: Record<string, string>,
      captureCookies: (response: Response) => void,
    ) => Promise<unknown>;
  },
) {
  const cookies: string[] = [];
  const respond = (body: unknown, status = 200) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  };
  // Only expose user-facing client errors and the contract's machine-readable code.
  // Backend debug responses can contain traces, SQL or credentials, especially on 5xx.
  const publicError = (body: unknown, status: number) => {
    const parsed = getApiErrorBody(body, options.unavailable);
    return {
      message: status < 500 ? parsed.message : options.unavailable,
      ...(status < 500 &&
      "detail" in parsed &&
      typeof parsed.detail === "string"
        ? { detail: parsed.detail }
        : {}),
      ...(status < 500 && "code" in parsed && typeof parsed.code === "string"
        ? { code: parsed.code }
        : {}),
    };
  };
  const failed = (
    kind: "schema" | "http" | "network",
    status: number,
    body?: unknown,
  ) =>
    respond({
      committed: true,
      refresh: { ok: false, kind, status, ...publicError(body, status) },
    });
  if (!options.baseUrl) return respond({ message: options.unavailable }, 503);
  let payload;
  try {
    payload = options.requestSchema.safeParse(await request.json());
  } catch {
    return respond({ message: "Invalid membership request." }, 400);
  }
  if (!payload.success)
    return respond({ message: "Invalid membership request." }, 422);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...getCsrfForwardHeaders(request.headers),
  };
  for (const [source, target] of [
    ["cookie", "Cookie"],
    ["accept-language", "Accept-Language"],
  ]) {
    const value = request.headers.get(source);
    if (value) headers[target] = value;
  }
  let upstream;
  try {
    upstream = await fetch(`${options.baseUrl}/principal-groups/members`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });
  } catch {
    return respond({ message: options.unavailable }, 502);
  }
  const captureCookies = (response: Response) => {
    const values = response.headers.getSetCookie();
    cookies.push(...values);
    const jar = new Map(
      (headers.Cookie ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => [part.split("=")[0], part]),
    );
    for (const value of values) {
      const pair = value.split(";")[0];
      jar.set(pair.split("=")[0], pair);
    }
    if (jar.size) headers.Cookie = [...jar.values()].join("; ");
  };
  captureCookies(upstream);
  if (!upstream.ok)
    return respond(
      publicError(await readApiErrorBody(upstream), upstream.status),
      upstream.status,
    );
  const result = options.responseSchema.safeParse(
    await readApiErrorBody(upstream),
  );
  if (!result.success) return failed("schema", 502);
  try {
    return respond({
      committed: true,
      refresh: {
        ok: true,
        data: await options.refresh(result.data, headers, captureCookies),
      },
    });
  } catch (error) {
    if (error instanceof Response)
      return failed("http", error.status, await readApiErrorBody(error));
    if (error && typeof error === "object" && "issues" in error)
      return failed("schema", 502);
    return failed("network", 502);
  }
}
