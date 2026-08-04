import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/storage";
import type { ClaudeModel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS: ClaudeModel[] = [
  "claude-sonnet-5",
  "claude-opus-5",
  "claude-haiku-4-5",
];

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    tmdbApiKey: settings.tmdbApiKey,
    anthropicApiKey: settings.anthropicApiKey,
    claudeModel: settings.claudeModel,
    hasKey: Boolean(settings.tmdbApiKey.trim()),
    hasClaudeKey: Boolean(settings.anthropicApiKey.trim()),
    models: MODELS,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    tmdbApiKey?: string;
    anthropicApiKey?: string;
    claudeModel?: ClaudeModel;
  };

  const patch: Parameters<typeof updateSettings>[0] = {};
  if (body.tmdbApiKey !== undefined) {
    patch.tmdbApiKey = body.tmdbApiKey.trim();
  }
  if (body.anthropicApiKey !== undefined) {
    patch.anthropicApiKey = body.anthropicApiKey.trim();
  }
  if (body.claudeModel && MODELS.includes(body.claudeModel)) {
    patch.claudeModel = body.claudeModel;
  }

  const settings = await updateSettings(patch);
  return NextResponse.json({
    tmdbApiKey: settings.tmdbApiKey,
    anthropicApiKey: settings.anthropicApiKey,
    claudeModel: settings.claudeModel,
    hasKey: Boolean(settings.tmdbApiKey),
    hasClaudeKey: Boolean(settings.anthropicApiKey),
    models: MODELS,
  });
}
