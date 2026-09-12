import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

import {
  cases,
  checkRuns,
  companies,
  companyPersons,
  companyRegistrySnapshots,
  documentTypes,
  documentVersions,
  documents,
  extractedFields,
  extractions,
  filings,
  findingNotes,
  findings,
  obligations,
  persons,
  procedureSteps,
  submissions,
  type Database,
  type FindingNote,
} from "@nationa/db";

import { renderFindingText } from "../../checks/rule-set";
import type {
  CheckSubject,
  CheckSubjectType,
  FindingDraft,
  FindingSeverity,
  FindingStatus,
} from "../../checks/types";
import type { Db, Tx } from "../context";

export type ResolvedSubject = {
  companyId: string | null;
  caseId: string | null;
  documentId: string | null;
};

export type FindingsQuery = {
  findingId?: string;
  checkRunId?: string;
  subjectRunId?: string;
  status?: FindingStatus;
  severity?: FindingSeverity;
  limit?: number;
};

export type InsertRunInput = {
  subject: CheckSubject;
  ruleSetVersion: string;
  now: Date;
  drafts: FindingDraft[];
};

export type UpdateFindingStatusInput = {
  findingId: string;
  status: FindingStatus;
  userId?: string | null;
};

export type InsertFindingNoteInput = {
  findingId: string;
  userId?: string | null;
  body: string;
  kind?: FindingNote["kind"];
};

export async function resolveSubject(db: Db, subject: CheckSubject): Promise<ResolvedSubject> {
  if (subject.type === "company") {
    return { companyId: subject.id, caseId: null, documentId: null };
  }

  if (subject.type === "case") {
    const [record] = await db
      .select({ companyId: cases.companyId })
      .from(cases)
      .where(eq(cases.id, subject.id))
      .limit(1);
    return { companyId: record?.companyId ?? null, caseId: subject.id, documentId: null };
  }

  if (subject.type === "submission") {
    const [record] = await db
      .select({ companyId: submissions.companyId, caseId: submissions.caseId })
      .from(submissions)
      .where(eq(submissions.id, subject.id))
      .limit(1);
    return {
      companyId: record?.companyId ?? null,
      caseId: record?.caseId ?? null,
      documentId: null,
    };
  }

  const [record] = await db
    .select({ companyId: documents.companyId, caseId: documents.caseId })
    .from(documents)
    .where(eq(documents.id, subject.id))
    .limit(1);
  return {
    companyId: record?.companyId ?? null,
    caseId: record?.caseId ?? null,
    documentId: subject.id,
  };
}

export async function findSubjectCompanyId(
  db: Db,
  subjectType: CheckSubjectType,
  subjectId: string,
): Promise<string | null> {
  if (subjectType === "company") {
    return subjectId;
  }
  if (subjectType === "case") {
    const [row] = await db
      .select({ companyId: cases.companyId })
      .from(cases)
      .where(eq(cases.id, subjectId))
      .limit(1);
    return row?.companyId ?? null;
  }
  if (subjectType === "submission") {
    const [row] = await db
      .select({ companyId: submissions.companyId })
      .from(submissions)
      .where(eq(submissions.id, subjectId))
      .limit(1);
    return row?.companyId ?? null;
  }
  const [row] = await db
    .select({ companyId: documents.companyId, caseId: documents.caseId })
    .from(documents)
    .where(eq(documents.id, subjectId))
    .limit(1);
  if (row?.companyId) {
    return row.companyId;
  }
  if (row?.caseId) {
    const [caseRow] = await db
      .select({ companyId: cases.companyId })
      .from(cases)
      .where(eq(cases.id, row.caseId))
      .limit(1);
    return caseRow?.companyId ?? null;
  }
  return null;
}

export async function findCompanyById(db: Db, companyId: string) {
  const [row] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return row ?? null;
}

export async function findCaseById(db: Db, caseId: string) {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return row ?? null;
}

export async function findPersonById(db: Db, personId: string) {
  const [row] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);
  return row ?? null;
}

export async function listCheckDocuments(db: Db, subject: ResolvedSubject) {
  const conditions: SQL[] = [];
  if (subject.caseId) {
    conditions.push(eq(documents.caseId, subject.caseId));
  } else if (subject.companyId) {
    conditions.push(eq(documents.companyId, subject.companyId));
  } else if (subject.documentId) {
    conditions.push(eq(documents.id, subject.documentId));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select({ document: documents, documentType: documentTypes, version: documentVersions })
    .from(documents)
    .leftJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
    .leftJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))
    .where(and(...conditions, isNull(documents.deletedAt)));
}

export async function listExtractedFieldRows(db: Db, versionIds: string[]) {
  if (versionIds.length === 0) {
    return [];
  }

  return db
    .select({ field: extractedFields, documentVersionId: extractions.documentVersionId })
    .from(extractedFields)
    .innerJoin(extractions, eq(extractedFields.extractionId, extractions.id))
    .where(
      and(inArray(extractions.documentVersionId, versionIds), eq(extractions.status, "succeeded")),
    )
    .orderBy(desc(extractedFields.confidence));
}

