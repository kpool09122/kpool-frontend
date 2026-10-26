import type { NextRequest } from "next/server";
import { playlistRoute } from "./playlistRoute";
export const GET = (request: NextRequest) => playlistRoute(request, "GET");
export const POST = (request: NextRequest) => playlistRoute(request, "POST");
