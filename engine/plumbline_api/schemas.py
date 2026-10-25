"""Pydantic v2 models for API v1, the source of truth for the HTTP contract (API_CONTRACT s12)."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from plumbline.config import MIN_SIGMA

MAX_HYPOTHESES = 64
MAX_SITES = 16
MAX_STEPS_LISTED = 32
MAX_SEED = 2**32 - 1
MAX_SIGMA = 100.0
CONFUSION_SUM_TOLERANCE = 1e-6
FIXTURE_NAME_PATTERN = r"^[a-z0-9_]{1,40}$"
ID_MAX_LENGTH = 64

Finite = Annotated[float, Field(allow_inf_nan=False)]
Prob = Annotated[float, Field(ge=0.0, le=1.0, allow_inf_nan=False)]
Mode = Literal["simulate", "live", "replay"]
Reveal = Literal["after_step", "never"]
Status = Literal["continue", "resolved", "unresolved"]


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConfusionBody(RequestModel):
    """Symmetric band: p_same + 2 p_pm1 + 2 p_pm2 = 1, clipped at the edges by the engine."""

    p_same: Prob
    p_pm1: Prob
    p_pm2: Prob

    @model_validator(mode="after")
    def _sums_to_one(self) -> ConfusionBody:
        total = self.p_same + 2 * self.p_pm1 + 2 * self.p_pm2
        if abs(total - 1.0) > CONFUSION_SUM_TOLERANCE:
            raise ValueError("p_same + 2 p_pm1 + 2 p_pm2 must equal 1")
        return self


class CreateSession(RequestModel):
    domain: str = Field(max_length=ID_MAX_LENGTH)
    mode: Mode
    seed: Annotated[int, Field(ge=0, le=MAX_SEED, strict=True)]
    reveal: Reveal
    true_hypothesis: str | None = Field(default=None, max_length=ID_MAX_LENGTH)
    fixture: str | None = Field(default=None, pattern=FIXTURE_NAME_PATTERN)
    sigma: Annotated[float, Field(ge=MIN_SIGMA, le=MAX_SIGMA, allow_inf_nan=False)] | None = None
    confusion: ConfusionBody | None = None


class StepRequest(RequestModel):
    reading: Finite | None = None


class HealthView(BaseModel):
    status: Literal["ok"]
    version: str


class DomainView(BaseModel):
    id: str
    display_name: str
    simulated: bool


class DomainsView(BaseModel):
    domains: list[DomainView]


class HypothesisView(BaseModel):
    id: str
    label: str
    spoken: str
    description: str


class SiteView(BaseModel):
    index: int = Field(ge=0)
    label: str
    spoken: str


class CatalogView(BaseModel):
    domain: str
    simulated: bool
    reading_unit: str
    sigma: Finite
    hypotheses: list[HypothesisView] = Field(max_length=MAX_HYPOTHESES)
    sites: list[SiteView] = Field(max_length=MAX_SITES)
    classes: list[list[str]] = Field(max_length=MAX_HYPOTHESES)
    expected_readings: list[list[Finite]] | None = None


class InstructionView(BaseModel):
    site: int = Field(ge=0)
    label: str
    spoken: str
    gain_bits: list[Finite] = Field(max_length=MAX_SITES)


class WarningView(BaseModel):
    active: bool
    p_off_site: Prob
    likely_site: int = Field(ge=0)
    text: str


class PlacementView(BaseModel):
    probs: list[Prob] = Field(max_length=MAX_SITES)
    warning: WarningView


class AuditView(BaseModel):
    step_index: int = Field(ge=0)
    probs: list[Prob] = Field(max_length=MAX_SITES)


class DiagnosisView(BaseModel):
    hypothesis_id: str
    label: str
    confidence: Prob
    spoken: str


class UnresolvedView(BaseModel):
    classes: list[list[str]]
    reason: Literal["indistinguishable", "no_informative_site", "max_steps"]
    text: str


class BaselineView(BaseModel):
    method: str
    shadow: bool
    belief: list[Prob] = Field(max_length=MAX_HYPOTHESES)
    diagnosis: DiagnosisView | None


class MisfitView(BaseModel):
    """Additive in v1: the reading matched no hypothesis; belief unchanged, measure again."""

    active: bool
    sigmas: Annotated[float, Field(ge=0.0, allow_inf_nan=False)]
    text: str


class StepView(BaseModel):
    step_index: int = Field(ge=0)
    instruction: InstructionView
    reading: Finite
    unit: str
    landed_site: int | None
    placement: PlacementView
    placement_audit: list[AuditView] = Field(max_length=MAX_STEPS_LISTED)
    belief: list[Prob] = Field(max_length=MAX_HYPOTHESES)
    entropy_bits: Annotated[float, Field(ge=0.0, allow_inf_nan=False)]
    status: Status
    diagnosis: DiagnosisView | None
    unresolved: UnresolvedView | None
    next_instruction: InstructionView | None
    baseline: BaselineView
    misfit: MisfitView


class ThresholdsView(BaseModel):
    resolve: Prob
    placement_warning: Prob
    min_gain_bits: Finite
    class_tolerance: Finite
    max_steps: int
    out_of_model_sigmas: Finite


class ConfigView(BaseModel):
    sigma: Finite
    confusion: list[list[Prob]] = Field(max_length=MAX_SITES)
    thresholds: ThresholdsView


class SessionView(BaseModel):
    session_id: str
    domain: str
    mode: Mode
    simulated: bool
    reveal: Reveal
    status: Status
    config: ConfigView
    catalog: CatalogView
    instruction: InstructionView | None
    belief: list[Prob] = Field(max_length=MAX_HYPOTHESES)
    entropy_bits: Annotated[float, Field(ge=0.0, allow_inf_nan=False)]
    steps: list[StepView] = Field(max_length=MAX_STEPS_LISTED)
    true_hypothesis: str | None
