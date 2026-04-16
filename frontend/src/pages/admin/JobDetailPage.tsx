/**
 * JobDetailPage — Admin surface entry.
 *
 * PHASE AD: body `components/jobs/JobDetailBody`'ye taşındı. Bu dosya
 * yalnızca admin basePath'i ve surface override delegasyonunu yönetir.
 * User panel eşleniği için bkz. `pages/user/UserJobDetailPage.tsx`.
 */

import { JobDetailBody } from "../../components/jobs/JobDetailBody";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

export function JobDetailPage() {
  const Override = useSurfacePageOverride("admin.jobs.detail");
  if (Override) return <Override />;
  return <JobDetailBody basePath="/admin" titleLabel="Job Detayı" />;
}
