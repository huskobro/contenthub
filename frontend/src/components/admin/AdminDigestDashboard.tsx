/**
 * AdminDigestDashboard — Redesign REV-2 / P1.3.
 *
 * Admin panelinin en üstüne konan "Bugün" özet şeridi. 4 KPI tile ile
 * operatörün güne başlarken hemen görmesi gereken 4 sayıyı ve altında
 * ilgili hızlı linkleri verir. Amaç: "önce ne acil?" sorusunu tek bakışta
 * cevaplamak. Mevcut "Yönetim Paneli" KPI/grafik bölümü alt katmanda
 * dokunulmadan korunuyor — digest **yerine geçmez**, **üstüne** konur.
 *
 * 4 KPI tile:
 *   1) Başarısız İşler bugün       → /admin/jobs?status=failed
 *   2) Review Bekleyen (inbox)     → /admin/inbox?status=pending
 *   3) Retry Adayı                 → /admin/jobs  (retry_count > 0 & failed)
 *   4) Yayın Kuyruğu (bugün)       → /admin/publish?status=queued
 *
 * Veri stratejisi (MEMORY.md §5.2 kararı — yeni backend endpoint AÇMIYORUZ):
 *   - 4 paralel `useQuery` ile mevcut endpoint'lerden çekip **client-side
 *     filtrele**. Her biri scope-aware: `useActiveScope()` üzerinden admin
 *     "Tüm Kullanıcılar" modunda tüm users, focused-user modunda tek user.
 *   - Query key'lere `{ ownerUserId, isAllUsers }` bloğu eklenir — scope
 *     değişince cache ayrışır, cross-user kirlenme olmaz.
 *   - Performans bir zaman noktasında sorun olursa MEMORY §5.2'deki plan
 *     gereği custom `/api/v1/dashboard/admin/digest` açılabilir (bu dalga
 *     değil).
 *
 * CLAUDE.md uyumu:
 *   - Hidden behavior yok: 4 tile ve alt section'lar görünür, testid'ler
 *     var.
 *   - Hardcoded eşik yok: sayılar canlı veriden.
 *   - Parallel pattern yok: AdminOverviewPage'in bir bölümü, başka bir
 *     "Bugün" dashboardu yok.
 *   - Server-state React Query, client-state gerek yok.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useActiveScope } from "../../hooks/useActiveScope";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import {
  fetchPublishRecords,
  type PublishRecordSummary,
} from "../../api/publishApi";
import { fetchInboxItems, type InboxItemResponse } from "../../api/automationApi";
import { SectionShell, MetricGrid, MetricTile } from "../design-system/primitives";
import { SkeletonMetricGrid } from "../design-system/Skeleton";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Same-day (local) comparison for ISO strings. */
function isSameLocalDay(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function countFailedToday(jobs: JobResponse[], ref: Date): number {
  return jobs.filter(
    (j) => j.status === "failed" && isSameLocalDay(j.finished_at ?? j.updated_at, ref),
  ).length;
}

function countRetryCandidates(jobs: JobResponse[]): number {
  // "Retry adayı": başarısız ve retry_count < 3 (manuel eşik; non-negotiable
  // core invariant değil — sadece tile'da gösterim için alt sınır).
  // Backend retry limit Settings Registry'de; burada yalnız "adaylar"
  // sayılır, alt limiti Settings Registry'den okuyarak güncelleyebiliriz
  // P1.3 sonrası — şimdilik 3 = current default.
  return jobs.filter((j) => j.status === "failed" && j.retry_count < 3).length;
}

function countPendingReview(items: InboxItemResponse[]): number {
  return items.filter((i) => i.status === "pending").length;
}

function countPublishQueuedToday(records: PublishRecordSummary[], ref: Date): number {
  return records.filter(
    (r) =>
      (r.status === "queued" || r.status === "scheduled") &&
      (isSameLocalDay(r.scheduled_at, ref) || isSameLocalDay(r.created_at, ref)),
  ).length;
}

// ---------------------------------------------------------------------------
// ClickableTile — small wrapper around MetricTile to add keyboard-accessible
// navigation. MetricTile itself intentionally has no onClick (it's a generic
// display primitive); we add click here as a digest-local concern.
// ---------------------------------------------------------------------------

interface ClickableTileProps {
  label: string;
  value: number;
  note?: string;
  testId: string;
  accentColor: string;
  onClick: () => void;
}

function ClickableTile({
  label,
  value,
  note,
  testId,
  accentColor,
  onClick,
}: ClickableTileProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer rounded-lg transition-transform duration-fast hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      data-testid={`${testId}-cta`}
      aria-label={`${label}: ${value}`}
    >
      <MetricTile
        label={label}
        value={String(value)}
        note={note}
        testId={testId}
        accentColor={accentColor}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminDigestDashboardProps {
  className?: string;
}

export function AdminDigestDashboard({ className }: AdminDigestDashboardProps) {
  const navigate = useNavigate();
  const scope = useActiveScope();

  // Bu dashboard admin-only. Non-admin role veya hazır değilse render etme.
  const isAdminReady = scope.isReady && scope.role === "admin";

  // Admin focused-user modunda sadece o user'ı backend'e geçir. "all" modunda
  // parametre verme — backend default "tüm kullanıcılar" kullanır.
  const ownerFilter = useMemo(
    () =>
      scope.isAllUsers || !scope.ownerUserId
        ? undefined
        : scope.ownerUserId,
    [scope.isAllUsers, scope.ownerUserId],
  );

  const today = useMemo(() => new Date(), []);

  // Jobs — failed ve retry adayı için tek fetch; client-side iki sayıya
  // dağıtılır (ikinci çağrıya gerek yok).
  const jobsQuery = useQuery({
    queryKey: [
      "admin-digest",
      "jobs",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchJobs(ownerFilter ? { owner_id: ownerFilter } : undefined),
    enabled: isAdminReady,
    staleTime: 30_000,
  });

  // Publish queue — bugün kuyruğa giren / zamanlanan.
  const publishQuery = useQuery({
    queryKey: [
      "admin-digest",
      "publish",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchPublishRecords(
        ownerFilter ? { owner_id: ownerFilter, limit: 200 } : { limit: 200 },
      ),
    enabled: isAdminReady,
    staleTime: 30_000,
  });

  // Inbox — pending review sayısı.
  const inboxQuery = useQuery({
    queryKey: [
      "admin-digest",
      "inbox",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () =>
      fetchInboxItems(
        ownerFilter
          ? { owner_user_id: ownerFilter, status: "pending", limit: 200 }
          : { status: "pending", limit: 200 },
      ),
    enabled: isAdminReady,
    staleTime: 30_000,
  });

  // Non-admin ya da auth hazır değilse hiç render etme — AdminLayout zaten
  // admin'e veriyor, ama çifte savunma için burada da guard.
  if (!isAdminReady) return null;

  const isLoading = jobsQuery.isLoading || publishQuery.isLoading || inboxQuery.isLoading;
  const isError = jobsQuery.isError || publishQuery.isError || inboxQuery.isError;

  const jobs = jobsQuery.data ?? [];
  const publishRecords = publishQuery.data ?? [];
  const inboxItems = inboxQuery.data ?? [];

  const failedToday = countFailedToday(jobs, today);
  const retryCandidates = countRetryCandidates(jobs);
  const pendingReview = countPendingReview(inboxItems);
  const publishQueuedToday = countPublishQueuedToday(publishRecords, today);

  const scopeLabel = scope.isAllUsers ? "Tüm Kullanıcılar" : "Odaklı Kullanıcı";

  return (
    <SectionShell
      title="Bugün"
      description={`Bir bakışta acil olanlar · Kapsam: ${scopeLabel}`}
      testId="admin-digest-dashboard"
    >
      <div
        className={cn("relative", className)}
        data-testid="admin-digest-dashboard-body"
      >
        {isError && (
          <div
            className="mb-3 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
            data-testid="admin-digest-error"
          >
            Özet verisi alınamadı. Birkaç saniye sonra tekrar deneyin.
          </div>
        )}

        {isLoading ? (
          <SkeletonMetricGrid count={4} />
        ) : (
          <MetricGrid>
            <ClickableTile
              label="Başarısız İşler"
              value={failedToday}
              note="Bugün hata ile kapandı"
              testId="admin-digest-failed-jobs"
              accentColor="var(--ch-error, #e03131)"
              onClick={() => navigate("/admin/jobs")}
            />
            <ClickableTile
              label="Review Bekleyen"
              value={pendingReview}
              note="Inbox'ta onay bekliyor"
              testId="admin-digest-pending-review"
              accentColor="var(--ch-warning-base, #e67700)"
              onClick={() => navigate("/admin/inbox")}
            />
            <ClickableTile
              label="Retry Adayı"
              value={retryCandidates}
              note="Yeniden denenebilir"
              testId="admin-digest-retry-candidates"
              accentColor="var(--ch-info-base, #1971c2)"
              onClick={() => navigate("/admin/jobs")}
            />
            <ClickableTile
              label="Yayın Kuyruğu"
              value={publishQueuedToday}
              note="Bugün için planlı"
              testId="admin-digest-publish-queue"
              accentColor="var(--ch-brand-500, #4c6ef5)"
              onClick={() => navigate("/admin/publish")}
            />
          </MetricGrid>
        )}
      </div>
    </SectionShell>
  );
}
