CREATE TYPE "account_type" AS ENUM('owner', 'accountant', 'officer', 'admin');--> statement-breakpoint
CREATE TYPE "agency_membership_role" AS ENUM('officer', 'supervisor', 'admin');--> statement-breakpoint
CREATE TYPE "agency_membership_status" AS ENUM('invited', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "gender" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "company_access_role" AS ENUM('owner', 'employee', 'accountant', 'accountant_assistant', 'admin');--> statement-breakpoint
CREATE TYPE "company_access_status" AS ENUM('invited', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "company_person_role" AS ENUM('manager', 'agent', 'owner', 'legal_representative', 'auditor', 'liquidator', 'other');--> statement-breakpoint
CREATE TYPE "company_status" AS ENUM('draft', 'active', 'suspended', 'radiated');--> statement-breakpoint
CREATE TYPE "fiscal_default" AS ENUM('none', 'months_12_24', 'over_24_months', 'unknown');--> statement-breakpoint
CREATE TYPE "registry_state" AS ENUM('actif', 'suspendu', 'radie');--> statement-breakpoint
CREATE TYPE "registry_type" AS ENUM('societe', 'entreprise');--> statement-breakpoint
CREATE TYPE "obligation_periodicity" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'event_based', 'one_off', 'irregular');--> statement-breakpoint
CREATE TYPE "procedure_step_type" AS ENUM('info', 'form', 'upload', 'payment', 'review', 'submission');--> statement-breakpoint
CREATE TYPE "case_status" AS ENUM('draft', 'in_progress', 'awaiting_user', 'awaiting_review', 'submitted', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "case_step_status" AS ENUM('locked', 'available', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "document_link_type" AS ENUM('company', 'case', 'person', 'submission');--> statement-breakpoint
CREATE TYPE "document_status" AS ENUM('uploaded', 'processing', 'extracted', 'needs_review', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "document_version_source" AS ENUM('upload', 'generated', 'ai_generated');--> statement-breakpoint
CREATE TYPE "extraction_kind" AS ENUM('ocr', 'text', 'llm_structured');--> statement-breakpoint
CREATE TYPE "extraction_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "field_source_kind" AS ENUM('user', 'document', 'ai', 'import', 'system');--> statement-breakpoint
CREATE TYPE "provenance_subject_type" AS ENUM('company', 'person', 'case_field', 'submission', 'invoice', 'finding', 'filing');--> statement-breakpoint
CREATE TYPE "check_run_status" AS ENUM('queued', 'running', 'passed', 'failed', 'error');--> statement-breakpoint
CREATE TYPE "check_subject_type" AS ENUM('case', 'submission', 'company', 'document');--> statement-breakpoint
CREATE TYPE "finding_note_kind" AS ENUM('note', 'explanation');--> statement-breakpoint
CREATE TYPE "finding_severity" AS ENUM('info', 'warning', 'error', 'blocker');--> statement-breakpoint
CREATE TYPE "finding_status" AS ENUM('open', 'resolved', 'waived', 'acknowledged');--> statement-breakpoint
CREATE TYPE "cleanliness_tier" AS ENUM('clean', 'minor_concern', 'needs_review');--> statement-breakpoint
CREATE TYPE "review_decision" AS ENUM('approve', 'reject', 'return_for_correction', 'escalate');--> statement-breakpoint
CREATE TYPE "submission_status" AS ENUM('draft', 'queued', 'in_review', 'approved', 'rejected', 'returned', 'escalated');--> statement-breakpoint
CREATE TYPE "invoice_direction" AS ENUM('purchase', 'sale');--> statement-breakpoint
CREATE TYPE "invoice_status" AS ENUM('extracted', 'needs_review', 'verified');--> statement-breakpoint
CREATE TYPE "filing_status" AS ENUM('draft', 'ready', 'under_review', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "fee_charge_status" AS ENUM('quoted', 'due', 'paid', 'waived', 'refunded');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('processing', 'failed', 'completed', 'refunded');--> statement-breakpoint
CREATE TYPE "ai_message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "ai_proposal_status" AS ENUM('draft', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "ai_proposal_subject_type" AS ENUM('case', 'company', 'submission', 'finding', 'filing', 'field');--> statement-breakpoint
CREATE TYPE "event_actor_type" AS ENUM('user', 'system', 'ai', 'officer');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('submission_status', 'review_decision', 'deadline_reminder', 'document_processed', 'check_failed', 'access_granted', 'invoice_ready', 'mention', 'system');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY,
	"account_type" "account_type" DEFAULT 'owner'::"account_type" NOT NULL,
	"display_name" text,
	"locale" text DEFAULT 'fr' NOT NULL,
	"phone" text,
	"avatar_url" text,
	"onboarding_answers" jsonb,
	"terms_accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" text PRIMARY KEY,
	"name_fr" text NOT NULL,
	"name_ar" text,
	"name_en" text,
	"description" text,
	"website" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agency_memberships" (
	"agency_id" text,
	"user_id" uuid,
	"role" "agency_membership_role" DEFAULT 'officer'::"agency_membership_role" NOT NULL,
	"status" "agency_membership_status" DEFAULT 'invited'::"agency_membership_status" NOT NULL,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_memberships_pkey" PRIMARY KEY("agency_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "agency_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"first_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"full_name_ar" text,
	"national_id" text,
	"nationality" text,
	"birth_date" date,
	"gender" "gender",
	"email" text,
	"phone" text,
	"address" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "persons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "access_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"token" text NOT NULL,
	"email" text NOT NULL,
	"company_id" uuid NOT NULL,
	"role" "company_access_role" NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_access_grants" (
	"company_id" uuid,
	"user_id" uuid,
	"role" "company_access_role" NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "company_access_status" DEFAULT 'invited'::"company_access_status" NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_access_grants_pkey" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "company_access_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"unique_identifier" text,
	"internal_management_number" text,
	"registry_type" "registry_type",
	"legal_name" text NOT NULL,
	"legal_name_ar" text,
	"trade_name" text,
	"brand_name" text,
	"legal_form" text,
	"capital_amount" numeric(14,3),
	"currency" text DEFAULT 'TND' NOT NULL,
	"duration_years" integer,
	"publication_date" date,
	"headquarters_address" jsonb,
	"activity_address" jsonb,
	"main_activity_label" text,
	"main_activity_label_ar" text,
	"main_activity_code" text,
	"activity_start_date" date,
	"registry_state" "registry_state" DEFAULT 'actif'::"registry_state" NOT NULL,
	"secondary_establishments_count" integer,
	"leasing" boolean DEFAULT false NOT NULL,
	"has_pledge" boolean DEFAULT false NOT NULL,
	"fiscal_default" "fiscal_default" DEFAULT 'unknown'::"fiscal_default" NOT NULL,
	"mention_date" date,
	"last_modification_date" date,
	"last_financial_statements_date" date,
	"last_beneficial_declaration_date" date,
	"workforce" integer,
	"tax_id" text,
	"status" "company_status" DEFAULT 'draft'::"company_status" NOT NULL,
	"created_by_user_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "company_person_role" NOT NULL,
	"role_label_raw" text,
	"start_date" date,
	"end_date" date,
	"ownership_percent" numeric(5,2),
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_persons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_registry_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"document_version_id" uuid,
	"extract_number" text,
	"edition_date" date,
	"verification_number" text,
	"registry_state" "registry_state",
	"snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_registry_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"agency_id" text NOT NULL,
	"code" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_ar" text,
	"description" text,
	"legal_basis" text,
	"periodicity" "obligation_periodicity" NOT NULL,
	"deadline_rule" jsonb,
	"penalty_summary" text,
	"applies_to" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "procedure_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"code" text NOT NULL,
	"title_fr" text NOT NULL,
	"title_ar" text,
	"description" text,
	"step_type" "procedure_step_type" NOT NULL,
	"required_document_type_id" uuid,
	"form_schema" jsonb,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "procedure_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "procedure_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"agency_id" text NOT NULL,
	"obligation_id" uuid,
	"code" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_ar" text,
	"description" text,
	"category" text,
	"estimated_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "procedure_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"agency_id" text,
	"code" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_ar" text,
	"description" text,
	"accepted_mime_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"required_fields" jsonb,
	"validity_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"agency_id" text NOT NULL,
	"procedure_template_id" uuid,
	"obligation_id" uuid,
	"label" text NOT NULL,
	"amount" numeric(12,3) NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"logic" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "obligation_citations" (
	"obligation_id" uuid,
	"rule_citation_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obligation_citations_pkey" PRIMARY KEY("obligation_id","rule_citation_id")
);
--> statement-breakpoint
ALTER TABLE "obligation_citations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "procedure_step_citations" (
	"step_id" uuid,
	"rule_citation_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procedure_step_citations_pkey" PRIMARY KEY("step_id","rule_citation_id")
);
--> statement-breakpoint
ALTER TABLE "procedure_step_citations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rule_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" text NOT NULL,
	"article" text,
	"title_fr" text,
	"title_ar" text,
	"text_fr" text,
	"text_ar" text,
	"url" text,
	"effective_from" date,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rule_citations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "case_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid NOT NULL,
	"step_id" uuid,
	"field_key" text NOT NULL,
	"value_text" text,
	"value_jsonb" jsonb,
	"source_kind" "field_source_kind" DEFAULT 'user'::"field_source_kind" NOT NULL,
	"source_document_version_id" uuid,
	"extraction_field_id" uuid,
	"ai_proposal_id" uuid,
	"confidence" numeric(5,2),
	"entered_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_field_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "case_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid NOT NULL,
	"template_step_id" uuid,
	"position" integer NOT NULL,
	"status" "case_step_status" DEFAULT 'locked'::"case_step_status" NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"assigned_to_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"template_id" uuid NOT NULL,
	"company_id" uuid,
	"applicant_person_id" uuid,
	"created_by_user_id" uuid,
	"assigned_to_user_id" uuid,
	"title" text NOT NULL,
	"status" "case_status" DEFAULT 'draft'::"case_status" NOT NULL,
	"context" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_links" (
	"document_id" uuid,
	"link_type" "document_link_type",
	"link_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_links_pkey" PRIMARY KEY("document_id","link_type","link_id")
);
--> statement-breakpoint
ALTER TABLE "document_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"hash" text,
	"page_count" integer,
	"source" "document_version_source" DEFAULT 'upload'::"document_version_source" NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_version_id" uuid
);
--> statement-breakpoint
ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid,
	"case_id" uuid,
	"document_type_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "document_status" DEFAULT 'uploaded'::"document_status" NOT NULL,
	"current_version_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "extracted_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"extraction_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label_raw" text,
	"normalized_key" text,
	"value_text" text,
	"value_jsonb" jsonb,
	"confidence" numeric(5,2),
	"page" integer,
	"bbox" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extracted_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_version_id" uuid NOT NULL,
	"kind" "extraction_kind" NOT NULL,
	"engine" text,
	"model" text,
	"status" "extraction_status" DEFAULT 'queued'::"extraction_status" NOT NULL,
	"raw_result" jsonb,
	"confidence_overall" numeric(5,2),
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extractions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "field_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_type" "provenance_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"source_kind" "field_source_kind" NOT NULL,
	"source_document_version_id" uuid,
	"extraction_field_id" uuid,
	"ai_proposal_id" uuid,
	"confidence" numeric(5,2),
	"entered_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_provenance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "check_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_type" "check_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"rule_set_version" text NOT NULL,
	"status" "check_run_status" DEFAULT 'queued'::"check_run_status" NOT NULL,
	"summary" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "finding_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"finding_id" uuid NOT NULL,
	"user_id" uuid,
	"kind" "finding_note_kind" DEFAULT 'note'::"finding_note_kind" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finding_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"check_run_id" uuid NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"message_plain" text NOT NULL,
	"compared_refs" jsonb,
	"suggested_fix" text,
	"status" "finding_status" DEFAULT 'open'::"finding_status" NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"officer_user_id" uuid NOT NULL,
	"decision" "review_decision" NOT NULL,
	"reason" text,
	"notes" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submission_documents" (
	"submission_id" uuid,
	"document_version_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_documents_pkey" PRIMARY KEY("submission_id","document_version_id")
);
--> statement-breakpoint
ALTER TABLE "submission_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid,
	"company_id" uuid NOT NULL,
	"agency_id" text NOT NULL,
	"submitted_by_user_id" uuid,
	"status" "submission_status" DEFAULT 'draft'::"submission_status" NOT NULL,
	"snapshot" jsonb,
	"cleanliness_tier" "cleanliness_tier" DEFAULT 'needs_review'::"cleanliness_tier" NOT NULL,
	"cleanliness_score" numeric(5,2),
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text,
	"quantity" numeric(14,3),
	"unit_price" numeric(14,3),
	"tax_rate" numeric(5,2),
	"tax_amount" numeric(14,3),
	"line_total" numeric(14,3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"direction" "invoice_direction" NOT NULL,
	"supplier_name" text,
	"supplier_tax_id" text,
	"invoice_number" text,
	"issue_date" date,
	"due_date" date,
	"currency" text DEFAULT 'TND' NOT NULL,
	"subtotal" numeric(14,3),
	"tax_amount" numeric(14,3),
	"total" numeric(14,3) NOT NULL,
	"source_document_version_id" uuid,
	"status" "invoice_status" DEFAULT 'extracted'::"invoice_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "filing_invoices" (
	"filing_id" uuid,
	"invoice_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filing_invoices_pkey" PRIMARY KEY("filing_id","invoice_id")
);
--> statement-breakpoint
ALTER TABLE "filing_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"agency_id" text NOT NULL,
	"obligation_id" uuid,
	"tax_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "filing_status" DEFAULT 'draft'::"filing_status" NOT NULL,
	"prepared_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"total_tax_due" numeric(14,3),
	"payload" jsonb,
	"document_id" uuid,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "filings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fee_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid,
	"fee_id" uuid,
	"company_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" numeric(12,3) NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"status" "fee_charge_status" DEFAULT 'quoted'::"fee_charge_status" NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_charges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"charge_id" uuid NOT NULL,
	"payer_user_id" uuid,
	"provider" text NOT NULL,
	"provider_ref" text,
	"amount" numeric(12,3) NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"status" "payment_status" DEFAULT 'processing'::"payment_status" NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_id" uuid NOT NULL,
	"number" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" uuid
);
--> statement-breakpoint
ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"proposal_id" uuid,
	"message_id" text,
	"rule_citation_id" uuid NOT NULL,
	"snippet" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_citations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"case_id" uuid,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY,
	"conversation_id" uuid NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"parts" jsonb DEFAULT '[]' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" uuid,
	"message_id" text,
	"subject_type" "ai_proposal_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" "ai_proposal_status" DEFAULT 'draft'::"ai_proposal_status" NOT NULL,
	"payload" jsonb,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid,
	"actor_user_id" uuid,
	"actor_type" "event_actor_type" DEFAULT 'system'::"event_actor_type" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"summary" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"entity_type" text,
	"entity_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "preferences" (
	"user_id" uuid PRIMARY KEY,
	"theme" jsonb,
	"ai_instructions" jsonb,
	"locale" text DEFAULT 'fr' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "profiles_account_type_idx" ON "profiles" ("account_type");--> statement-breakpoint
