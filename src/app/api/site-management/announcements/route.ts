import type { NextRequest } from "next/server";
import { announcementHandler } from "../announcementHandler";
export const GET = (request: NextRequest) =>
  announcementHandler(request, ["announcements"]);
