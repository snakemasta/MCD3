import {
  INTAKE_STATUSES,
  INTAKE_TERMINAL_STATUSES,
  INTAKE_TYPES,
  INTAKE_URGENCY_LEVELS,
  intakeFieldsForType,
  type IntakeFieldDef,
} from "@/lib/constants"
import type { CivilianSettings } from "@/lib/settings"

export interface ResolvedField extends IntakeFieldDef {
  enabled: boolean
  required: boolean
}

/** Intake request types the firm currently accepts. */
export function enabledRequestTypes(settings: CivilianSettings) {
  return INTAKE_TYPES.filter((t) => {
    if (t.value === "civil") return settings.requestTypes.civil !== false
    if (t.value === "criminal") return settings.requestTypes.criminal !== false
    return true
  })
}

/** Full ordered status list: canonical (with label overrides) + custom. */
export function resolveStatuses(settings: CivilianSettings) {
  const canonical = INTAKE_STATUSES.map((s) => ({
    value: s.value,
    label: settings.statusLabels?.[s.value] ?? s.label,
    terminal: INTAKE_TERMINAL_STATUSES.includes(s.value),
    custom: false,
  }))
  const custom = (settings.customStatuses ?? []).map((s) => ({
    value: s.value,
    label: s.label,
    terminal: false,
    custom: true,
  }))
  return [...canonical, ...custom]
}

/** Statuses a reviewer may manually set (excludes system-managed terminal ones). */
export function selectableStatuses(settings: CivilianSettings) {
  return resolveStatuses(settings).filter((s) => !s.terminal)
}

export function statusLabel(settings: CivilianSettings, value: string): string {
  return resolveStatuses(settings).find((s) => s.value === value)?.label ?? value
}

export function resolveUrgencyLevels(settings: CivilianSettings) {
  return INTAKE_URGENCY_LEVELS.map((u) => ({
    value: u.value,
    label: settings.urgencyLabels?.[u.value] ?? u.label,
  }))
}

export function urgencyLabel(settings: CivilianSettings, value: string): string {
  return resolveUrgencyLevels(settings).find((u) => u.value === value)?.label ?? value
}

/**
 * Resolve the fields for an intake type with admin enable/required overrides
 * applied. Locked fields are always enabled. Returns only enabled fields.
 */
export function resolveFields(
  type: string,
  settings: CivilianSettings,
): ResolvedField[] {
  const rules = settings.fieldConfig?.[type] ?? {}
  return intakeFieldsForType(type)
    .map((f) => {
      const rule = rules[f.key]
      const enabled = f.locked ? true : rule?.enabled ?? f.defaultEnabled
      const required = f.locked
        ? f.defaultRequired
        : rule?.required ?? f.defaultRequired
      return { ...f, enabled, required: enabled && required }
    })
    .filter((f) => f.enabled)
}

/** All fields (including disabled) with current rules — for the admin editor. */
export function resolveAllFields(
  type: string,
  settings: CivilianSettings,
): ResolvedField[] {
  const rules = settings.fieldConfig?.[type] ?? {}
  return intakeFieldsForType(type).map((f) => {
    const rule = rules[f.key]
    const enabled = f.locked ? true : rule?.enabled ?? f.defaultEnabled
    const required = f.locked
      ? f.defaultRequired
      : rule?.required ?? f.defaultRequired
    return { ...f, enabled, required }
  })
}

export interface IntakeValidationResult {
  ok: boolean
  errors: Record<string, string>
}

/** Server-side validation of submitted intake answers against resolved rules. */
export function validateIntake(
  type: string,
  settings: CivilianSettings,
  values: Record<string, unknown>,
): IntakeValidationResult {
  const errors: Record<string, string> = {}
  for (const field of resolveFields(type, settings)) {
    const raw = values[field.key]
    const value = typeof raw === "string" ? raw.trim() : raw
    if (field.required && (value === undefined || value === null || value === "")) {
      errors[field.key] = `${field.label} is required`
    }
    if (field.kind === "email" && typeof value === "string" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.key] = "Enter a valid email address"
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors }
}
