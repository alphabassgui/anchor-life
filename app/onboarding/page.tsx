import { redirect } from "next/navigation";
import { ONBOARDING_ROUTES } from "@/lib/constants/onboardingRoutes";

/**
 * The onboarding root isn't a screen of its own — it redirects to the first
 * named step (account) so the flow has one canonical entry point.
 */
export default function OnboardingIndex() {
  redirect(ONBOARDING_ROUTES.account);
}
