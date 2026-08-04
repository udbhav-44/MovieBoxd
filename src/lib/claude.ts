import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeModel } from "./types";

export class ClaudeError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ClaudeError";
    this.status = status;
  }
}

export function claudeClient(apiKey: string): Anthropic {
  if (!apiKey.trim()) {
    throw new ClaudeError(
      "Anthropic API key is not configured. Add it in Settings.",
      400,
    );
  }
  return new Anthropic({ apiKey: apiKey.trim() });
}

export async function askClaude({
  apiKey,
  model,
  system,
  prompt,
  maxTokens = 4000,
  cacheSystem = false,
}: {
  apiKey: string;
  model: ClaudeModel;
  system: string;
  prompt: string;
  maxTokens?: number;
  /**
   * Caches the system block. Worth it when the same prefix is reused within
   * the 5-minute window — refreshing For You re-sends an identical dossier.
   */
  cacheSystem?: boolean;
}): Promise<string> {
  const client = claudeClient(apiKey);

  try {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: cacheSystem
        ? [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ]
        : system,
      messages: [{ role: "user", content: prompt }],
    });

    return message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const status = error.status ?? 500;
      if (status === 401) {
        throw new ClaudeError("Invalid Anthropic API key.", 401);
      }
      if (status === 429) {
        throw new ClaudeError(
          "Anthropic rate limit hit. Try again in a moment.",
          429,
        );
      }
      throw new ClaudeError(error.message || "Claude request failed", status);
    }
    throw error;
  }
}

/**
 * Claude occasionally wraps JSON in prose or fences despite instructions,
 * so pull the outermost JSON value before parsing.
 */
export function parseJsonResponse<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();

  const start = candidate.search(/[[{]/);
  if (start < 0) {
    throw new ClaudeError("Claude did not return JSON.", 502);
  }

  const opening = candidate[start];
  const closing = opening === "[" ? "]" : "}";
  const end = candidate.lastIndexOf(closing);
  if (end <= start) {
    throw new ClaudeError("Claude returned malformed JSON.", 502);
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new ClaudeError("Could not parse Claude's JSON response.", 502);
  }
}
