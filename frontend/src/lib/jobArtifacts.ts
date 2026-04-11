/**
 * Shared helpers for discovering and serving job step artifacts.
 *
 * Multiple pages (JobDetail, CanvasProjectDetail, CanvasUserDashboard,
 * CanvasMyProjects, JobQuickLook) need to look at a job's step artifact
 * refs and find the final rendered video — these helpers keep that logic
 * in a single, tested place so the schema-assumption (singular
 * `output_path` / `exported_path` / `artifact_path` string keys with a
 * legacy plural `output_paths` array fallback) cannot drift between
 * surfaces again.
 */

export const VIDEO_ARTIFACT_EXTS = ["mp4", "webm", "mov"] as const;

export interface StepArtifactLike {
  artifact_refs_json?: string | null;
}

const isVideoPath = (p: unknown): p is string =>
  typeof p === "string" &&
  (VIDEO_ARTIFACT_EXTS as readonly string[]).includes(
    p.split(".").pop()?.toLowerCase() ?? "",
  );

/**
 * Walk a job's steps in reverse order (final render usually sits at the
 * tail) and return the first video artifact path found. Returns null when
 * no video artifact exists.
 *
 * Probe order, per step:
 *   1. Singular string keys: output_path, exported_path, artifact_path
 *   2. Legacy plural array: output_paths
 *   3. Any other string value on the object (catch-all)
 */
export function findFirstVideoArtifact(
  steps: ReadonlyArray<StepArtifactLike> | null | undefined,
): string | null {
  if (!steps) return null;
  for (const step of [...steps].reverse()) {
    if (!step.artifact_refs_json) continue;
    try {
      const parsed = JSON.parse(step.artifact_refs_json);
      if (!parsed || typeof parsed !== "object") continue;
      const obj = parsed as Record<string, unknown>;
      for (const key of ["output_path", "exported_path", "artifact_path"]) {
        const v = obj[key];
        if (isVideoPath(v)) return v;
      }
      const arr = obj.output_paths;
      if (Array.isArray(arr)) {
        for (const v of arr) if (isVideoPath(v)) return v;
      }
      for (const v of Object.values(obj)) {
        if (isVideoPath(v)) return v;
      }
    } catch {
      /* skip malformed json */
    }
  }
  return null;
}

/**
 * Build the backend URL that serves a job artifact by basename.
 * Returns null when either input is missing.
 */
export function buildJobArtifactUrl(
  jobId: string | null | undefined,
  artifactPath: string | null | undefined,
): string | null {
  if (!jobId || !artifactPath) return null;
  const basename = artifactPath.split("/").pop() ?? artifactPath;
  return `/api/v1/jobs/${jobId}/artifacts/${encodeURIComponent(basename)}`;
}

/**
 * Given a list of jobs, return a map of
 *   { [contentProjectId]: { jobId, videoUrl } }
 * pointing at the most recently finished job that produced a video
 * artifact for that project. Useful for dashboard tiles that need to
 * render a real preview per project without additional backend calls.
 */
export interface JobWithSteps extends StepArtifactLike {
  id: string;
  content_project_id?: string | null;
  created_at?: string;
  finished_at?: string | null;
  status?: string;
  steps?: ReadonlyArray<StepArtifactLike>;
}

export interface ProjectLike {
  id: string;
  active_job_id?: string | null;
}

export interface ProjectPreviewEntry {
  jobId: string;
  videoUrl: string;
  artifactPath: string;
}

/**
 * Build a project→preview map by joining two sources, in this priority:
 *
 *   1. Project.active_job_id → Job.id (authoritative — this is how
 *      CanvasProjectDetailPage resolves the current render, and it
 *      works even when the Job row has no content_project_id set).
 *   2. Job.content_project_id → Project.id (fallback — works when
 *      jobs are actually back-linked to projects).
 *
 * In practice path (1) is the one that fires today because the job
 * engine doesn't always populate Job.content_project_id when it kicks
 * off a render from the wizard. Keeping the fallback means any future
 * backend change that starts populating content_project_id will
 * automatically upgrade the preview experience.
 */
export function buildProjectPreviewMap(
  jobs: ReadonlyArray<JobWithSteps> | null | undefined,
  projects?: ReadonlyArray<ProjectLike> | null,
): Map<string, ProjectPreviewEntry> {
  const map = new Map<string, ProjectPreviewEntry>();
  if (!jobs || jobs.length === 0) return map;

  // Index jobs by id for fast active_job_id lookup.
  const jobsById = new Map<string, JobWithSteps>();
  for (const j of jobs) jobsById.set(j.id, j);

  const tryRecord = (projectId: string, job: JobWithSteps | undefined) => {
    if (!job || map.has(projectId)) return;
    const artifactPath = findFirstVideoArtifact(job.steps);
    if (!artifactPath) return;
    const videoUrl = buildJobArtifactUrl(job.id, artifactPath);
    if (!videoUrl) return;
    map.set(projectId, { jobId: job.id, videoUrl, artifactPath });
  };

  // Path 1: project.active_job_id — authoritative.
  if (projects) {
    for (const p of projects) {
      if (!p.active_job_id) continue;
      tryRecord(p.id, jobsById.get(p.active_job_id));
    }
  }

  // Path 2: job.content_project_id — fallback for future back-links.
  const sorted = [...jobs].sort((a, b) => {
    const ta = Date.parse(a.finished_at ?? a.created_at ?? "") || 0;
    const tb = Date.parse(b.finished_at ?? b.created_at ?? "") || 0;
    return tb - ta;
  });
  for (const job of sorted) {
    if (!job.content_project_id) continue;
    if (map.has(job.content_project_id)) continue;
    tryRecord(job.content_project_id, job);
  }

  return map;
}
