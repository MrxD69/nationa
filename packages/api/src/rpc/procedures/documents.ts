import { z } from "zod";

import { documentKindSchema } from "../../domain/extraction";
import { companyProcedure, userProcedure } from "../builders";
import {
  attachDocumentToCase,
  getDocumentDetail,
  listActiveDocumentTypes,
  listCaseDocuments,
  listCompanyDocuments,
  registerDocument,
  reprocessDocument,
  requestUpload,
} from "../services/documents.service";

const scopeFields = {
  companyId: z.string().min(1).optional(),
  caseId: z.guid().optional(),
  documentTypeId: z.guid().optional(),
};

export const documentsRouter = {
  list: companyProcedure("documents.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        documentTypeId: z.guid().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(({ context, input }) => listCompanyDocuments(context, input)),

  get: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        documentId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getDocumentDetail(context, input)),

  create: companyProcedure("documents.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        caseId: z.guid().optional(),
        documentTypeId: z.guid().optional(),
        documentTypeCode: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().int().nonnegative(),
        hash: z.string().optional(),
        pageCount: z.number().int().positive().optional(),
        kind: documentKindSchema.optional(),
        extract: z.boolean().optional(),
      }),
    )
    .handler(({ context, input }) => registerDocument(context, input)),

  register: userProcedure
    .input(
      z.object({
        ...scopeFields,
        documentId: z.guid().optional(),
        versionId: z.guid().optional(),
        storageKey: z.string().min(1),
        documentTypeCode: z.string().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().int().nonnegative(),
        hash: z.string().optional(),
        pageCount: z.number().int().positive().optional(),
        kind: documentKindSchema.optional(),
        runExtraction: z.boolean().optional(),
        extract: z.boolean().optional(),
      }),
    )
    .handler(({ context, input }) => registerDocument(context, input)),

  requestUpload: userProcedure
    .input(
      z.object({
        ...scopeFields,
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        size: z.number().int().nonnegative(),
      }),
    )
    .handler(({ context, input }) => requestUpload(context, input)),

  listForCase: userProcedure
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => listCaseDocuments(context, input)),

  attachToCase: userProcedure
    .input(
      z.object({
        caseId: z.guid(),
        documentId: z.guid(),
        stepId: z.guid().optional(),
      }),
    )
    .handler(({ context, input }) => attachDocumentToCase(context, input)),

  reprocess: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        documentId: z.guid(),
        documentVersionId: z.guid().optional(),
        kind: documentKindSchema.optional(),
      }),
    )
    .handler(({ context, input }) => reprocessDocument(context, input)),

  listTypes: userProcedure.handler(({ context }) => listActiveDocumentTypes(context)),
};
