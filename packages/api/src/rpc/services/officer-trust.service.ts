import { ORPCError } from "@orpc/server";

import { isMinistryAgent, requireUser } from "../../auth/access";
import type { Context } from "../context";
import { insertActivityEvent } from "../repositories/activity.repo";
import * as repo from "../repositories/officer-trust.repo";
import { listAllActiveAgencies } from "../repositories/submissions.repo";

/* Helpers */

const MAX_PLAUSIBLE_SIZE = 26_214_400; // 25 MiB

function notEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Safe epoch ms for a date column — 0 when missing or invalid (never NaN). */
function timeOf(value: Date | string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/** Narrow a jsonb column to a plain object without throwing on arrays/scalars. */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

async function loadCallerActiveAgencyIds(context: Context, userId: string): Promise<string[]> {
  // A ministry agent oversees all organizations: full cross-agency scope.
  if (await isMinistryAgent(context, userId)) {
    const allAgencies = await listAllActiveAgencies(context.db);
    return allAgencies.map((agency) => agency.id);
  }

  const memberships = await repo.listActiveMembershipsForUser(context.db, userId);
  return memberships.map((membership) => membership.agencyId);
}

function assertCallerBelongsToAgency(activeAgencyIds: string[], agencyId: string): void {
  if (!activeAgencyIds.includes(agencyId)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Vous n'avez pas accès à cette agence.",
      data: { agencyId },
    });
  }
}

/* Dossier search */

export type DossierSearchInput = {
  agencyId: string;
  query: string;
  limit?: number;
};

export async function searchCompaniesForDossier(context: Context, input: DossierSearchInput) {
  const user = requireUser(context);
  const query = input.query.trim();
  if (query.length < 2) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Saisissez au moins 2 caractères pour lancer la recherche.",
    });
  }

  const activeAgencyIds = await loadCallerActiveAgencyIds(context, user.id);
  assertCallerBelongsToAgency(activeAgencyIds, input.agencyId);

  const limit = input.limit ?? 20;
  const companyRows = await repo.searchCompanies(context.db, query, limit);
  if (companyRows.length === 0) {
    return { items: [] };
  }

  // Only the caller's active agencies are passed, so this already scopes
  // submissions to what the officer is allowed to see.
  const summaries = await repo.listAgencySummariesForCompanies(
    context.db,
    companyRows.map((company) => company.id),
    activeAgencyIds,
  );

  const agenciesByCompany = new Map<string, Set<string>>();
  for (const submission of summaries.submissions) {
    const set = agenciesByCompany.get(submission.companyId) ?? new Set<string>();
    set.add(submission.agencyId);
    agenciesByCompany.set(submission.companyId, set);
  }

  return {
    items: companyRows.map((company) => ({
      companyId: company.id,
      legalName: company.legalName,
      legalNameAr: company.legalNameAr,
      tradeName: company.tradeName,
      uniqueIdentifier: company.uniqueIdentifier,
      legalForm: company.legalForm,
      taxId: company.taxId,
      registryState: company.registryState,
      status: company.status,
      accessibleAgencies: [...(agenciesByCompany.get(company.id) ?? new Set<string>())].sort(),
    })),
  };
}

/* Company dossier */

export type CompanyDossierInput = {
  agencyId: string;
  companyId: string;
};

