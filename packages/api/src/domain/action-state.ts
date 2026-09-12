import type { ComparedRef, FindingSeverity, FindingStatus } from "../checks/types";
import { normalizeFieldKey } from "./fields";

export const ACTION_STEP_STATES = [
  "not_started",
  "in_progress",
  "done",
  "verified",
  "generated",
  "needs_correction",
  "blocked",
] as const;

export type ActionStepState = (typeof ACTION_STEP_STATES)[number];
export type ActionStatus = ActionStepState;

export type ActionFinding = {
  severity: FindingSeverity;
  status: FindingStatus;
};

export type ActionFindingLike = ActionFinding & { comparedRefs?: unknown };

export type StepSignals = {
  caseCancelled: boolean;
  caseRejected: boolean;
  submissionRejected: boolean;
  submissionReturned: boolean;
  openBlocker: boolean;
  openError: boolean;
  checkRun: boolean;
  completed: boolean;
  generated: boolean;
  hasFields: boolean;
  hasDocuments: boolean;
  inProgress: boolean;
  locked: boolean;
};

export type StepStateInput = {
  stepStatus: "locked" | "available" | "in_progress" | "completed" | "skipped";
  findings?: readonly ActionFinding[];
  actionFindings?: readonly ActionFinding[];
  caseStatus?: string | null;
  submissionStatuses?: readonly string[];
  hasCheckRun?: boolean;
  hasFields?: boolean;
  hasDocuments?: boolean;
  generatedDocument?: boolean;
};

export type StepStateResult = {
  state: ActionStepState;
  reachable: boolean;
  signals: StepSignals;
};

const OPEN_FINDING_STATUSES: ReadonlySet<FindingStatus> = new Set<FindingStatus>([
  "open",
  "acknowledged",
]);

const TERMINAL_STATES: readonly ActionStepState[] = ["done", "verified", "generated"];

export function isTerminalStepState(state: ActionStepState): boolean {
  return TERMINAL_STATES.includes(state);
}

function hasOpenSeverity(findings: readonly ActionFinding[], severity: FindingSeverity): boolean {
  return findings.some(
    (finding) => finding.severity === severity && OPEN_FINDING_STATUSES.has(finding.status),
  );
}

/**
 * Pure derivation of a single step state. Precedence, high to low:
 * `blocked` → `needs_correction` → `verified` → `generated` → `done` →
 * `in_progress` → `not_started`.
 */
export function deriveStepState(input: StepStateInput): StepStateResult {
  const findings = [...(input.findings ?? []), ...(input.actionFindings ?? [])];

  const caseStatus = input.caseStatus ?? null;
  const submissionStatuses = input.submissionStatuses ?? [];

  const caseCancelled = caseStatus === "cancelled";
  const caseRejected = caseStatus === "rejected";
  const submissionRejected = submissionStatuses.includes("rejected");
  const submissionReturned = submissionStatuses.includes("returned");

  const openBlocker = hasOpenSeverity(findings, "blocker");
  const openError = hasOpenSeverity(findings, "error");

  const completed = input.stepStatus === "completed" || input.stepStatus === "skipped";
  const inProgress = input.stepStatus === "in_progress";
  const locked = input.stepStatus === "locked";
  const hasCheckRun = Boolean(input.hasCheckRun);
  const generated = Boolean(input.generatedDocument);
  const hasFields = Boolean(input.hasFields);
  const hasDocuments = Boolean(input.hasDocuments);

  const signals: StepSignals = {
    caseCancelled,
    caseRejected,
    submissionRejected,
    submissionReturned,
    openBlocker,
    openError,
    checkRun: hasCheckRun,
    completed,
    generated,
    hasFields,
    hasDocuments,
    inProgress,
    locked,
  };

  let state: ActionStepState;
  if (caseCancelled || caseRejected || submissionRejected || submissionReturned || openBlocker) {
    state = "blocked";
  } else if (openError) {
    state = "needs_correction";
  } else if (completed && hasCheckRun) {
    state = "verified";
  } else if (generated) {
    state = "generated";
  } else if (completed) {
    state = "done";
  } else if (inProgress || hasFields || hasDocuments) {
    state = "in_progress";
  } else {
    state = "not_started";
  }

  return { state, reachable: !locked, signals };
}

/**
 * Aggregates the step states into a single action status. A blocked or
 * needs_correction step dominates; otherwise the action is complete when every
 * step is terminal, in progress when any step is, and not started otherwise.
 */
export function deriveActionStatus(states: readonly ActionStepState[]): ActionStatus {
  if (states.length === 0) {
    return "not_started";
  }
  if (states.includes("blocked")) {
    return "blocked";
  }
  if (states.includes("needs_correction")) {
    return "needs_correction";
  }

  const active = states.filter((state) => !TERMINAL_STATES.includes(state));
  if (active.length === 0) {
    if (states.includes("verified")) {
      return "verified";
    }
    if (states.includes("generated")) {
      return "generated";
    }
    return "done";
  }

  if (states.includes("in_progress")) {
    return "in_progress";
  }
  return "not_started";
}

