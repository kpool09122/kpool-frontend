import type { NextRequest } from "next/server";
import { getMonetizationApiBaseUrl, monetizationUnavailable } from "@/gateways/monetization/monetizationPrincipal";
import { forwardedHeaders, json, loadGroupList, validateSession } from "../routeSupport";
export async function GET(request: NextRequest) {
  const rejected = validateSession(request);
  if (rejected) return rejected;
  const base = getMonetizationApiBaseUrl();
  if (!base) return json({ message: monetizationUnavailable }, 503);
  const cookies: string[] = [];
  const headers = forwardedHeaders(request);
  const capture = (response: Response) => {
    const values = response.headers.getSetCookie();
    cookies.push(...values);
    const jar = new Map(headers.Cookie.split(";").map(value => value.trim()).filter(Boolean).map(value => [value.split("=")[0], value]));
    for (const value of values) { const pair = value.split(";")[0]; jar.set(pair.split("=")[0], pair); }
    headers.Cookie = [...jar.values()].join("; ");
  };
  let result;
  try { result = json(await loadGroupList(base, headers, capture)); }
  catch (error) { result = json({ message: monetizationUnavailable }, error instanceof Response && error.status >= 400 ? error.status : 502); }
  for (const cookie of cookies) result.headers.append("Set-Cookie", cookie);
  return result;
}