export async function getCompanyDossier(context: Context, input: CompanyDossierInput) {
  const user = requireUser(context);
  const activeAgencyIds = await loadCallerActiveAgencyIds(context, user.id);
  assertCallerBelongsToAgency(activeAgencyIds, input.agencyId);

  const company = await repo.findCompanyById(context.db, input.companyId);
  if (!company) {
    throw new ORPCError("NOT_FOUND", {
      message: "Entreprise introuvable.",
      data: { companyId: input.companyId },
    });
  }

  const [summaries, documentRows, activity] = await Promise.all([
    repo.listAgencySummariesForCompanies(context.db, [company.id], activeAgencyIds),
    repo.listCompanyDocuments(context.db, company.id),
    repo.listCompanyActivity(context.db, company.id, 100),
  ]);

  // Agencies the officer can see AND that have at least one submission for this company.
  const dossierAgencyIds = [
    ...new Set(summaries.submissions.map((submission) => submission.agencyId)),
  ].sort();
  const accessibleSet = new Set(activeAgencyIds);

  const [agencyRows, versions] = await Promise.all([
    repo.listAgenciesByIds(context.db, dossierAgencyIds),
    repo.listDocumentVersionsForDocuments(
      context.db,
      documentRows.map((document) => document.id),
    ),
  ]);
  const agencyById = new Map(agencyRows.map((agency) => [agency.id, agency]));

  // Documents: only versions proven linked to one of the caller's active agencies.
  const links = await repo.listSubmissionAgencyLinksForDocuments(
    context.db,
    versions.map((version) => version.id),
    activeAgencyIds,
  );
  const agenciesByVersion = new Map<string, Set<string>>();
  for (const link of links) {
    const set = agenciesByVersion.get(link.documentVersionId) ?? new Set<string>();
    set.add(link.agencyId);
    agenciesByVersion.set(link.documentVersionId, set);
  }
  const documentById = new Map(documentRows.map((document) => [document.id, document]));

  const documents = versions
    .filter((version) => agenciesByVersion.has(version.id))
    .map((version) => {
      const document = documentById.get(version.documentId);
      return {
        documentId: version.documentId,
        title: document?.title ?? version.fileName,
        documentVersionId: version.id,
        fileName: version.fileName,
        mimeType: version.mimeType,
        size: version.size,
        hash: version.hash,
        hasHash: notEmpty(version.hash),
        source: version.source,
        uploadedAt: version.uploadedAt,
        version: version.version,
        isCurrent: document?.currentVersionId === version.id,
        agencyIds: [...(agenciesByVersion.get(version.id) ?? new Set<string>())].sort(),
        documentStatus: document?.status ?? "uploaded",
      };
    })
    .sort((a, b) => timeOf(b.uploadedAt) - timeOf(a.uploadedAt));

  // Findings per agency: count findings attached to check runs on this agency's submissions.
  const findingCounts = await repo.listFindingCountsBySubmissionIds(
    context.db,
    summaries.submissions.map((submission) => submission.id),
  );
  const findingsBySubmission = new Map(findingCounts.map((row) => [row.submissionId, row.total]));
  const findingsByAgency = new Map<string, number>();
  for (const submission of summaries.submissions) {
    findingsByAgency.set(
      submission.agencyId,
      (findingsByAgency.get(submission.agencyId) ?? 0) +
        (findingsBySubmission.get(submission.id) ?? 0),
    );
  }

  const documentsByAgency = new Map<string, Set<string>>();
  for (const entry of documents) {
    for (const agencyId of entry.agencyIds) {
      const set = documentsByAgency.get(agencyId) ?? new Set<string>();
      set.add(entry.documentId);
      documentsByAgency.set(agencyId, set);
    }
  }

  const sections = dossierAgencyIds.map((agencyId) => {
    const agencySubmissions = summaries.submissions.filter(
      (submission) => submission.agencyId === agencyId,
    );
    const agencyFilings = summaries.filings.filter((filing) => filing.agencyId === agencyId);
    const countRow = summaries.counts.find(
      (count) => count.companyId === company.id && count.agencyId === agencyId,
    );

    let lastActivityAt: Date | null = null;
    for (const submission of agencySubmissions) {
      for (const date of [submission.submittedAt, submission.decidedAt, submission.createdAt]) {
        if (date && (!lastActivityAt || date > lastActivityAt)) {
          lastActivityAt = date;
        }
      }
    }

    return {
      agencyId,
      nameFr: agencyById.get(agencyId)?.nameFr ?? agencyId,
      nameAr: agencyById.get(agencyId)?.nameAr ?? null,
      submissions: Number(countRow?.total ?? agencySubmissions.length),
      pending: Number(countRow?.pending ?? 0),
      findings: findingsByAgency.get(agencyId) ?? 0,
      filings: agencyFilings.length,
      documents: documentsByAgency.get(agencyId)?.size ?? 0,
      lastActivityAt,
    };
  });

  // Timeline: drop every event tied to an agency the caller cannot see.
  const submissionAgency = new Map(
    summaries.submissions.map((submission) => [submission.id, submission.agencyId]),
  );
  const timeline: Array<{
    id: string;
    action: string;
    summary: string | null;
    actorType: string;
    createdAt: Date;
    agencyId: string | null;
  }> = [];

  for (const event of activity) {
    let agencyId: string | null = null;
    if (event.entityType === "submission" && event.entityId) {
      const linkedAgency = submissionAgency.get(event.entityId);
      if (!linkedAgency) {
        continue;
      }
      agencyId = linkedAgency;
    } else {
      const data = asRecord(event.data);
      if (data && typeof data.agencyId === "string") {
        agencyId = data.agencyId;
      }
    }

    if (agencyId && !accessibleSet.has(agencyId)) {
      continue;
    }

    timeline.push({
      id: event.id,
      action: event.action,
      summary: event.summary,
      actorType: event.actorType,
      createdAt: event.createdAt,
      agencyId,
    });
  }

  return {
    company: {
      id: company.id,
      legalName: company.legalName,
      legalNameAr: company.legalNameAr,
      tradeName: company.tradeName,
      uniqueIdentifier: company.uniqueIdentifier,
      registryType: company.registryType,
      legalForm: company.legalForm,
      capitalAmount: company.capitalAmount,
      currency: company.currency,
      registryState: company.registryState,
      status: company.status,
      fiscalDefault: company.fiscalDefault,
      headquartersAddress: company.headquartersAddress,
      mainActivityLabel: company.mainActivityLabel,
      activityStartDate: company.activityStartDate,
      lastFinancialStatementsDate: company.lastFinancialStatementsDate,
      lastBeneficialDeclarationDate: company.lastBeneficialDeclarationDate,
      taxId: company.taxId,
    },
    accessibleAgencies: dossierAgencyIds.map((agencyId) => ({
      id: agencyId,
      nameFr: agencyById.get(agencyId)?.nameFr ?? agencyId,
      nameAr: agencyById.get(agencyId)?.nameAr ?? null,
    })),
    sections,
    timeline,
    documents,
  };
}

