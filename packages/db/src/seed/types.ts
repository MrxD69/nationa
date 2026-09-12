import type { NewObligation } from "../schema/obligations";
import type { NewProcedureStep } from "../schema/procedures";

export type JsonObject = Record<string, unknown>;

export type ObligationPeriodicity = NewObligation["periodicity"];
export type ProcedureStepType = NewProcedureStep["stepType"];
