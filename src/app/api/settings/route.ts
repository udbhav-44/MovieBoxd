import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    tmdbApiKey: settings.tmdbApiKey,
    hasKey: Boolean(settings.tmdbApiKey.trim()),
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { tmdbApiKey?: string };
  const settings = await updateSettings({
    tmdbApiKey: (body.tmdbApiKey ?? "").trim(),
  });
  return NextResponse.json({
    tmdbApiKey: settings.tmdbApiKey,
    hasKey: Boolean(settings.tmdbApiKey),
  });
}