/* Document integrity */

export type DocumentIntegrityInput = {
  agencyId: string;
  documentVersionId: string;
};

export async function getDocumentIntegrity(context: Context, input: DocumentIntegrityInput) {
  const user = requireUser(context);
  const activeAgencyIds = await loadCallerActiveAgencyIds(context, user.id);
  assertCallerBelongsToAgency(activeAgencyIds, input.agencyId);

  const row = await repo.findDocumentVersionWithDocument(context.db, input.documentVersionId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Document introuvable." });
  }

  const links = await repo.listSubmissionAgencyLinksForDocuments(
    context.db,
    [input.documentVersionId],
    [input.agencyId],
  );
  if (links.length === 0) {
    // Do not leak the document's existence to an agency it is not linked to.
    throw new ORPCError("NOT_FOUND", { message: "Document introuvable." });
  }

  const { version, document } = row;
  const companyId = document?.companyId ?? links[0]?.companyId ?? null;
  const snapshots = companyId
    ? await repo.listLatestSnapshotsForCompany(context.db, companyId)
    : [];
  const latest = snapshots[0] ?? null;

  const hashPresent = notEmpty(version.hash);
  const mimeType = version.mimeType ?? "";
  const typeAllowed = mimeType === "application/pdf" || mimeType.startsWith("image/");
  const sizePlausible = version.size > 0 && version.size <= MAX_PLAUSIBLE_SIZE;
  const chainLoop =
    version.supersedesVersionId !== null && version.supersedesVersionId === version.id;
  const hasSnapshot = latest !== null;
  const registryVerified = notEmpty(latest?.verificationNumber);

  const checks = [
    {
      code: "hash_present",
      labelFr: "Empreinte d'intégrité présente",
      status: hashPresent ? ("pass" as const) : ("warn" as const),
      detail: hashPresent
        ? "Une empreinte d'intégrité est enregistrée pour ce fichier."
        : "Aucune empreinte d'intégrité n'est enregistrée : impossible de confirmer que le fichier n'a pas été modifié.",
    },
    {
      code: "file_type_allowed",
      labelFr: "Type de fichier autorisé",
      status: typeAllowed ? ("pass" as const) : ("warn" as const),
      detail: typeAllowed
        ? `Type de fichier accepté (${mimeType}).`
        : `Type de fichier inhabituel (${mimeType || "inconnu"}) : à vérifier manuellement.`,
    },
    {
      code: "file_size_plausible",
      labelFr: "Taille du fichier plausible",
      status: sizePlausible ? ("pass" as const) : ("warn" as const),
      detail: sizePlausible
        ? "La taille du fichier est dans la plage attendue."
        : "La taille du fichier est nulle ou anormalement élevée : à vérifier manuellement.",
    },
    {
      code: "version_chain",
      labelFr: "Chaîne des versions cohérente",
      status: chainLoop ? ("fail" as const) : ("pass" as const),
      detail: chainLoop
        ? "Incohérence détectée : cette version se référence elle-même."
        : "La chaîne des versions est cohérente.",
    },
    {
      code: "registry_verification_number",
      labelFr: "Numéro de vérification du registre",
      status: !hasSnapshot
        ? ("unknown" as const)
        : registryVerified
          ? ("pass" as const)
          : ("warn" as const),
      detail: !hasSnapshot
        ? "Aucun extrait de registre rattaché."
        : registryVerified
          ? "Un numéro de vérification figure sur l'extrait de registre rattaché."
          : "L'extrait de registre rattaché ne comporte pas de numéro de vérification.",
    },
    {
      code: "electronic_signature",
      labelFr: "Signature électronique",
      status: "unknown" as const,
      detail:
        "La vérification de signature électronique / DIGIGO n'est pas disponible dans ce back office. Elle doit être contrôlée manuellement sur la plateforme émettrice.",
    },
  ];

  return {
    documentId: version.documentId,
    title: document?.title ?? version.fileName,
    documentVersionId: version.id,
    version: version.version,
    fileName: version.fileName,
    mimeType: version.mimeType,
    size: version.size,
    hash: version.hash,
    hasHash: hashPresent,
    source: version.source,
    uploadedAt: version.uploadedAt,
    uploadedByUserId: version.uploadedByUserId,
    pageCount: version.pageCount,
    supersedesVersionId: version.supersedesVersionId,
    isCurrent: document?.currentVersionId === version.id,
    documentStatus: document?.status ?? "uploaded",
    authenticity: {
      checks,
      verificationNumber: latest?.verificationNumber ?? null,
      extractNumber: latest?.extractNumber ?? null,
      editionDate: latest?.editionDate ?? null,
      registryState: latest?.registryState ?? null,
    },
  };
}

