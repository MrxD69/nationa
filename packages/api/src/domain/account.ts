import { z } from "zod";

export const ACCOUNT_TYPES = ["owner", "accountant", "officer", "admin"] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export type AccountType = z.infer<typeof accountTypeSchema>;

export function parseAccountType(value: unknown): AccountType | null {
  const parsed = accountTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function isProvisionedAccountType(value: string | null | undefined): boolean {
  return value === "officer" || value === "admin";
}
