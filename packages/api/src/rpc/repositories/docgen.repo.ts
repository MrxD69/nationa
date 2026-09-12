import { and, desc, eq, ilike, inArray, isNull, ne, or, type SQL } from "drizzle-orm";

import {
  aiCitations,
  aiProposals,
  caseFieldValues,
  cases,
  companies,
  companyPersons,
  documentLinks,
  documentTypes,
  documentVersions,
  documents,
  fieldProvenance,
  persons,
  ruleCitations,
  type AiProposal,
  type Case,
  type CaseFieldValue,
  type Company,
  type Document,
  type DocumentVersion,
  type NewAiCitation,
  type NewAiProposal,
  type NewCaseFieldValue,
  type NewDocument,
  type NewDocumentLink,
  type NewDocumentVersion,
  type NewFieldProvenance,
  type Person,
  type RuleCitation,
} from "@nationa/db";

import type { Db } from "../context";

export async function insertDocgenProposal(
  db: Db,
  values: NewAiProposal,
): Promise<AiProposal | null> {
  const [row] = await db.insert(aiProposals).values(values).returning();
  return row ?? null;
}

export async function findDocgenProposal(db: Db, proposalId: string): Promise<AiProposal | null> {
  const [row] = await db.select().from(aiProposals).where(eq(aiProposals.id, proposalId)).limit(1);
  return row ?? null;
}

export async function listDocgenProposals(
  db: Db,
  filter: {
    kind: string;
    subjectType?: AiProposal["subjectType"];
    subjectId?: string;
    proposalId?: string;
    status?: AiProposal["status"];
    limit?: number;
  },
): Promise<AiProposal[]> {
  const conditions: SQL[] = [eq(aiProposals.kind, filter.kind)];
  if (filter.subjectType) {
    conditions.push(eq(aiProposals.subjectType, filter.subjectType));
  }
  if (filter.subjectId) {
    conditions.push(eq(aiProposals.subjectId, filter.subjectId));
  }
  if (filter.proposalId) {
    conditions.push(eq(aiProposals.id, filter.proposalId));
  }
  if (filter.status) {
    conditions.push(eq(aiProposals.status, filter.status));
  }
  return db
    .select()
    .from(aiProposals)
    .where(and(...conditions))
    .orderBy(desc(aiProposals.createdAt))
    .limit(filter.limit ?? 50);
}

export async function updateDocgenProposal(
  db: Db,
  proposalId: string,
  values: Partial<NewAiProposal>,
): Promise<AiProposal | null> {
  const [row] = await db
    .update(aiProposals)
    .set(values)
    .where(eq(aiProposals.id, proposalId))
    .returning();
  return row ?? null;
}

export async function supersedeDocgenProposals(
  db: Db,
  filter: {
    kind: string;
    subjectType: AiProposal["subjectType"];
    subjectId: string;
    exceptId: string;
  },
): Promise<void> {
  await db
    .update(aiProposals)
    .set({ status: "superseded" })
    .where(
      and(
        eq(aiProposals.kind, filter.kind),
        eq(aiProposals.subjectType, filter.subjectType),
        eq(aiProposals.subjectId, filter.subjectId),
        eq(aiProposals.status, "draft"),
        ne(aiProposals.id, filter.exceptId),
      ),
    );
}

export async function findCaseById(db: Db, caseId: string): Promise<Case | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return row ?? null;
}

export async function listCaseFieldValues(db: Db, caseId: string): Promise<CaseFieldValue[]> {
  return db.select().from(caseFieldValues).where(eq(caseFieldValues.caseId, caseId));
}

export async function findCompanyById(db: Db, companyId: string): Promise<Company | null> {
  const [row] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function findPersonById(db: Db, personId: string): Promise<Person | null> {
  const [row] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);
  return row ?? null;
}

