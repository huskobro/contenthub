/**
 * UserDigestDashboard — Redesign REV-2 / P1.4.
 *
 * User panel anasayfasının en üstüne konan "Bugün" özet şeridi. Kullanıcı
 * için kişiselleştirilmiş 4 KPI tile: "sana özel dikkat gerektiren sayılar".
 *
 * 4 KPI tile:
 *   1) Onayımı Bekleyen  → /user/publish (review_state pending_review)
 *   2) Bu Hafta Yayın    → /user/publish (bu haftanın scheduled/published)
 *   3) Başarısız İş      → /user/inbox   (failures land in inbox; /user/jobs has no list route, only :id)
 *   4) Gelen Kutusu      → /user/inbox   (pending status)
 *
 * Veri stratejisi (MEMORY §5.2 kararı — yeni backend endpoint açmıyoruz):
 *   - 3 paralel `useQuery` (jobs, publish, inbox) + client-side filtre.
 *   - Her query scope-aware: `useActiveScope()` → user rolünde daima
 *     `ownerUserId = self`, backend zaten kendi scope'unu zorlar.
 *
 * Role guard:
 *   - Admin rolünde render olmaz (panel user bakışı için).
 *   - Unauthenticated / hazır olmayan auth: null.
 *
 * CLAUDE.md uyumu:
 *   - Hidden behavior yok: tüm sayılar tile'larda testid'lerle görünür.
 *   - Backend authority: user rolünde backend `ctx.user_id` ile scope uygular;
 *     frontend sadece görsel katman.
 *   - Parallel pattern yok: AdminDigestDashboard'ın user karşılığı, aynı
 *     görsel dil (4-tile grid).
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

function isWithinLastDays(iso: string | null | undefined, days: number, ref: Date): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  const cutoff = ref.getTime() - days * 24 * 60 * 60 * 1000;
  return then >= cutoff && then <= ref.getTime();
}

function isWithinThisWeek(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  // ISO haftası — pazartesi başlangıç. Local day-of-week hesap:
  // 0=Pzr, 1=Pzt, ..., 6=Cmt → pazartesi başlangıcına kaydır
  const day = ref.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return d >= monday && d <= sunday;
}

function countPendingMyReview(records: PublishRecordSummary[]): number {
  return records.filter((r) => r.review_state === "pending_review").length;
}

function countPublishThisWeek(records: PublishRecordSummary[], ref: Date): number {
  return records.filter(
    (r) =>
      (r.status === "scheduled" || r.status === "completed" || r.status === "queued") &&
      (isWithinThisWeek(r.scheduled_at, ref) || isWithinThisWeek(r.published_at, ref)),
  ).length;
}

function countFailedRecent(jobs: JobResponse[], ref: Date): number {
  return jobs.filter(
    (j) =>
      j.status === "failed" &&
      isWithinLastDays(j.finished_at ?? j.updated_at, 7, ref),
  ).length;
}

function countInboxPending(items: InboxItemResponse[]): number {
  return items.filter((i) => i.status === "pending").length;
}

// ---------------------------------------------------------------------------
// ClickableTile — MetricTile'ı keyboard-accessible CTA'ya sarar
// (AdminDigestDashboard içindeki eşleniğin küçük bir kopyası; iki bileşen
// ayrı ilgi alanları, abstraction 12 satıra değmez — CLAUDE.md "parallel
// pattern" kuralına ters değil, çünkü pattern "digest tile CTA"; iki
// dashboard'da da aynı. Gerekirse P3.1 duplicate cleanup'ta ortak primitive
// olarak extract edilebilir.)
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

interface UserDigestDashboardProps {
  className?: string;
}

export function UserDigestDashboard({ className }: UserDigestDashboardProps) {
  const navigate = useNavigate();
  const scope = useActiveScope();

  // Yalnız user rolü için. Admin rolü (panel user bakışı değil) veya hazır
  // olmayan auth'da render etme. Not: admin wrapper'ı user shell'ini izlerken
  // bu bileşen hâlâ render olmaz — bilinçli: user bakışı için UserIdentityStrip
  // zaten kimlik sinyalini veriyor, ama digest sayıları user'ın kendi rolü
  // ile anlamlı.
  const isEndUser = scope.isReady && scope.role === "user";

  const today = useMemo(() => new Date(), []);

  const jobsQuery = useQuery({
    queryKey: [
      "user-digest",
      "jobs",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchJobs(),
    enabled: isEndUser,
    staleTime: 30_000,
  });

  const publishQuery = useQuery({
    queryKey: [
      "user-digest",
      "publish",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchPublishRecords({ limit: 200 }),
    enabled: isEndUser,
    staleTime: 30_000,
  });

  const inboxQuery = useQuery({
    queryKey: [
      "user-digest",
      "inbox",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
    queryFn: () => fetchInboxItems({ status: "pending", limit: 200 }),
    enabled: isEndUser,
    staleTime: 30_000,
  });

  if (!isEndUser) return null;

  const isLoading = jobsQuery.isLoading || publishQuery.isLoading || inboxQuery.isLoading;
  const isError = jobsQuery.isError || publishQuery.isError || inboxQuery.isError;

  const jobs = jobsQuery.data ?? [];
  const publishRecords = publishQuery.data ?? [];
  const inboxItems = inboxQuery.data ?? [];

  const pendingMyReview = countPendingMyReview(publishRecords);
  const publishThisWeek = countPublishThisWeek(publishRecords, today);
  const failedRecent = countFailedRecent(jobs, today);
  const inboxPending = countInboxPending(inboxItems);

  return (
    <SectionShell
      title="Bugün"
      description="Sana özel dikkat gerektiren sayılar"
      testId="user-digest-dashboard"
    >
      <div
        className={cn("relative", className)}
        data-testid="user-digest-dashboard-body"
      >
        {isError && (
          <div
            className="mb-3 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
            data-testid="user-digest-error"
          >
            Özet verisi alınamadı. Birkaç saniye sonra tekrar deneyin.
          </div>
        )}

        {isLoading ? (
          <SkeletonMetricGrid count={4} />
        ) : (
          <MetricGrid>
            <ClickableTile
              label="Onayımı Bekleyen"
              value={pendingMyReview}
              note="Yayın akışında inceleme"
              testId="user-digest-pending-review"
              accentColor="var(--ch-warning-base, #e67700)"
              onClick={() => navigate("/user/publish")}
            />
            <ClickableTile
              label="Bu Hafta Yayın"
              value={publishThisWeek}
              note="Zamanlanan / yayımlanan"
              testId="user-digest-this-week"
              accentColor="var(--ch-brand-500, #4c6ef5)"
              onClick={() => navigate("/user/publish")}
            />
            <ClickableTile
              label="Başarısız İş"
              value={failedRecent}
              note="Son 7 gün"
              testId="user-digest-failed-jobs"
              accentColor="var(--ch-error, #e03131)"
              onClick={() => navigate("/user/inbox")}
            />
            <ClickableTile
              label="Gelen Kutusu"
              value={inboxPending}
              note="Bekleyen bildirim"
              testId="user-digest-inbox"
              accentColor="var(--ch-info-base, #1971c2)"
              onClick={() => navigate("/user/inbox")}
            />
          </MetricGrid>
        )}
      </div>
    </SectionShell>
  );
}
