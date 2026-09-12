import { isProvisionedAccountType, type AccountType } from "../../domain/account";
import { deriveOnboardingStatus, type OnboardingStatus } from "../../domain/onboarding";
import type { Context } from "../context";
import * as sessionRepo from "../repositories/session.repo";
import { userHasActiveCompany } from "./companies.service";
import { ensureProfile } from "./profiles.service";

export type SessionAgency = {
  agencyId: string;
  role: string;
  nameFr: string;
  nameAr: string | null;
};

export type SessionLanding =
  | "/officer"
  | "/onboarding"
  | "/companies?view=accounting"
  | "/companies";

export type SessionInfo = {
  accountType: AccountType;
  onboardingStatus: OnboardingStatus;
  hasCompany: boolean;
  agencies: SessionAgency[];
  landing: SessionLanding;
};

export async function getSession(context: Context): Promise<SessionInfo> {
  const profile = await ensureProfile(context);
  const { accountType } = profile;
  const onboardingStatus = deriveOnboardingStatus(profile);

  const [hasCompany, agencies] = await Promise.all([
    userHasActiveCompany(context, { userId: profile.userId }),
    sessionRepo.listUserAgencies(context.db, profile.userId),
  ]);

  const landing: SessionLanding =
    isProvisionedAccountType(accountType) && agencies.length > 0
      ? "/officer"
      : accountType === "accountant"
        ? onboardingStatus !== "completed"
          ? "/onboarding"
          : "/companies?view=accounting"
        : onboardingStatus !== "completed"
          ? "/onboarding"
          : "/companies";

  return { accountType, onboardingStatus, hasCompany, agencies, landing };
}
