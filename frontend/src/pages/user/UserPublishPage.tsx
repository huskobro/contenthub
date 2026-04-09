/**
 * UserPublishPage — Faz 11.
 *
 * Real user publish surface — project-first publish flow.
 * Steps:
 *   1. Select a ContentProject (only completed/ready ones)
 *   2. Select ChannelProfile + PlatformConnection
 *   3. Fill/edit publish metadata (title, description, tags, privacy)
 *   4. Create publish record → submit for review
 *   5. View publish status + result
 *
 * Replaces the old UserPublishEntryPage placeholder.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchContentProjects, type ContentProjectResponse } from "../../api/contentProjectsApi";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { fetchConnectionsForPublish, type ConnectionForPublish } from "../../api/platformConnectionsApi";
import { ConnectionCapabilityWarning, useCapabilityStatus } from "../../components/connections/ConnectionCapabilityWarning";
import {
  createPublishRecordFromJob,
  fetchPublishRecordsByProject,
  submitForReview,
  updatePublishIntent,
  type PublishRecordSummary,
  type PublishIntentData,
} from "../../api/publishApi";
import { AssistedComposer } from "../../components/engagement/AssistedComposer";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PUBLISH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Taslak", color: "bg-neutral-100 text-neutral-600" },
  pending_review: { label: "Onay Bekliyor", color: "bg-warning-50 text-warning-700" },
  approved: { label: "Onaylandi", color: "bg-success-50 text-success-700" },
  scheduled: { label: "Zamanlanmis", color: "bg-brand-50 text-brand-700" },
  publishing: { label: "Yayinlaniyor", color: "bg-brand-100 text-brand-800" },
  published: { label: "Yayinlandi", color: "bg-success-100 text-success-800" },
  failed: { label: "Basarisiz", color: "bg-error-50 text-error-700" },
  cancelled: { label: "Iptal", color: "bg-neutral-50 text-neutral-500" },
  review_rejected: { label: "Reddedildi", color: "bg-error-50 text-error-600" },
};

function StatusBadge({ status }: { status: string }) {
  const info = PUBLISH_STATUS_MAP[status] || { label: status, color: "bg-neutral-100 text-neutral-500" };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border border-transparent ${info.color}`}>
      {info.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserPublishPage() {
  const queryClient = useQueryClient();

  // Step state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");

  // Intent form
  const [intentTitle, setIntentTitle] = useState("");
  const [intentDescription, setIntentDescription] = useState("");
  const [intentTags, setIntentTags] = useState("");
  const [intentPrivacy, setIntentPrivacy] = useState("public");

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch user's projects (only those with an active_job_id = ready for publish)
  const { data: allProjects } = useQuery({
    queryKey: ["user-projects-for-publish"],
    queryFn: () => fetchContentProjects({ content_status: "completed" }),
    staleTime: 30_000,
  });

  // Also fetch projects that are in_production (may have completed jobs)
  const { data: productionProjects } = useQuery({
    queryKey: ["user-projects-production"],
    queryFn: () => fetchContentProjects({ content_status: "in_production" }),
    staleTime: 30_000,
  });

  const projects = useMemo(() => {
    const completed = allProjects || [];
    const production = (productionProjects || []).filter((p) => p.active_job_id);
    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: ContentProjectResponse[] = [];
    for (const p of [...completed, ...production]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [allProjects, productionProjects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  // Fetch channels for connection matching
  const { data: channels } = useQuery({
    queryKey: ["user-channels-for-publish"],
    queryFn: () => fetchChannelProfiles(),
    staleTime: 60_000,
  });

  // Fetch connections for the selected project's channel
  const channelProfileId = selectedProject?.channel_profile_id || "";
  const { data: connections } = useQuery({
    queryKey: ["connections-for-publish", channelProfileId],
    queryFn: () => fetchConnectionsForPublish(channelProfileId),
    enabled: !!channelProfileId,
    staleTime: 30_000,
  });

  const selectedConnection = useMemo(
    () => (connections || []).find((c) => c.id === selectedConnectionId) || null,
    [connections, selectedConnectionId],
  );

  // Fetch existing publish records for selected project
  const { data: existingRecords } = useQuery({
    queryKey: ["publish-records-by-project", selectedProjectId],
    queryFn: () => fetchPublishRecordsByProject(selectedProjectId),
    enabled: !!selectedProjectId,
    staleTime: 15_000,
  });

  // Channel name lookup
  const channelName = useMemo(() => {
    if (!channelProfileId || !channels) return null;
    return channels.find((ch: ChannelProfileResponse) => ch.id === channelProfileId)?.profile_name || null;
  }, [channelProfileId, channels]);

  // Pre-fill form when project is selected
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedConnectionId("");
    setShowForm(false);
    setSuccessMsg("");
    setErrorMsg("");
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setIntentTitle(proj.title || "");
      setIntentDescription(proj.description || "");
      setIntentTags("");
      setIntentPrivacy("public");
    }
  }, [projects]);

  // Create publish record mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject || !selectedProject.active_job_id) {
        throw new Error("Proje secilmedi veya aktif job yok.");
      }

      // Create publish record from job
      const record = await createPublishRecordFromJob(selectedProject.active_job_id, {
        platform: selectedConnection?.platform || selectedProject.primary_platform || "youtube",
        content_ref_type: selectedProject.module_type,
        content_ref_id: selectedProject.id,
        content_project_id: selectedProject.id,
        platform_connection_id: selectedConnectionId || undefined,
      });

      // Update intent if we have metadata
      const intent: PublishIntentData = {};
      if (intentTitle) intent.title = intentTitle;
      if (intentDescription) intent.description = intentDescription;
      if (intentTags) intent.tags = intentTags.split(",").map((t) => t.trim()).filter(Boolean);
      if (intentPrivacy) intent.privacy_status = intentPrivacy;

      if (Object.keys(intent).length > 0) {
        await updatePublishIntent(record.id, intent);
      }

      // Submit for review
      await submitForReview(record.id);

      return record;
    },
    onSuccess: () => {
      setSuccessMsg("Yayin kaydi olusturuldu ve onaya gonderildi!");
      setErrorMsg("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["publish-records-by-project", selectedProjectId] });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Yayin kaydi olusturulamadi.");
      setSuccessMsg("");
    },
  });

  const handleStartPublish = () => {
    setShowForm(true);
    setSuccessMsg("");
    setErrorMsg("");
  };

  return (
    <PageShell
      title="Yayin"
      subtitle="Projelerinizi secin, yayin bilgilerini doldurun ve onaya gonderin."
      testId="user-publish-page"
    >
      {/* Step 1: Project Selection */}
      <SectionShell title="1. Proje Secin" testId="publish-step-project">
        <select
          className="w-full max-w-md px-3 py-2 text-sm border border-border-default rounded-md bg-surface-page"
          value={selectedProjectId}
          onChange={(e) => handleProjectSelect(e.target.value)}
          data-testid="publish-project-selector"
        >
          <option value="">-- Proje secin --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.module_type}) — {p.content_status}
            </option>
          ))}
        </select>

        {projects.length === 0 && (
          <p className="text-xs text-neutral-400 mt-2">
            Yayin icin uygun proje bulunamadi. Once icerik uretin.
          </p>
        )}
      </SectionShell>

      {/* Project summary + existing records */}
      {selectedProject && (
        <>
          <SectionShell title="Proje Ozeti" testId="publish-project-summary">
            <MetricGrid>
              <MetricTile label="Baslik" value={selectedProject.title} testId="pub-title" />
              <MetricTile label="Modul" value={selectedProject.module_type} testId="pub-module" />
              <MetricTile label="Kanal" value={channelName || "-"} testId="pub-channel" />
              <MetricTile label="Durum" value={selectedProject.publish_status || "draft"} testId="pub-status" />
            </MetricGrid>
          </SectionShell>

          {/* Existing publish records for this project */}
          {existingRecords && existingRecords.length > 0 && (
            <SectionShell title="Mevcut Yayin Kayitlari" testId="publish-existing-records">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="existing-records-table">
                  <thead>
                    <tr className="border-b border-border-subtle text-left">
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Platform</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Durum</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Deneme</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Tarih</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRecords.map((rec: PublishRecordSummary) => (
                      <tr key={rec.id} className="border-b border-border-subtle">
                        <td className="py-2 px-3 text-neutral-700">{rec.platform}</td>
                        <td className="py-2 px-3"><StatusBadge status={rec.status} /></td>
                        <td className="py-2 px-3 text-neutral-500">{rec.publish_attempt_count}</td>
                        <td className="py-2 px-3 text-neutral-500">{rec.created_at?.slice(0, 16)}</td>
                        <td className="py-2 px-3">
                          {rec.platform_url ? (
                            <a href={rec.platform_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline text-xs">
                              Goruntule
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionShell>
          )}

          {/* Step 2: Connection Selection */}
          <SectionShell title="2. Platform Baglantisi Secin" testId="publish-step-connection">
            {connections && connections.length > 0 ? (
              <div className="flex flex-col gap-2 max-w-md">
                {connections.map((conn: ConnectionForPublish) => (
                  <label
                    key={conn.id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedConnectionId === conn.id
                        ? "border-brand-400 bg-brand-50"
                        : "border-border-default hover:border-brand-200"
                    } ${!conn.can_publish ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`connection-option-${conn.id}`}
                  >
                    <input
                      type="radio"
                      name="connection"
                      value={conn.id}
                      checked={selectedConnectionId === conn.id}
                      onChange={() => conn.can_publish && setSelectedConnectionId(conn.id)}
                      disabled={!conn.can_publish}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-800 truncate">
                          {conn.external_account_name || conn.platform}
                        </span>
                        <span className="text-xs text-neutral-400">{conn.platform}</span>
                        {conn.is_primary && (
                          <span className="text-xs bg-brand-100 text-brand-700 px-1 rounded">birincil</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${conn.can_publish ? "text-success-600" : "text-error-500"}`}>
                          {conn.can_publish ? "Yayin yapabilir" : "Baglanti yetersiz"}
                        </span>
                        <span className="text-xs text-neutral-400">({conn.connection_status})</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : channelProfileId ? (
              <p className="text-xs text-neutral-400">Bu kanal icin platform baglantisi bulunamadi.</p>
            ) : null}
            {/* Faz 17a: Capability warning for selected connection */}
            {selectedConnectionId && (
              <div className="mt-3">
                <ConnectionCapabilityWarning connectionId={selectedConnectionId} requiredCapability="can_publish" context="user" />
              </div>
            )}
          </SectionShell>

          {/* Step 3: Publish Metadata Form */}
          {!showForm && (
            <div className="mt-4">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                onClick={handleStartPublish}
                disabled={!selectedProjectId || !selectedProject.active_job_id}
                data-testid="publish-start-btn"
              >
                Yayin Bilgilerini Doldur
              </button>
              {!selectedProject.active_job_id && (
                <p className="text-xs text-warning-600 mt-1">
                  Bu projenin aktif bir isi yok. Once uretimi tamamlayin.
                </p>
              )}
            </div>
          )}

          {showForm && (
            <SectionShell title="3. Yayin Bilgileri" testId="publish-step-metadata">
              <div className="flex flex-col gap-4 max-w-lg">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Baslik</label>
                  <AssistedComposer
                    value={intentTitle}
                    onChange={setIntentTitle}
                    onSubmit={() => {}} // no-op — submit from main button
                    placeholder="Video basligi..."
                    submitLabel=""
                    maxLength={100}
                    contextLabel="Yayin Basligi"
                    testId="publish-title-composer"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Aciklama</label>
                  <AssistedComposer
                    value={intentDescription}
                    onChange={setIntentDescription}
                    onSubmit={() => {}}
                    placeholder="Video aciklamasi..."
                    submitLabel=""
                    maxLength={5000}
                    contextLabel="Yayin Aciklamasi"
                    testId="publish-desc-composer"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Etiketler (virgul ile ayirin)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-md bg-surface-page"
                    value={intentTags}
                    onChange={(e) => setIntentTags(e.target.value)}
                    placeholder="etiket1, etiket2, etiket3"
                    data-testid="publish-tags-input"
                  />
                </div>

                {/* Privacy */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Gizlilik</label>
                  <select
                    className="px-3 py-2 text-sm border border-border-default rounded-md bg-surface-page"
                    value={intentPrivacy}
                    onChange={(e) => setIntentPrivacy(e.target.value)}
                    data-testid="publish-privacy-select"
                  >
                    <option value="public">Herkese Acik</option>
                    <option value="unlisted">Listede Yok</option>
                    <option value="private">Gizli</option>
                  </select>
                </div>

                {/* Connection summary */}
                {selectedConnection && (
                  <div className="p-2 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-600">
                    <strong>Baglanti:</strong> {selectedConnection.external_account_name || selectedConnection.platform}
                    {" — "}{selectedConnection.can_publish ? "Yayin yapabilir" : "Baglanti yetersiz"}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !intentTitle.trim()}
                    data-testid="publish-submit-btn"
                  >
                    {createMutation.isPending ? "Gonderiliyor..." : "Olustur ve Onaya Gonder"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm rounded-md border border-border-default text-neutral-600 hover:bg-neutral-50"
                    onClick={() => setShowForm(false)}
                    data-testid="publish-cancel-btn"
                  >
                    Vazgec
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-xs text-error-base" data-testid="publish-error">{errorMsg}</p>
                )}
              </div>
            </SectionShell>
          )}

          {successMsg && (
            <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-md text-sm text-success-700" data-testid="publish-success">
              {successMsg}
            </div>
          )}
        </>
      )}

      {/* Workflow note */}
      <div className="mt-6 p-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500 max-w-2xl" data-testid="publish-workflow-note">
        <strong>Yayin Akisi:</strong> Proje Sec &rarr; Baglanti Sec &rarr; Bilgileri Doldur &rarr; Onaya Gonder &rarr; Operatör Onayi &rarr; Yayin.
        Platform API kisitlamalari nedeniyle bazi metrikler sinirli olabilir.
      </div>
    </PageShell>
  );
}
