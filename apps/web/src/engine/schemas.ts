/** Zod mirrors of engine/truehand_api/schemas.py (API v1) and of the parity fixture JSON. */
import { z } from 'zod'

const finite = z.number().finite()
const prob = z.number().min(0).max(1)

export const HypothesisView = z.object({
  id: z.string(),
  label: z.string(),
  spoken: z.string(),
  description: z.string(),
})
export const SiteView = z.object({
  index: z.number().int().min(0),
  label: z.string(),
  spoken: z.string(),
})
export const CatalogView = z.object({
  domain: z.enum(['circuit', 'thermometer']),
  simulated: z.boolean(),
  reading_unit: z.string(),
  sigma: finite,
  hypotheses: z.array(HypothesisView).max(64),
  sites: z.array(SiteView).max(16),
  classes: z.array(z.array(z.string())).max(64),
  expected_readings: z.array(z.array(finite)).nullish(),
})
export const InstructionView = z.object({
  site: z.number().int(),
  label: z.string(),
  spoken: z.string(),
  gain_bits: z.array(finite).max(16),
})
export const WarningView = z.object({
  active: z.boolean(),
  p_off_site: prob,
  likely_site: z.number().int(),
  text: z.string(),
})
export const PlacementView = z.object({ probs: z.array(prob).max(16), warning: WarningView })
export const AuditView = z.object({ step_index: z.number().int(), probs: z.array(prob).max(16) })
export const DiagnosisView = z.object({
  hypothesis_id: z.string(),
  label: z.string(),
  confidence: prob,
  spoken: z.string(),
})
export const UnresolvedView = z.object({
  classes: z.array(z.array(z.string())),
  reason: z.enum(['indistinguishable', 'no_informative_site', 'max_steps']),
  text: z.string(),
})
export const BaselineView = z.object({
  method: z.string(),
  shadow: z.boolean().default(true),
  belief: z.array(prob).max(64),
  diagnosis: DiagnosisView.nullable(),
})
export const StepView = z.object({
  step_index: z.number().int(),
  instruction: InstructionView,
  reading: finite,
  unit: z.string(),
  landed_site: z.number().int().nullable(),
  placement: PlacementView,
  placement_audit: z.array(AuditView).max(32).default([]),
  belief: z.array(prob).max(64),
  entropy_bits: finite,
  status: z.enum(['continue', 'resolved', 'unresolved']),
  diagnosis: DiagnosisView.nullable(),
  unresolved: UnresolvedView.nullable(),
  next_instruction: InstructionView.nullable(),
  baseline: BaselineView,
})
export const SessionView = z.object({
  session_id: z.string(),
  domain: z.enum(['circuit', 'thermometer']),
  mode: z.enum(['simulate', 'live', 'replay']),
  simulated: z.boolean(),
  reveal: z.enum(['after_step', 'never']),
  status: z.string(),
  config: z.record(z.string(), z.unknown()),
  catalog: CatalogView,
  instruction: InstructionView.nullable(),
  belief: z.array(prob).max(64),
  entropy_bits: finite,
  steps: z.array(StepView).max(32),
  true_hypothesis: z.string().nullable(),
})
export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullish(),
  }),
})

export type StepViewT = z.infer<typeof StepView>
export type SessionViewT = z.infer<typeof SessionView>
export type CatalogViewT = z.infer<typeof CatalogView>
export type InstructionViewT = z.infer<typeof InstructionView>

/** Parity fixture: engine/fixtures/parity/*.json (docs/API_CONTRACT.md, fixture shape). */
export const FixtureStep = z.object({
  index: z.number().int(),
  told_site: z.number().int(),
  landed_site: z.number().int().nullable(),
  reading: finite,
  belief: z.array(prob),
  entropy_bits: finite,
  placement: z.array(prob),
  p_off_site: prob,
  warning: z.boolean(),
  placement_audit: z.array(z.array(prob)).default([]),
  status: z.enum(['continue', 'resolved', 'unresolved']),
  engine_choice: z.object({ site: z.number().int(), gain_bits: z.array(finite) }),
  next_told_site: z.number().int().nullable(),
  baseline: z.object({
    method: z.string(),
    belief: z.array(prob),
    top: z.string(),
    confidence: prob,
  }),
  diagnosis: z.object({ hypothesis_id: z.string(), confidence: prob }).nullish(),
  unresolved: UnresolvedView.nullish(),
})
export const Fixture = z.object({
  schema_version: z.number().int(),
  name: z.string(),
  domain: z.enum(['circuit', 'thermometer']),
  mode: z.literal('replay'),
  generated_by: z.string().nullish(),
  git_sha: z.string().nullish(),
  generated_at: z.string().nullish(),
  provisional: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()),
  catalog: z.object({
    hypothesis_ids: z.array(z.string()),
    hypothesis_labels: z.array(z.string()).optional(),
    site_labels: z.array(z.string()),
    expected_readings: z.array(z.array(finite)).optional(),
    classes: z.array(z.array(z.string())),
  }),
  true_hypothesis: z.string(),
  seed: z.number().int().nullish(),
  prior_instruction: z.object({ site: z.number().int(), gain_bits: z.array(finite) }),
  steps: z.array(FixtureStep).min(1).max(32),
})
export type FixtureT = z.infer<typeof Fixture>
