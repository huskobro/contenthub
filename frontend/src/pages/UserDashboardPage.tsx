import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { PostOnboardingHandoff } from "../components/dashboard/PostOnboardingHandoff";

export function UserDashboardPage() {
  const { data: onboardingStatus } = useOnboardingStatus();

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  return (
    <div>
      <h2>Dashboard</h2>
      {onboardingCompleted ? (
        <PostOnboardingHandoff />
      ) : (
        <p>Welcome to ContentHub. Create and manage your content from here.</p>
      )}
    </div>
  );
}