CREATE INDEX "agencies_active_idx" ON "agencies" ("active");--> statement-breakpoint
CREATE INDEX "agency_memberships_user_status_idx" ON "agency_memberships" ("user_id","status");--> statement-breakpoint
CREATE INDEX "agency_memberships_agency_status_idx" ON "agency_memberships" ("agency_id","status");--> statement-breakpoint
CREATE INDEX "agency_memberships_added_by_idx" ON "agency_memberships" ("added_by");--> statement-breakpoint
CREATE INDEX "persons_user_id_idx" ON "persons" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "persons_national_id_uidx" ON "persons" ("national_id");--> statement-breakpoint
CREATE INDEX "persons_full_name_idx" ON "persons" ("full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "access_invitations_token_uidx" ON "access_invitations" ("token");--> statement-breakpoint
CREATE INDEX "access_invitations_email_company_idx" ON "access_invitations" ("email","company_id");--> statement-breakpoint
CREATE INDEX "access_invitations_company_accepted_idx" ON "access_invitations" ("company_id","accepted_at");--> statement-breakpoint
CREATE INDEX "company_access_grants_user_status_idx" ON "company_access_grants" ("user_id","status");--> statement-breakpoint
CREATE INDEX "company_access_grants_company_status_idx" ON "company_access_grants" ("company_id","status");--> statement-breakpoint
CREATE INDEX "company_access_grants_granted_by_idx" ON "company_access_grants" ("granted_by");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_unique_identifier_uidx" ON "companies" ("unique_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_internal_management_number_uidx" ON "companies" ("internal_management_number");--> statement-breakpoint
CREATE INDEX "companies_tax_id_idx" ON "companies" ("tax_id");--> statement-breakpoint
CREATE INDEX "companies_status_deleted_created_idx" ON "companies" ("status","deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "companies_legal_name_idx" ON "companies" ("legal_name");--> statement-breakpoint
CREATE INDEX "companies_created_by_idx" ON "companies" ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_persons_company_person_role_uidx" ON "company_persons" ("company_id","person_id","role");--> statement-breakpoint
CREATE INDEX "company_persons_person_role_idx" ON "company_persons" ("person_id","role");--> statement-breakpoint
CREATE INDEX "company_persons_company_role_idx" ON "company_persons" ("company_id","role");--> statement-breakpoint
CREATE INDEX "company_persons_added_by_idx" ON "company_persons" ("added_by");--> statement-breakpoint
CREATE INDEX "company_registry_snapshots_company_created_idx" ON "company_registry_snapshots" ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "company_registry_snapshots_extract_number_idx" ON "company_registry_snapshots" ("extract_number");--> statement-breakpoint
CREATE INDEX "company_registry_snapshots_document_version_id_idx" ON "company_registry_snapshots" ("document_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "obligations_agency_code_uidx" ON "obligations" ("agency_id","code");--> statement-breakpoint
CREATE INDEX "obligations_agency_active_idx" ON "obligations" ("agency_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_steps_template_position_uidx" ON "procedure_steps" ("template_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_steps_template_code_uidx" ON "procedure_steps" ("template_id","code");--> statement-breakpoint
CREATE INDEX "procedure_steps_required_document_type_id_idx" ON "procedure_steps" ("required_document_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_templates_agency_code_uidx" ON "procedure_templates" ("agency_id","code");--> statement-breakpoint
CREATE INDEX "procedure_templates_obligation_id_idx" ON "procedure_templates" ("obligation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_types_agency_code_uidx" ON "document_types" ("agency_id","code");--> statement-breakpoint
CREATE INDEX "document_types_code_idx" ON "document_types" ("code");--> statement-breakpoint
CREATE INDEX "fees_agency_active_idx" ON "fees" ("agency_id","active");--> statement-breakpoint
CREATE INDEX "fees_procedure_template_id_idx" ON "fees" ("procedure_template_id");--> statement-breakpoint
CREATE INDEX "fees_obligation_id_idx" ON "fees" ("obligation_id");--> statement-breakpoint
CREATE INDEX "obligation_citations_rule_citation_id_idx" ON "obligation_citations" ("rule_citation_id");--> statement-breakpoint
CREATE INDEX "obligation_citations_added_by_idx" ON "obligation_citations" ("added_by");--> statement-breakpoint
CREATE INDEX "procedure_step_citations_rule_citation_id_idx" ON "procedure_step_citations" ("rule_citation_id");--> statement-breakpoint
CREATE INDEX "procedure_step_citations_added_by_idx" ON "procedure_step_citations" ("added_by");--> statement-breakpoint
CREATE INDEX "rule_citations_source_article_idx" ON "rule_citations" ("source","article");--> statement-breakpoint
CREATE UNIQUE INDEX "case_field_values_case_field_key_uidx" ON "case_field_values" ("case_id","field_key");--> statement-breakpoint
CREATE INDEX "case_field_values_case_step_idx" ON "case_field_values" ("case_id","step_id");--> statement-breakpoint
CREATE INDEX "case_field_values_source_document_version_id_idx" ON "case_field_values" ("source_document_version_id");--> statement-breakpoint
CREATE INDEX "case_field_values_extraction_field_id_idx" ON "case_field_values" ("extraction_field_id");--> statement-breakpoint
CREATE INDEX "case_field_values_ai_proposal_id_idx" ON "case_field_values" ("ai_proposal_id");--> statement-breakpoint
CREATE INDEX "case_field_values_entered_by_idx" ON "case_field_values" ("entered_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_steps_case_position_uidx" ON "case_steps" ("case_id","position");--> statement-breakpoint
CREATE INDEX "case_steps_case_status_idx" ON "case_steps" ("case_id","status");--> statement-breakpoint
CREATE INDEX "case_steps_assigned_to_idx" ON "case_steps" ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "cases_company_status_updated_idx" ON "cases" ("company_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "cases_assigned_status_idx" ON "cases" ("assigned_to_user_id","status");--> statement-breakpoint
CREATE INDEX "cases_template_id_idx" ON "cases" ("template_id");--> statement-breakpoint
CREATE INDEX "cases_created_by_idx" ON "cases" ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "cases_applicant_person_id_idx" ON "cases" ("applicant_person_id");--> statement-breakpoint
CREATE INDEX "document_links_link_type_link_id_idx" ON "document_links" ("link_type","link_id");--> statement-breakpoint
CREATE INDEX "document_links_added_by_idx" ON "document_links" ("added_by");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_version_uidx" ON "document_versions" ("document_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_storage_path_uidx" ON "document_versions" ("storage_path");--> statement-breakpoint
CREATE INDEX "document_versions_document_uploaded_idx" ON "document_versions" ("document_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "document_versions_supersedes_version_id_idx" ON "document_versions" ("supersedes_version_id");--> statement-breakpoint
CREATE INDEX "document_versions_uploaded_by_idx" ON "document_versions" ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "documents_company_status_created_idx" ON "documents" ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "documents_case_id_idx" ON "documents" ("case_id");--> statement-breakpoint
CREATE INDEX "documents_owner_status_idx" ON "documents" ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "documents_document_type_id_idx" ON "documents" ("document_type_id");--> statement-breakpoint
CREATE INDEX "documents_current_version_id_idx" ON "documents" ("current_version_id");--> statement-breakpoint
CREATE INDEX "extracted_fields_extraction_key_idx" ON "extracted_fields" ("extraction_id","key");--> statement-breakpoint
CREATE INDEX "extracted_fields_extraction_normalized_key_idx" ON "extracted_fields" ("extraction_id","normalized_key");--> statement-breakpoint
CREATE INDEX "extractions_document_version_status_idx" ON "extractions" ("document_version_id","status");--> statement-breakpoint
CREATE INDEX "extractions_document_version_created_idx" ON "extractions" ("document_version_id","created_at");--> statement-breakpoint
CREATE INDEX "extractions_status_idx" ON "extractions" ("status");--> statement-breakpoint
CREATE INDEX "field_provenance_subject_field_created_idx" ON "field_provenance" ("subject_type","subject_id","field_key","created_at");--> statement-breakpoint
CREATE INDEX "field_provenance_subject_created_idx" ON "field_provenance" ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "field_provenance_source_document_version_id_idx" ON "field_provenance" ("source_document_version_id");--> statement-breakpoint
CREATE INDEX "field_provenance_extraction_field_id_idx" ON "field_provenance" ("extraction_field_id");--> statement-breakpoint
CREATE INDEX "field_provenance_ai_proposal_id_idx" ON "field_provenance" ("ai_proposal_id");--> statement-breakpoint
CREATE INDEX "check_runs_subject_status_created_idx" ON "check_runs" ("subject_type","subject_id","status","created_at");--> statement-breakpoint
CREATE INDEX "check_runs_subject_created_idx" ON "check_runs" ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "check_runs_status_idx" ON "check_runs" ("status");--> statement-breakpoint
CREATE INDEX "finding_notes_finding_created_idx" ON "finding_notes" ("finding_id","created_at");--> statement-breakpoint
CREATE INDEX "finding_notes_user_id_idx" ON "finding_notes" ("user_id");--> statement-breakpoint
CREATE INDEX "findings_check_run_severity_idx" ON "findings" ("check_run_id","severity");--> statement-breakpoint
CREATE INDEX "findings_status_idx" ON "findings" ("status");--> statement-breakpoint
CREATE INDEX "findings_code_idx" ON "findings" ("code");--> statement-breakpoint
CREATE INDEX "reviews_submission_decided_idx" ON "reviews" ("submission_id","decided_at");--> statement-breakpoint
CREATE INDEX "reviews_officer_decided_idx" ON "reviews" ("officer_user_id","decided_at");--> statement-breakpoint
CREATE INDEX "submission_documents_document_version_id_idx" ON "submission_documents" ("document_version_id");--> statement-breakpoint
CREATE INDEX "submission_documents_added_by_idx" ON "submission_documents" ("added_by");--> statement-breakpoint
CREATE INDEX "submissions_agency_status_cleanliness_idx" ON "submissions" ("agency_id","status","cleanliness_tier","cleanliness_score");--> statement-breakpoint
CREATE INDEX "submissions_company_status_created_idx" ON "submissions" ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "submissions_case_id_idx" ON "submissions" ("case_id");--> statement-breakpoint
CREATE INDEX "submissions_submitted_by_idx" ON "submissions" ("submitted_by_user_id");--> statement-breakpoint
CREATE INDEX "submissions_status_submitted_idx" ON "submissions" ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_lines_invoice_position_uidx" ON "invoice_lines" ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_direction_supplier_number_uidx" ON "invoices" ("company_id","direction","supplier_tax_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_company_issue_date_idx" ON "invoices" ("company_id","issue_date");--> statement-breakpoint
CREATE INDEX "invoices_company_status_idx" ON "invoices" ("company_id","status");--> statement-breakpoint
CREATE INDEX "invoices_source_document_version_id_idx" ON "invoices" ("source_document_version_id");--> statement-breakpoint
CREATE INDEX "filing_invoices_invoice_id_idx" ON "filing_invoices" ("invoice_id");--> statement-breakpoint
CREATE INDEX "filing_invoices_added_by_idx" ON "filing_invoices" ("added_by");--> statement-breakpoint
CREATE INDEX "filings_company_status_period_idx" ON "filings" ("company_id","status","period_start");--> statement-breakpoint
CREATE INDEX "filings_agency_status_idx" ON "filings" ("agency_id","status");--> statement-breakpoint
CREATE INDEX "filings_obligation_id_idx" ON "filings" ("obligation_id");--> statement-breakpoint
CREATE INDEX "filings_prepared_by_idx" ON "filings" ("prepared_by_user_id");--> statement-breakpoint
CREATE INDEX "filings_reviewed_by_idx" ON "filings" ("reviewed_by_user_id");--> statement-breakpoint
CREATE INDEX "filings_document_id_idx" ON "filings" ("document_id");--> statement-breakpoint
CREATE INDEX "fee_charges_company_status_due_idx" ON "fee_charges" ("company_id","status","due_at");--> statement-breakpoint
CREATE INDEX "fee_charges_case_id_idx" ON "fee_charges" ("case_id");--> statement-breakpoint
CREATE INDEX "fee_charges_fee_id_idx" ON "fee_charges" ("fee_id");--> statement-breakpoint
CREATE INDEX "payments_charge_status_idx" ON "payments" ("charge_id","status");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_idx" ON "payments" ("provider_ref");--> statement-breakpoint
CREATE INDEX "payments_payer_user_id_idx" ON "payments" ("payer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_number_uidx" ON "receipts" ("number");--> statement-breakpoint
CREATE INDEX "receipts_payment_id_idx" ON "receipts" ("payment_id");--> statement-breakpoint
CREATE INDEX "receipts_document_id_idx" ON "receipts" ("document_id");--> statement-breakpoint
CREATE INDEX "ai_citations_proposal_id_idx" ON "ai_citations" ("proposal_id");--> statement-breakpoint
CREATE INDEX "ai_citations_message_id_idx" ON "ai_citations" ("message_id");--> statement-breakpoint
CREATE INDEX "ai_citations_rule_citation_id_idx" ON "ai_citations" ("rule_citation_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_user_updated_idx" ON "ai_conversations" ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ai_conversations_company_id_idx" ON "ai_conversations" ("company_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_case_id_idx" ON "ai_conversations" ("case_id");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_created_idx" ON "ai_messages" ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_proposals_conversation_created_idx" ON "ai_proposals" ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_proposals_subject_idx" ON "ai_proposals" ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "ai_proposals_status_idx" ON "ai_proposals" ("status");--> statement-breakpoint
CREATE INDEX "ai_proposals_message_id_idx" ON "ai_proposals" ("message_id");--> statement-breakpoint
CREATE INDEX "activity_events_company_created_idx" ON "activity_events" ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_entity_created_idx" ON "activity_events" ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_actor_created_idx" ON "activity_events" ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "notifications_company_id_idx" ON "notifications" ("company_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "company_access_grants" ADD CONSTRAINT "company_access_grants_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_access_grants" ADD CONSTRAINT "company_access_grants_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_access_grants" ADD CONSTRAINT "company_access_grants_granted_by_users_id_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "company_persons" ADD CONSTRAINT "company_persons_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_persons" ADD CONSTRAINT "company_persons_person_id_persons_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_persons" ADD CONSTRAINT "company_persons_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "company_registry_snapshots" ADD CONSTRAINT "company_registry_snapshots_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_registry_snapshots" ADD CONSTRAINT "company_registry_snapshots_kUwsWcnoozM4_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD CONSTRAINT "procedure_steps_template_id_procedure_templates_id_fkey" FOREIGN KEY ("template_id") REFERENCES "procedure_templates"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD CONSTRAINT "procedure_steps_qKbUShgrDMhU_fkey" FOREIGN KEY ("required_document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "procedure_templates" ADD CONSTRAINT "procedure_templates_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "procedure_templates" ADD CONSTRAINT "procedure_templates_obligation_id_obligations_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_procedure_template_id_procedure_templates_id_fkey" FOREIGN KEY ("procedure_template_id") REFERENCES "procedure_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_obligation_id_obligations_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "obligation_citations" ADD CONSTRAINT "obligation_citations_obligation_id_obligations_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "obligation_citations" ADD CONSTRAINT "obligation_citations_rule_citation_id_rule_citations_id_fkey" FOREIGN KEY ("rule_citation_id") REFERENCES "rule_citations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "obligation_citations" ADD CONSTRAINT "obligation_citations_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "procedure_step_citations" ADD CONSTRAINT "procedure_step_citations_step_id_procedure_steps_id_fkey" FOREIGN KEY ("step_id") REFERENCES "procedure_steps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "procedure_step_citations" ADD CONSTRAINT "procedure_step_citations_LG6sddLKgv4o_fkey" FOREIGN KEY ("rule_citation_id") REFERENCES "rule_citations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "procedure_step_citations" ADD CONSTRAINT "procedure_step_citations_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_step_id_case_steps_id_fkey" FOREIGN KEY ("step_id") REFERENCES "case_steps"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_4vc2AC7SYceJ_fkey" FOREIGN KEY ("source_document_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_extraction_field_id_extracted_fields_id_fkey" FOREIGN KEY ("extraction_field_id") REFERENCES "extracted_fields"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_ai_proposal_id_ai_proposals_id_fkey" FOREIGN KEY ("ai_proposal_id") REFERENCES "ai_proposals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_field_values" ADD CONSTRAINT "case_field_values_entered_by_user_id_users_id_fkey" FOREIGN KEY ("entered_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_template_step_id_procedure_steps_id_fkey" FOREIGN KEY ("template_step_id") REFERENCES "procedure_steps"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_assigned_to_user_id_users_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_template_id_procedure_templates_id_fkey" FOREIGN KEY ("template_id") REFERENCES "procedure_templates"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicant_person_id_persons_id_fkey" FOREIGN KEY ("applicant_person_id") REFERENCES "persons"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_user_id_users_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_user_id_users_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_l956MxCAb3fY_fkey" FOREIGN KEY ("supersedes_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_document_types_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_document_versions_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_extraction_id_extractions_id_fkey" FOREIGN KEY ("extraction_id") REFERENCES "extractions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_document_version_id_document_versions_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_9yLR8QCB5ntt_fkey" FOREIGN KEY ("source_document_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_extraction_field_id_extracted_fields_id_fkey" FOREIGN KEY ("extraction_field_id") REFERENCES "extracted_fields"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_ai_proposal_id_ai_proposals_id_fkey" FOREIGN KEY ("ai_proposal_id") REFERENCES "ai_proposals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_entered_by_user_id_users_id_fkey" FOREIGN KEY ("entered_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "finding_notes" ADD CONSTRAINT "finding_notes_finding_id_findings_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "finding_notes" ADD CONSTRAINT "finding_notes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_check_run_id_check_runs_id_fkey" FOREIGN KEY ("check_run_id") REFERENCES "check_runs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_resolved_by_user_id_users_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_officer_user_id_users_id_fkey" FOREIGN KEY ("officer_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "submission_documents" ADD CONSTRAINT "submission_documents_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submission_documents" ADD CONSTRAINT "submission_documents_PwQ47KbSOOFW_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submission_documents" ADD CONSTRAINT "submission_documents_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitted_by_user_id_users_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_source_document_version_id_document_versions_id_fkey" FOREIGN KEY ("source_document_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "filing_invoices" ADD CONSTRAINT "filing_invoices_filing_id_filings_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "filing_invoices" ADD CONSTRAINT "filing_invoices_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "filing_invoices" ADD CONSTRAINT "filing_invoices_added_by_users_id_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_agency_id_agencies_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_obligation_id_obligations_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_prepared_by_user_id_users_id_fkey" FOREIGN KEY ("prepared_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_reviewed_by_user_id_users_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_fee_id_fees_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "fees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_fee_charges_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "fee_charges"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_users_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_proposal_id_ai_proposals_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ai_proposals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_message_id_ai_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_rule_citation_id_rule_citations_id_fkey" FOREIGN KEY ("rule_citation_id") REFERENCES "rule_citations"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_conversation_id_ai_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_message_id_ai_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;