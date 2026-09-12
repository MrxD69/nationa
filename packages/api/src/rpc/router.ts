import type { RouterClient } from "@orpc/server";

import { actionsRouter } from "./procedures/actions";
import { activityRouter } from "./procedures/activity";
import { aiRouter } from "./procedures/ai";
import { casesRouter } from "./procedures/cases";
import { checksRouter } from "./procedures/checks";
import { companiesRouter } from "./procedures/companies";
import { docgenRouter } from "./procedures/docgen";
import { documentsRouter } from "./procedures/documents";
import { filingsRouter } from "./procedures/filings";
import { healthRouter } from "./procedures/health";
import { invoicesRouter } from "./procedures/invoices";
import { notificationsRouter } from "./procedures/notifications";
import { officerRouter } from "./procedures/officer";
import { onboardingRouter } from "./procedures/onboarding";
import { preferencesRouter } from "./procedures/preferences";
import { proceduresRouter } from "./procedures/procedures";
import { sessionRouter } from "./procedures/session";
import { submissionsRouter } from "./procedures/submissions";

export const router = {
  ...healthRouter,
  actions: actionsRouter,
  onboarding: onboardingRouter,
  companies: companiesRouter,
  cases: casesRouter,
  procedures: proceduresRouter,
  documents: documentsRouter,
  docgen: docgenRouter,
  checks: checksRouter,
  submissions: submissionsRouter,
  officer: officerRouter,
  activity: activityRouter,
  notifications: notificationsRouter,
  ai: aiRouter,
  invoices: invoicesRouter,
  filings: filingsRouter,
  session: sessionRouter,
  preferences: preferencesRouter,
};

export type AppRouter = typeof router;
export type AppRouterClient = RouterClient<typeof router>;
