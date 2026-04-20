/**
 * UserNewsPickerPage — Gate Sources Closure §S7
 *
 * Ayri user surface: haber secimi + temel bulten meta'si + uretime gonder.
 * Onceden "/user/create/bulletin" wizard'i son adimda kullaniciyi
 * "/admin/news-bulletins/wizard" yoluna yonlendiriyordu — bu yanlisti.
 * Kullanicilar artik admin panelde islem yapmadan kendi surface'larinda
 * haber secip uretime baslatabilirler.
 *
 * Flow:
 *   1. URL query: bulletinId (yeni olusturulmussa) veya yoksa yeni bulten
 *      olusturulur (topic + language).
 *   2. Selectable news grid — kaynak, kategori, dil filtreleri.
 *   3. Selection list (checkbox + sayfa altinda "Seciminin Ozeti").
 *   4. Trust check — backend low/medium/high kirilimini gosterir.
 *   5. Start production — job_id donerse /user/projects/:projectId'e
 *      yonlendir ya da job detail'e.
 *
 * Kullanici view yalin tutuldu: editorial gate, clone, advanced rewrite
 * fonksiyonlari admin surface'ta kalir. User surface'ta sadece secim +
 * uretim.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createNewsBulletin,
  createNewsBulletinSelectedItem,
  deleteNewsBulletinSelectedItem,
  fetchNewsBulletinById,
  fetchNewsBulletinSelectedItems,
  fetchSelectableNewsItems,
  fetchTrustCheck,
  startBulletinProduction,
  type NewsBulletinResponse,
  type SelectableNewsItemResponse,
  type TrustCheckResponse,
} from "../../api/newsBulletinApi";
import { useSurfacePageOverride } from "../../surfaces";

const MAX_SELECT = 12;

export function UserNewsPickerPage() {
  const Override = useSurfacePageOverride("user.news.picker");
  if (Override) return <Override />;
  return <LegacyUserNewsPickerPage />;
}

function LegacyUserNewsPickerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialBulletinId = params.get("bulletinId");
  const channelProfileId = params.get("channelProfileId");
  const contentProjectId = params.get("contentProjectId");

  const [bulletinId, setBulletinId] = useState<string | null>(initialBulletinId);
  const [topic, setTopic] = useState<string>("");
  const [language, setLanguage] = useState<string>("tr");
  const [filterSourceId, setFilterSourceId] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // If we arrived without a bulletin, show topic-first gate.
  const needsBulletin = !bulletinId;

  // --- Create bulletin (first step) -----------------------------------------
  const createMutation = useMutation({
    mutationFn: () =>
      createNewsBulletin({
        topic: topic.trim() || "Haber Bulteni",
        language,
        source_mode: "manual",
      }),
    onSuccess: (bulletin: NewsBulletinResponse) => {
      setBulletinId(bulletin.id);
      const next = new URLSearchParams(params);
      next.set("bulletinId", bulletin.id);
      setParams(next, { replace: true });
    },
  });

  // --- Existing bulletin hydration ------------------------------------------
  const bulletinQuery = useQuery({
    queryKey: ["user-news-picker", "bulletin", bulletinId],
    queryFn: () => fetchNewsBulletinById(bulletinId as string),
    enabled: !!bulletinId,
  });

  // --- Selectable news ------------------------------------------------------
  const selectableQuery = useQuery({
    queryKey: [
      "user-news-picker",
      "selectable",
      bulletinId,
      filterSourceId,
      filterCategory,
    ],
    queryFn: () =>
      fetchSelectableNewsItems(bulletinId as string, {
        source_id: filterSourceId || undefined,
        category: filterCategory || undefined,
        limit: 80,
      }),
    enabled: !!bulletinId,
    refetchOnWindowFocus: false,
  });

  // --- Current selection ----------------------------------------------------
  const selectedQuery = useQuery({
    queryKey: ["user-news-picker", "selected", bulletinId],
    queryFn: () => fetchNewsBulletinSelectedItems(bulletinId as string),
    enabled: !!bulletinId,
  });

  const selectedIds = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    (selectedQuery.data || []).forEach((row) => {
      s.add(row.news_item_id);
    });
    return s;
  }, [selectedQuery.data]);

  const selectionIdByNews = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (selectedQuery.data || []).forEach((row) => {
      map[row.news_item_id] = row.id;
    });
    return map;
  }, [selectedQuery.data]);

  // --- Add / remove selection ----------------------------------------------
  const addMutation = useMutation({
    mutationFn: (newsItemId: string) =>
      createNewsBulletinSelectedItem(bulletinId as string, {
        news_item_id: newsItemId,
      }),
    onSuccess: () => {
      selectedQuery.refetch();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (newsItemId: string) => {
      const sel = selectionIdByNews[newsItemId];
      if (!sel) return Promise.resolve();
      return deleteNewsBulletinSelectedItem(bulletinId as string, sel);
    },
    onSuccess: () => {
      selectedQuery.refetch();
    },
  });

  const handleToggle = useCallback(
    (newsItemId: string) => {
      if (!bulletinId) return;
      if (selectedIds.has(newsItemId)) {
        removeMutation.mutate(newsItemId);
      } else {
        if (selectedIds.size >= MAX_SELECT) return;
        addMutation.mutate(newsItemId);
      }
    },
    [bulletinId, selectedIds, addMutation, removeMutation],
  );

  // --- Trust check ----------------------------------------------------------
  const trustQuery = useQuery({
    queryKey: ["user-news-picker", "trust", bulletinId, selectedIds.size],
    queryFn: () => fetchTrustCheck(bulletinId as string),
    enabled: !!bulletinId && selectedIds.size > 0,
  });

  // --- Start production -----------------------------------------------------
  // PHASE AE: when no content project is bound, land the user on the job
  // detail page (not the projects list — the previous `?jobId=` query param
  // was never consumed). With a project, prefer the project hub.
  const startMutation = useMutation({
    mutationFn: () => startBulletinProduction(bulletinId as string),
    onSuccess: (resp) => {
      if (contentProjectId) {
        navigate(`/user/projects/${contentProjectId}`);
        return;
      }
      if (resp.job_id) {
        navigate(`/user/jobs/${resp.job_id}`);
      }
    },
  });

  useEffect(() => {
    if (!initialBulletinId && !needsBulletin) return;
    // no-op — keep state driven by URL
  }, [initialBulletinId, needsBulletin]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-[1280px] mx-auto p-6 space-y-6" data-testid="user-news-picker">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-xl font-semibold text-neutral-800">
            Haber Secimi
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Bultenine dahil edilecek haberleri sec. Admin paneline gecmeye gerek yok.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          Geri
        </button>
      </header>

      {/* --- Bulletin creation gate --- */}
      {needsBulletin && (
        <section
          className="bg-white border border-border-subtle rounded-md p-5 space-y-4"
          data-testid="user-news-picker-create-bulletin"
        >
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Bulten Konusu
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ornek: Gunun teknoloji haberleri"
              className="w-full border border-border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Dil
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-border-subtle rounded-md px-3 py-2 text-sm"
            >
              <option value="tr">Turkce</option>
              <option value="en">English</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="bg-neutral-800 text-white rounded-md px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Olusturuluyor..." : "Bulteni Olustur ve Haber Sec"}
          </button>
          {createMutation.isError && (
            <p className="text-xs text-red-600 m-0">
              Bulten olusturulamadi: {(createMutation.error as Error)?.message || "bilinmeyen hata"}
            </p>
          )}
        </section>
      )}

      {/* --- Filters --- */}
      {!needsBulletin && (
        <section className="bg-white border border-border-subtle rounded-md p-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Kaynak (source_id)
            </label>
            <input
              type="text"
              value={filterSourceId}
              onChange={(e) => setFilterSourceId(e.target.value)}
              placeholder="Bos birak = tum kaynaklar"
              className="border border-border-subtle rounded-md px-2 py-1 text-sm w-[220px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Kategori
            </label>
            <input
              type="text"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              placeholder="Ornek: tech, finance"
              className="border border-border-subtle rounded-md px-2 py-1 text-sm w-[160px]"
            />
          </div>
          <div className="ml-auto text-xs text-neutral-500">
            Secim: <strong>{selectedIds.size}</strong> / {MAX_SELECT}
          </div>
        </section>
      )}

      {/* --- Selectable grid --- */}
      {!needsBulletin && (
        <section data-testid="user-news-picker-selectable">
          {selectableQuery.isLoading && (
            <div className="text-sm text-neutral-500">Yukleniyor...</div>
          )}
          {selectableQuery.isError && (
            <div className="text-sm text-red-600">
              Haber listesi alinamadi: {(selectableQuery.error as Error)?.message}
            </div>
          )}
          {selectableQuery.data && selectableQuery.data.length === 0 && (
            <div className="text-sm text-neutral-500">
              Secilebilir haber yok. Kaynaklari tarayip burada goruntulemek icin
              admin panele source-scan'lar tetiklenmeli.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(selectableQuery.data || []).map((item: SelectableNewsItemResponse) => {
              const isSelected = selectedIds.has(item.id);
              const disabled =
                !isSelected && selectedIds.size >= MAX_SELECT;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  disabled={disabled}
                  className={
                    "text-left border rounded-md p-3 hover:border-neutral-400 transition " +
                    (isSelected
                      ? "border-neutral-800 bg-neutral-50 "
                      : "border-border-subtle bg-white ") +
                    (disabled ? "opacity-40 cursor-not-allowed" : "")
                  }
                  data-testid="user-news-picker-card"
                  data-selected={isSelected}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                      {item.source_name || "bilinmeyen kaynak"}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-green-700 font-semibold">
                        SECILDI
                      </span>
                    )}
                  </div>
                  <h3 className="m-0 text-sm font-medium text-neutral-800 line-clamp-2">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="m-0 mt-1 text-xs text-neutral-500 line-clamp-3">
                      {item.summary}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* --- Trust panel --- */}
      {!needsBulletin && selectedIds.size > 0 && (
        <TrustPanel query={trustQuery} />
      )}

      {/* --- Production action --- */}
      {!needsBulletin && (
        <footer className="sticky bottom-0 bg-white border-t border-border-subtle py-4 flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            {selectedIds.size === 0
              ? "Uretime baslamak icin en az bir haber sec."
              : `${selectedIds.size} haber secildi. Hazir misin?`}
          </div>
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={
              selectedIds.size === 0 ||
              startMutation.isPending ||
              (trustQuery.data ? !trustQuery.data.pass_check : false)
            }
            className="bg-neutral-800 text-white rounded-md px-4 py-2 text-sm hover:bg-neutral-700 disabled:opacity-40"
            data-testid="user-news-picker-start-production"
          >
            {startMutation.isPending ? "Gonderiliyor..." : "Uretime Basla"}
          </button>
        </footer>
      )}

      {bulletinQuery.data && (
        <details className="text-xs text-neutral-400">
          <summary>Debug: bulten durumu</summary>
          <pre className="mt-2 text-[10px] overflow-auto">
            {JSON.stringify(
              {
                id: bulletinQuery.data.id,
                status: bulletinQuery.data.status,
                selected_news_count: bulletinQuery.data.selected_news_count,
                channelProfileId,
                contentProjectId,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust panel sub-component
// ---------------------------------------------------------------------------

interface TrustPanelProps {
  query: { data?: TrustCheckResponse; isLoading: boolean; isError: boolean };
}

function TrustPanel({ query }: TrustPanelProps) {
  if (query.isLoading) {
    return (
      <section className="bg-white border border-border-subtle rounded-md p-3 text-xs text-neutral-500">
        Kaynak guvenilirligi kontrol ediliyor...
      </section>
    );
  }
  if (query.isError || !query.data) {
    return null;
  }
  const d = query.data;
  const breakdown = d.trust_breakdown || {};
  const hasLow = (breakdown.low || 0) > 0;
  const hasMedium = (breakdown.medium || 0) > 0;

  let toneClass = "border-border-subtle bg-white text-neutral-700";
  if (!d.pass_check) {
    toneClass = "border-red-300 bg-red-50 text-red-800";
  } else if (hasLow || hasMedium) {
    toneClass = "border-amber-300 bg-amber-50 text-amber-900";
  } else {
    toneClass = "border-green-300 bg-green-50 text-green-900";
  }

  return (
    <section
      className={`border rounded-md p-4 ${toneClass}`}
      data-testid="user-news-picker-trust-panel"
      data-pass={d.pass_check}
    >
      <div className="flex items-baseline gap-3">
        <strong className="text-sm">
          {d.pass_check ? "Kaynak guvenilirligi: Uygun" : "Kaynak guvenilirligi: Engellendi"}
        </strong>
        <span className="text-xs opacity-70">
          enforcement = {d.enforcement_level}
        </span>
      </div>
      <p className="m-0 mt-1 text-xs">{d.message}</p>
      <div className="mt-2 flex gap-4 text-[11px]">
        <span>
          <strong>{breakdown.high ?? 0}</strong> yuksek
        </span>
        <span>
          <strong>{breakdown.medium ?? 0}</strong> orta
        </span>
        <span>
          <strong>{breakdown.low ?? 0}</strong> dusuk
        </span>
        {(breakdown.unknown ?? 0) > 0 && (
          <span>
            <strong>{breakdown.unknown}</strong> bilinmeyen
          </span>
        )}
      </div>
    </section>
  );
}
