import { NextResponse } from "next/server";

export const csrfTokenMismatchResponse = (): NextResponse => NextResponse.json(
  { message: "Please refresh the page and try again.", code: "csrf_token_mismatch" },
  { status: 419, headers: { "Cache-Control": "no-store" } },
);
