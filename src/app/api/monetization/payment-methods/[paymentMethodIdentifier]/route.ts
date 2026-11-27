import type { NextRequest } from "next/server";
import { z } from "zod";
import { json } from "../../routeSupport";
import { forwardCard } from "../support";
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ paymentMethodIdentifier: string }> },
) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await context.params).paymentMethodIdentifier);
  return parsed.success
    ? forwardCard(request, `/${parsed.data}`, z.undefined(), "DELETE")
    : json({ message: "Invalid card reference." }, 422);
}