export async function findApplicantPersonId(db: Db, caseId: string): Promise<string | null> {
  const [row] = await db
    .select({ applicantPersonId: cases.applicantPersonId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  return row?.applicantPersonId ?? null;
}

export async function listCompanyPersons(
  db: Db,
  companyId: string,
  roles: Array<"manager" | "legal_representative" | "owner"> = [
    "manager",
    "legal_representative",
    "owner",
  ],
): Promise<Person[]> {
  const rows = await db
    .select({ person: persons })
    .from(companyPersons)
    .innerJoin(persons, eq(persons.id, companyPersons.personId))
    .where(and(eq(companyPersons.companyId, companyId), inArray(companyPersons.role, roles)))
    .orderBy(companyPersons.addedAt);
  return rows.map((row) => row.person);
}

export async function findDocumentTypeByCode(db: Db, code: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(eq(documentTypes.code, code))
    .orderBy(desc(documentTypes.active))
    .limit(1);
  return row ?? null;
}

export async function listRuleCitationsByIds(db: Db, ids: string[]): Promise<RuleCitation[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(ruleCitations).where(inArray(ruleCitations.id, ids));
}

export async function searchRuleCitations(
  db: Db,
  input: { terms: string[]; limit?: number },
): Promise<RuleCitation[]> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const terms = input.terms.map((term) => term.trim()).filter((term) => term.length > 0);
  const conditions: SQL[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    const match = or(
      ilike(ruleCitations.source, pattern),
      ilike(ruleCitations.article, pattern),
      ilike(ruleCitations.titleFr, pattern),
      ilike(ruleCitations.titleAr, pattern),
    );
    if (match) {
      conditions.push(match);
    }
  }
  const where = conditions.length > 0 ? or(...conditions) : undefined;
  return db.select().from(ruleCitations).where(where).limit(limit);
}

export async function insertGeneratedDocument(
  db: Db,
  values: NewDocument,
): Promise<Document | null> {
  const [row] = await db.insert(documents).values(values).returning();
  return row ?? null;
}

export async function updateGeneratedDocument(
  db: Db,
  documentId: string,
  values: Partial<NewDocument>,
): Promise<Document | null> {
  const [row] = await db
    .update(documents)
    .set(values)
    .where(eq(documents.id, documentId))
    .returning();
  return row ?? null;
}

export async function insertGeneratedDocumentVersion(
  db: Db,
  values: NewDocumentVersion,
): Promise<DocumentVersion | null> {
  const [row] = await db.insert(documentVersions).values(values).returning();
  return row ?? null;
}

export async function insertGeneratedDocumentLink(db: Db, values: NewDocumentLink): Promise<void> {
  await db.insert(documentLinks).values(values).onConflictDoNothing();
}

export async function upsertGeneratedCaseFieldValue(
  db: Db,
  input: {
    caseId: string;
    stepId: string | null;
    fieldKey: string;
    valueText: string | null;
    valueJsonb: unknown;
    sourceKind: NewCaseFieldValue["sourceKind"];
    sourceDocumentVersionId: string | null;
    aiProposalId: string | null;
    confidence: string | null;
    enteredByUserId: string | null;
  },
): Promise<CaseFieldValue | null> {
  const values = {
    valueText: input.valueText,
    valueJsonb: input.valueJsonb ?? null,
    sourceKind: input.sourceKind,
    sourceDocumentVersionId: input.sourceDocumentVersionId,
    extractionFieldId: null,
    aiProposalId: input.aiProposalId,
    confidence: input.confidence,
    enteredByUserId: input.enteredByUserId,
    stepId: input.stepId,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(caseFieldValues)
    .values({ caseId: input.caseId, fieldKey: input.fieldKey, ...values })
    .onConflictDoUpdate({
      target: [caseFieldValues.caseId, caseFieldValues.fieldKey],
      set: values,
    })
    .returning();
  return row ?? null;
}

export async function insertGeneratedProvenance(db: Db, rows: NewFieldProvenance[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(fieldProvenance).values(rows);
}

export async function insertGeneratedAiCitation(db: Db, values: NewAiCitation): Promise<void> {
  await db.insert(aiCitations).values(values).onConflictDoNothing();
}
