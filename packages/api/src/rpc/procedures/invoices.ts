import { z } from "zod";

import { companyProcedure } from "../builders";
import {
  createManualInvoice,
  extractInvoiceFromDocument,
  getInvoice,
  listInvoices,
  listInvoicesForPeriod,
  removeInvoice,
  updateInvoice,
  verifyInvoice,
} from "../services/invoices.service";

const directionSchema = z.enum(["purchase", "sale"]);
const statusSchema = z.enum(["extracted", "needs_review", "verified"]);

const lineSchema = z.object({
  description: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
  taxRate: z.number().nullish(),
  taxAmount: z.number().nullish(),
  lineTotal: z.number().nullish(),
});

const invoiceFieldsSchema = z.object({
  direction: directionSchema,
  supplierName: z.string().nullish(),
  supplierTaxId: z.string().nullish(),
  invoiceNumber: z.string().nullish(),
  issueDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  currency: z.string().nullish(),
  subtotal: z.number().nullish(),
  taxAmount: z.number().nullish(),
  total: z.number().nullish(),
  lines: z.array(lineSchema).optional(),
});

export const invoicesRouter = {
  list: companyProcedure("invoices.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        direction: directionSchema.optional(),
        status: statusSchema.optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .handler(({ context, input }) => listInvoices(context, input)),

  get: companyProcedure("invoices.read")
    .input(z.object({ companyId: z.string().min(1), invoiceId: z.guid() }))
    .handler(({ context, input }) => getInvoice(context, input)),

  extractFromDocument: companyProcedure("invoices.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        documentId: z.guid(),
        documentVersionId: z.guid().optional(),
      }),
    )
    .handler(({ context, input }) => extractInvoiceFromDocument(context, input)),

  createManual: companyProcedure("invoices.write")
    .input(invoiceFieldsSchema.extend({ companyId: z.string().min(1) }))
    .handler(({ context, input }) => createManualInvoice(context, input)),

  update: companyProcedure("invoices.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        invoiceId: z.guid(),
        patch: invoiceFieldsSchema.partial(),
        lines: z.array(lineSchema).optional(),
      }),
    )
    .handler(({ context, input }) =>
      updateInvoice(context, {
        companyId: input.companyId,
        invoiceId: input.invoiceId,
        patch: input.patch,
        lines: input.lines,
      }),
    ),

  verify: companyProcedure("invoices.verify")
    .input(z.object({ companyId: z.string().min(1), invoiceId: z.guid() }))
    .handler(({ context, input }) => verifyInvoice(context, input)),

  remove: companyProcedure("invoices.write")
    .input(z.object({ companyId: z.string().min(1), invoiceId: z.guid() }))
    .handler(({ context, input }) => removeInvoice(context, input)),

  listForPeriod: companyProcedure("invoices.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        statuses: z.array(statusSchema).optional(),
      }),
    )
    .handler(({ context, input }) => listInvoicesForPeriod(context, input)),
};
