import type { NextRequest } from "next/server";
import { prepareCardSchema } from "@/gateways/monetization/paymentCards";
import { forwardCard } from "../support";
export const POST = (request: NextRequest) =>
  forwardCard(request, "/setup-intents", prepareCardSchema, "POST");
