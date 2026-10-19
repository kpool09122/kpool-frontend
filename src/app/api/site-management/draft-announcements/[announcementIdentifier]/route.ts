import type { NextRequest } from "next/server";
import { announcementHandler } from "../../announcementHandler";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ announcementIdentifier: string }> },
) {
  const { announcementIdentifier } = await params;
  return announcementHandler(request, [
    "draft-announcements",
    announcementIdentifier,
  ]);
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ announcementIdentifier: string }> },
) {
  const { announcementIdentifier } = await params;
  return announcementHandler(request, [
    "draft-announcements",
    announcementIdentifier,
  ]);
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ announcementIdentifier: string }> },
) {
  const { announcementIdentifier } = await params;
  return announcementHandler(request, [
    "draft-announcements",
    announcementIdentifier,
  ]);
}
