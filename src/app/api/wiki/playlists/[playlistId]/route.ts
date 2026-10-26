import type { NextRequest } from "next/server";
import { playlistRoute } from "../playlistRoute";
type Context = { params: Promise<{ playlistId: string }> };
export const GET = async (request: NextRequest, context: Context) =>
  playlistRoute(request, "GET", (await context.params).playlistId);
export const PUT = async (request: NextRequest, context: Context) =>
  playlistRoute(request, "PUT", (await context.params).playlistId);
export const DELETE = async (request: NextRequest, context: Context) =>
  playlistRoute(request, "DELETE", (await context.params).playlistId);
