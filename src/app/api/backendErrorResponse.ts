import { NextResponse } from "next/server";

import { getApiErrorBody, getBackendErrorResponse } from "@/gateways/support/apiError";

export const backendErrorResponse = (error: unknown, fallback: string) => {
  const response = getBackendErrorResponse(error);

  return NextResponse.json(
    getApiErrorBody(response?.data, fallback),
    { status: response?.status ?? 502, headers: { "Cache-Control": "no-store" } },
  );
};