export async function findLatestRegistrySnapshot(db: Db, companyId: string) {
  const [row] = await db
    .select()
    .from(companyRegistrySnapshots)
    .where(eq(companyRegistrySnapshots.companyId, companyId))
    .orderBy(desc(companyRegistrySnapshots.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listRequiredDocumentTypes(db: Db, templateId: string) {
  return db
    .select({ step: procedureSteps, type: documentTypes })
    .from(procedureSteps)
    .innerJoin(documentTypes, eq(procedureSteps.requiredDocumentTypeId, documentTypes.id))
    .where(eq(procedureSteps.templateId, templateId));
}

export async function listActiveObligations(db: Db) {
  return db.select().from(obligations).where(eq(obligations.active, true));
}

export async function listFilingsByCompany(db: Db, companyId: string) {
  return db.select().from(filings).where(eq(filings.companyId, companyId));
}

export async function listCompanyPersons(db: Db, companyId: string) {
  return db.select().from(companyPersons).where(eq(companyPersons.companyId, companyId));
}

export async function insertRunWithFindings(
  db: Database,
  input: InsertRunInput,
): Promise<{ run: typeof checkRuns.$inferSelect; findings: (typeof findings.$inferSelect)[] }> {
  const { subject, ruleSetVersion, now, drafts } = input;

  return db.transaction(async (tx: Tx) => {
    const [run] = await tx
      .insert(checkRuns)
      .values({
        subjectType: subject.type,
        subjectId: subject.id,
        ruleSetVersion,
        status: "running",
        startedAt: now,
      })
      .returning();

    if (!run) {
      throw new Error("Failed to create check run");
    }

    const findingRows = drafts.map((draft) => {
      const text = renderFindingText(draft.code, draft.params);
      const comparedRefs: Record<string, unknown> = { refs: draft.refs, params: draft.params };
      return {
        checkRunId: run.id,
        severity: draft.severity,
        code: draft.code,
        title: text.title,
        messagePlain: text.messagePlain,
        suggestedFix: text.suggestedFix,
        comparedRefs,
      };
    });

    const inserted =
      findingRows.length > 0 ? await tx.insert(findings).values(findingRows).returning() : [];

    const bySeverity: Record<string, number> = {};
    for (const draft of drafts) {
      bySeverity[draft.severity] = (bySeverity[draft.severity] ?? 0) + 1;
    }

    const summary: Record<string, unknown> = {
      ruleSetVersion,
      findingsCount: drafts.length,
      bySeverity,
      blockingCount: drafts.filter((draft) => draft.severity === "blocker").length,
    };

    const [updated] = await tx
      .update(checkRuns)
      .set({
        status: drafts.length === 0 ? "passed" : "failed",
        completedAt: now,
        summary,
      })
      .where(eq(checkRuns.id, run.id))
      .returning();

    return { run: updated ?? run, findings: inserted };
  });
}

export async function findLatestRunForSubject(db: Db, subject: CheckSubject) {
  const [run] = await db
    .select()
    .from(checkRuns)
    .where(and(eq(checkRuns.subjectType, subject.type), eq(checkRuns.subjectId, subject.id)))
    .orderBy(desc(checkRuns.createdAt))
    .limit(1);
  return run ?? null;
}

export async function listRunsForSubject(db: Db, subject: CheckSubject, limit: number) {
  return db
    .select()
    .from(checkRuns)
    .where(and(eq(checkRuns.subjectType, subject.type), eq(checkRuns.subjectId, subject.id)))
    .orderBy(desc(checkRuns.createdAt))
    .limit(limit);
}

export async function findRunById(db: Db, runId: string) {
  const [run] = await db.select().from(checkRuns).where(eq(checkRuns.id, runId)).limit(1);
  return run ?? null;
}

export async function findFindingsByRun(db: Db, runId: string) {
  return db
    .select()
    .from(findings)
    .where(eq(findings.checkRunId, runId))
    .orderBy(desc(findings.severity), desc(findings.createdAt));
}

export async function findFindings(db: Db, query: FindingsQuery) {
  const conditions: SQL[] = [];
  if (query.findingId) {
    conditions.push(eq(findings.id, query.findingId));
  }
  if (query.checkRunId) {
    conditions.push(eq(findings.checkRunId, query.checkRunId));
  }
  if (query.subjectRunId) {
    conditions.push(eq(findings.checkRunId, query.subjectRunId));
  }
  if (query.status) {
    conditions.push(eq(findings.status, query.status));
  }
  if (query.severity) {
    conditions.push(eq(findings.severity, query.severity));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(findings)
    .where(where)
    .orderBy(desc(findings.createdAt))
    .limit(query.limit ?? 100);
}

export async function updateFindingStatus(db: Db, input: UpdateFindingStatusInput) {
  const now = new Date();
  const isOpen = input.status === "open";

  const [updated] = await db
    .update(findings)
    .set({
      status: input.status,
      resolvedAt: isOpen ? null : now,
      resolvedByUserId: isOpen ? null : (input.userId ?? null),
    })
    .where(eq(findings.id, input.findingId))
    .returning();

  return updated ?? null;
}

export async function insertFindingNote(db: Db, input: InsertFindingNoteInput) {
  const [note] = await db
    .insert(findingNotes)
    .values({
      findingId: input.findingId,
      userId: input.userId ?? null,
      kind: input.kind ?? "note",
      body: input.body,
    })
    .returning();

  return note ?? null;
}

export async function findFindingNotes(db: Db, findingId: string) {
  return db
    .select()
    .from(findingNotes)
    .where(eq(findingNotes.findingId, findingId))
    .orderBy(desc(findingNotes.createdAt));
}

export async function findOpenBlockingFindings(db: Db, runId: string, statuses: FindingStatus[]) {
  return db
    .select()
    .from(findings)
    .where(
      and(
        eq(findings.checkRunId, runId),
        eq(findings.severity, "blocker"),
        inArray(findings.status, statuses),
      ),
    )
    .orderBy(desc(findings.createdAt));
}
