import "server-only"
import { getSettings } from "@/lib/settings"

/** The model string passed to the AI SDK (AI Gateway format, e.g. "openai/gpt-5-mini"). */
export async function getAiModel(): Promise<string> {
  const ai = await getSettings("ai")
  return ai.model || "openai/gpt-5-mini"
}

/**
 * Compose a system prompt from admin-configured pieces layered over a base
 * prompt. `persona` is prepended (voice/personality); `rules` are appended
 * (analysis/scoring guidance).
 */
export async function buildSystemPrompt(
  base: string,
  opts?: { persona?: string; rules?: string[] },
): Promise<string> {
  const parts: string[] = []
  if (opts?.persona) parts.push(opts.persona.trim())
  parts.push(base)
  for (const r of opts?.rules ?? []) {
    if (r && r.trim()) parts.push(r.trim())
  }
  return parts.join("\n\n")
}

/** Whether a given role is allowed to use AI, per admin settings. */
export async function aiEnabledForRole(role: string): Promise<boolean> {
  const ai = await getSettings("ai")
  // Default to enabled when a role is not explicitly listed.
  return ai.aiEnabledByRole[role] ?? true
}

/** Full AI settings (provider, model, prompts, scoring). */
export async function getAiSettings() {
  return getSettings("ai")
}