/** Fraction (0..1) of steps in a terminal state. */
export function deriveActionProgress(states: readonly ActionStepState[]): number {
  if (states.length === 0) {
    return 0;
  }
  const terminal = states.filter((state) => TERMINAL_STATES.includes(state)).length;
  return terminal / states.length;
}

export type FindingStepTarget = {
  id: string;
  requiredDocumentTypeId?: string | null;
  requiredDocumentTypeCode?: string | null;
  formFieldKeys?: readonly string[];
};

export type MapFindingsInput<T extends ActionFindingLike> = {
  findings: readonly T[];
  steps: readonly FindingStepTarget[];
  documentVersionTypes?: Readonly<Record<string, string>>;
};

export type MapFindingsResult<T extends ActionFindingLike> = {
  byStep: Map<string, T[]>;
  actionLevel: T[];
};

type ParsedComparedRefs = {
  refs: ComparedRef[];
  params: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComparedRef(value: unknown): value is ComparedRef {
  return isRecord(value);
}

function parseComparedRefs(raw: unknown): ParsedComparedRefs {
  if (!isRecord(raw)) {
    return { refs: [], params: {} };
  }

  const refs = Array.isArray(raw.refs) ? raw.refs.filter(isComparedRef) : [];
  const params: Record<string, string> = {};
  if (isRecord(raw.params)) {
    for (const [key, value] of Object.entries(raw.params)) {
      if (typeof value === "string") {
        params[key] = value;
      }
    }
  }

  return { refs, params };
}

function pushStepTarget<T extends ActionFindingLike>(
  target: Map<string, T[]>,
  stepId: string,
  finding: T,
): void {
  const list = target.get(stepId) ?? [];
  list.push(finding);
  target.set(stepId, list);
}

/**
 * Maps check findings to procedure steps. Precedence per finding:
 *   1. a ref whose `ref` equals a template step id,
 *   2. a ref `documentVersionId` resolved to a document type required by a step,
 *   3. a canonical field key (from `ref.field` / `ref.ref`) present in a step form,
 *   4. `params.documentTypeCode` matching a step's required document type code.
 * Findings matching none of these are returned as action-level findings.
 */
export function mapFindingsToSteps<T extends ActionFindingLike>(
  input: MapFindingsInput<T>,
): MapFindingsResult<T> {
  const byStep = new Map<string, T[]>();
  const actionLevel: T[] = [];

  const stepIds = new Set<string>();
  const stepsByDocumentType = new Map<string, FindingStepTarget[]>();
  const stepsByDocumentTypeCode = new Map<string, FindingStepTarget[]>();
  const stepsByFieldKey = new Map<string, FindingStepTarget[]>();

  for (const step of input.steps) {
    stepIds.add(step.id);
    if (step.requiredDocumentTypeId) {
      const list = stepsByDocumentType.get(step.requiredDocumentTypeId) ?? [];
      list.push(step);
      stepsByDocumentType.set(step.requiredDocumentTypeId, list);
    }
    if (step.requiredDocumentTypeCode) {
      const list = stepsByDocumentTypeCode.get(step.requiredDocumentTypeCode) ?? [];
      list.push(step);
      stepsByDocumentTypeCode.set(step.requiredDocumentTypeCode, list);
    }
    for (const key of step.formFieldKeys ?? []) {
      const list = stepsByFieldKey.get(key) ?? [];
      list.push(step);
      stepsByFieldKey.set(key, list);
    }
  }

  for (const finding of input.findings) {
    const { refs, params } = parseComparedRefs(finding.comparedRefs);
    const targets = new Set<string>();

    for (const ref of refs) {
      if (ref.ref && stepIds.has(ref.ref)) {
        targets.add(ref.ref);
      }
    }

    if (targets.size === 0 && input.documentVersionTypes) {
      for (const ref of refs) {
        const versionId = ref.documentVersionId;
        if (!versionId) {
          continue;
        }
        const documentTypeId = input.documentVersionTypes[versionId];
        if (!documentTypeId) {
          continue;
        }
        for (const step of stepsByDocumentType.get(documentTypeId) ?? []) {
          targets.add(step.id);
        }
      }
    }

    if (targets.size === 0) {
      for (const ref of refs) {
        const candidate = ref.field ?? ref.ref;
        const key = candidate ? normalizeFieldKey(candidate) : null;
        if (!key) {
          continue;
        }
        for (const step of stepsByFieldKey.get(key) ?? []) {
          targets.add(step.id);
        }
      }
    }

    if (targets.size === 0 && params.documentTypeCode) {
      for (const step of stepsByDocumentTypeCode.get(params.documentTypeCode) ?? []) {
        targets.add(step.id);
      }
    }

    if (targets.size === 0) {
      actionLevel.push(finding);
      continue;
    }

    for (const stepId of targets) {
      pushStepTarget(byStep, stepId, finding);
    }
  }

  return { byStep, actionLevel };
}