/* Agency members */

export type AgencyMembersInput = { agencyId: string };

export async function listAgencyMembers(context: Context, input: AgencyMembersInput) {
  const user = requireUser(context);

  const [members, myMemberships] = await Promise.all([
    repo.listAgencyMembers(context.db, input.agencyId),
    repo.listActiveMembershipsForUser(context.db, user.id, [input.agencyId]),
  ]);
  const myRole = myMemberships[0]?.role ?? null;
  const canManage = myRole === "supervisor" || myRole === "admin";

  return {
    canManage,
    members: members.map((member) => ({
      userId: member.userId,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      status: member.status,
      addedAt: member.addedAt,
      isSelf: member.userId === user.id,
    })),
  };
}

export type AgencyMemberAddInput = {
  agencyId: string;
  email: string;
  role: "officer" | "supervisor" | "admin";
};

export async function addAgencyMember(context: Context, input: AgencyMemberAddInput) {
  const user = requireUser(context);
  const email = input.email.trim().toLowerCase();

  const target = await repo.findUserByEmail(context.db, email);
  if (!target) {
    throw new ORPCError("NOT_FOUND", {
      message:
        "Aucun compte n'existe pour cet email. La personne doit d'abord créer son compte sur la plateforme.",
    });
  }

  // One organization per officer: block attaching a user who already belongs
  // to a different agency. Ministry agents may serve several organizations.
  const activeMemberships = await repo.listActiveMembershipsForUser(context.db, target.id);
  const otherAgency = activeMemberships.find(
    (membership) => membership.agencyId !== input.agencyId,
  );
  if (otherAgency && !(await isMinistryAgent(context, target.id))) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Cet agent appartient déjà à une autre organisation. Un agent ne peut être rattaché qu'à une seule organisation.",
      data: { currentAgencyId: otherAgency.agencyId },
    });
  }

  const row = await repo.upsertAgencyMember(context.db, {
    agencyId: input.agencyId,
    userId: target.id,
    role: input.role,
    status: "active",
    addedBy: user.id,
  });

  await insertActivityEvent(context.db, {
    actorUserId: user.id,
    actorType: "officer",
    entityType: "agency_membership",
    entityId: target.id,
    action: "agency.member.added",
    summary: `Membre ajouté à l'agence ${input.agencyId}`,
    data: { agencyId: input.agencyId, role: input.role },
  });

  return {
    userId: target.id,
    email: target.email ?? email,
    role: row?.role ?? input.role,
    status: row?.status ?? "active",
    addedAt: row?.addedAt ?? new Date(),
  };
}

