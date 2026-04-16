/**
 * UserJobDetailPage — PHASE AD.
 *
 * User panel job detail sayfası. Aynı `JobDetailBody` component'ı
 * `basePath="/user"` ile render eder; breadcrumb + publish detay linki
 * user panel'e döner. Ownership filtresi zaten backend'de uygulanır
 * (PHASE X); user başka bir user'ın job'ına istek atarsa 403/404 alır
 * ve body "Job bulunamadi" gösterir.
 */

import { JobDetailBody } from "../../components/jobs/JobDetailBody";

export function UserJobDetailPage() {
  return <JobDetailBody basePath="/user" titleLabel="Is Detayı" testIdPrefix="user-job-detail" />;
}
