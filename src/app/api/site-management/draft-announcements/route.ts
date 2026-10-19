import type { NextRequest } from "next/server";
import { announcementHandler } from "../announcementHandler";
export const GET = (request: NextRequest) =>
  announcementHandler(request, ["draft-announcements"]);
export const POST = (request: NextRequest) =>
  announcementHandler(request, ["draft-announcements"]);