export type AgencyMemberUpdateInput = {
  agencyId: string;
  userId: string;
  role?: "officer" | "supervisor" | "admin";
  status?: "invited" | "active" | "suspended" | "revoked";
};

export async function updateAgencyMember(context: Context, input: AgencyMemberUpdateInput) {
  const user = requireUser(context);
  if (input.userId === user.id) {
    throw new ORPCError("FORBIDDEN", {
      message: "Vous ne pouvez pas modifier vos propres droits d'accès.",
    });
  }

  const [current] = await repo.listActiveMembershipsForUser(context.db, input.userId, [
    input.agencyId,
  ]);
  const isActiveAdmin = current?.role === "admin";
  const removesAdmin =
    isActiveAdmin &&
    ((input.role !== undefined && input.role !== "admin") ||
      (input.status !== undefined && input.status !== "active"));

  if (removesAdmin) {
    const activeAdmins = await repo.countActiveAdmins(context.db, input.agencyId);
    if (activeAdmins <= 1) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Impossible de retirer le dernier administrateur actif de l'agence. Nommez d'abord un autre administrateur.",
      });
    }
  }

  const row = await repo.updateAgencyMember(context.db, {
    agencyId: input.agencyId,
    userId: input.userId,
    role: input.role,
    status: input.status,
  });
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Ce membre est introuvable." });
  }

  await insertActivityEvent(context.db, {
    actorUserId: user.id,
    actorType: "officer",
    entityType: "agency_membership",
    entityId: input.userId,
    action: "agency.member.updated",
    summary: `Droits d'accès modifiés pour l'agence ${input.agencyId}`,
    data: {
      agencyId: input.agencyId,
      role: input.role ?? row.role,
      status: input.status ?? row.status,
    },
  });

  return {
    userId: row.userId,
    role: row.role,
    status: row.status,
    addedAt: row.addedAt,
  };
}

export type AgencyMemberRemoveInput = { agencyId: string; userId: string };

export async function removeAgencyMember(context: Context, input: AgencyMemberRemoveInput) {
  const user = requireUser(context);
  if (input.userId === user.id) {
    throw new ORPCError("FORBIDDEN", {
      message: "Vous ne pouvez pas modifier vos propres droits d'accès.",
    });
  }

  const [current] = await repo.listActiveMembershipsForUser(context.db, input.userId, [
    input.agencyId,
  ]);
  if (current?.role === "admin") {
    const activeAdmins = await repo.countActiveAdmins(context.db, input.agencyId);
    if (activeAdmins <= 1) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Impossible de retirer le dernier administrateur actif de l'agence. Nommez d'abord un autre administrateur.",
      });
    }
  }

  const row = await repo.updateAgencyMember(context.db, {
    agencyId: input.agencyId,
    userId: input.userId,
    status: "revoked",
  });
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Ce membre est introuvable." });
  }

  await insertActivityEvent(context.db, {
    actorUserId: user.id,
    actorType: "officer",
    entityType: "agency_membership",
    entityId: input.userId,
    action: "agency.member.revoked",
    summary: `Accès retiré pour l'agence ${input.agencyId}`,
    data: { agencyId: input.agencyId, status: "revoked" },
  });

  return {
    userId: row.userId,
    role: row.role,
    status: row.status,
  };
}
