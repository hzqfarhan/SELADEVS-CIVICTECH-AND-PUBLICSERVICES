import { z } from "zod";
import { profileSchema, defaultProfile } from "./fares";
import { budgetSchema, type TransportBudget } from "./transport-budget";
export const PROFILE_KEY = "gerak:fare-profile:v1",
  BUDGET_KEY = "gerak:transport-budget:v1";
export const profileRecordSchema = z.object({
  schemaVersion: z.literal(1),
  profile: profileSchema,
});
export function restoreProfile(raw: string | null) {
  try {
    const value = profileRecordSchema.safeParse(JSON.parse(raw ?? "null"));
    return value.success ? value.data.profile : defaultProfile;
  } catch {
    return defaultProfile;
  }
}
export function restoreBudget(
  raw: string | null,
  month: string,
): TransportBudget {
  try {
    const value = budgetSchema.safeParse(JSON.parse(raw ?? "null"));
    if (value.success) return value.data;
  } catch {}
  return { schemaVersion: 1, month, monthlyLimitSen: 0, recurringTrips: [] };
}
