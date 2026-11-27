import type { NextRequest } from "next/server";
import {
  completeCardSchema,
  paymentCardSchema,
  paymentCardsSchema,
} from "@/gateways/monetization/paymentCards";
import { json, validateSession } from "../routeSupport";
import { forwardCard } from "./support";
export const GET = (request: NextRequest) =>
  forwardCard(request, "", paymentCardsSchema, "GET");
export async function POST(request: NextRequest) {
  const rejected = validateSession(request, true);
  if (rejected) return rejected;
  const payload = await request.json().catch(() => null);
  const parsed = completeCardSchema.safeParse(payload);
  return parsed.success
    ? forwardCard(request, "", paymentCardSchema, "POST", parsed.data)
    : json({ message: "Invalid card completion reference." }, 422);
}
