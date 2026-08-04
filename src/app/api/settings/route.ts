import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/storage";
import type { ClaudeModel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS: ClaudeModel[] = [
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "claude-opus-5",
];

/** Enough to recognise which key is stored, useless to anyone who steals it. */
function hint(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  return `••••${trimmed.slice(-4)}`;
}

function payload(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    tmdbKeyHint: hint(settings.tmdbApiKey),
    anthropicKeyHint: hint(settings.anthropicApiKey),
    claudeModel: settings.claudeModel,
    hasKey: Boolean(settings.tmdbApiKey.trim()),
    hasClaudeKey: Boolean(settings.anthropicApiKey.trim()),
    models: MODELS,
  };
}

export async function GET() {
  return NextResponse.json(payload(await getSettings()));
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    tmdbApiKey?: string;
    anthropicApiKey?: string;
    claudeModel?: ClaudeModel;
    clearTmdbKey?: boolean;
    clearAnthropicKey?: boolean;
  };

  const patch: Parameters<typeof updateSettings>[0] = {};

  // An omitted or blank key means "leave it alone", so the UI never has to
  // hold the real value just to save an unrelated setting.
  if (body.clearTmdbKey) {
    patch.tmdbApiKey = "";
  } else if (body.tmdbApiKey?.trim()) {
    patch.tmdbApiKey = body.tmdbApiKey.trim();
  }

  if (body.clearAnthropicKey) {
    patch.anthropicApiKey = "";
  } else if (body.anthropicApiKey?.trim()) {
    patch.anthropicApiKey = body.anthropicApiKey.trim();
  }

  if (body.claudeModel && MODELS.includes(body.claudeModel)) {
    patch.claudeModel = body.claudeModel;
  }

  return NextResponse.json(payload(await updateSettings(patch)));
}
