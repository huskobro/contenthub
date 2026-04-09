/**
 * M32 — News Bulletin Wizard Page
 *
 * 3-step wizard: kaynak/haber secimi -> draft review / narration edit -> stil & uretim
 *
 * Step 0: Haber secimi (news-first) + bulten ayarlari (topic, tone, duration)
 *         Kullanici once haberleri secer, sonra bulten olusturur.
 * Step 1: Editorial review — inline narration duzenleme + gate
 * Step 2: Stil/preview secimleri + production baslatma
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WizardShell, type WizardStep } from "../../components/wizard/WizardShell";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
import { SubtitleStylePicker } from "../../components/standard-video/SubtitleStylePicker";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/cn";
import {
  type NewsBulletinResponse,
  type NewsBulletinSelectedItemResponse,
  type SelectableNewsItemResponse,
  createNewsBulletin,
  updateNewsBulletin,
  fetchNewsBulletinById,
  fetchSelectableNewsItems,
  fetchNewsBulletinSelectedItems,
  createNewsBulletinSelectedItem,
  deleteNewsBulletinSelectedItem,
  updateNewsBulletinSelectedItem,
  confirmBulletinSelection,
  consumeBulletinNews,
  startBulletinProduction,
  fetchTrustCheck,
  fetchCategoryStyleSuggestion,
} from "../../api/newsBulletinApi";
import {
  type NewsItemResponse,
  fetchNewsItems,
} from "../../api/newsItemsApi";
import { fetchSources, type SourceResponse } from "../../api/sourcesApi";
import { fetchEffectiveSetting } from "../../api/effectiveSettingsApi";
import { SOURCE_CATEGORIES, SOURCE_CATEGORY_LABELS } from "../../constants/statusOptions";
import { timeAgo } from "../../lib/formatDate";

/** Category style mapping entry from settings */
interface CategoryStyleEntry {
  accent: string;
  bg: string;
  grid: string;
  label_tr: string;
  label_en: string;
}
type CategoryStyleMap = Record<string, CategoryStyleEntry>;

const STEPS: WizardStep[] = [
  { id: "source", label: "Kaynak & Haber" },
  { id: "review", label: "Draft & Review" },
  { id: "style", label: "Stil & Uretim" },
];

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

/** Visual style badge — shows matched style label or "GS—" */
function StyleBadge({ category, mapping }: { category: string | null | undefined; mapping: CategoryStyleMap }) {
  if (!category) {
    return <span className="text-[10px] px-1 py-0.5 rounded-sm bg-neutral-100 text-neutral-400 font-medium whitespace-nowrap">GS—</span>;
  }
  const entry = mapping[category];
  if (!entry) {
    return <span className="text-[10px] px-1 py-0.5 rounded-sm bg-neutral-100 text-neutral-400 font-medium whitespace-nowrap">GS—</span>;
  }
  return (
    <span
      className="text-[10px] px-1 py-0.5 rounded-sm font-semibold whitespace-nowrap"
      style={{ backgroundColor: entry.accent + "1A", color: entry.accent }}
    >
      {entry.label_tr}
    </span>
  );
}

// Render mode description mapping
const RENDER_MODE_DESCRIPTIONS: Record<string, string> = {
  combined: "Tum haberler tek bir video olarak render edilir",
  per_category: "Her kategori icin ayri video render edilir",
  per_item: "Her haber icin ayri video render edilir",
};

// ---------------------------------------------------------------------------
// Main wizard page
// ---------------------------------------------------------------------------

export function NewsBulletinWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();

  // If resuming an existing bulletin
  const resumeId = searchParams.get("bulletinId");
  // Faz 5a: channel/project context from user wizard
  const contextChannelProfileId = searchParams.get("channelProfileId");
  const contextContentProjectId = searchParams.get("contentProjectId");

  const [step, setStep] = useState(0);
  const [bulletinId, setBulletinId] = useState<string | null>(resumeId);

  // Step 0 state — news-first flow
  const [language, setLanguage] = useState("tr");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("formal");
  const [duration, setDuration] = useState("120");
  // Local news selection before bulletin creation
  const [selectedItemsLocal, setSelectedItemsLocal] = useState<
    { news_item_id: string; sort_order: number; title: string; source_name?: string | null; category?: string | null }[]
  >([]);
  const [showBulletinSettings, setShowBulletinSettings] = useState(false);
  // Track whether topic was auto-set (so we know if user manually changed it)
  const [topicAutoSet, setTopicAutoSet] = useState(false);

  // Step 2 state
  const [compositionDirection, setCompositionDirection] = useState("");
  const [thumbnailDirection, setThumbnailDirection] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [styleBlueprintId, setStyleBlueprintId] = useState("");
  // M31 pickers
  const [renderMode, setRenderMode] = useState("combined");
  const [subtitleStyle, setSubtitleStyle] = useState("clean_white");
  const [lowerThirdStyle, setLowerThirdStyle] = useState("broadcast");
  const [trustEnforcementLevel, setTrustEnforcementLevel] = useState("warn");
  // Category suggestion dismiss state
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  // M41a: Format picker + karaoke toggle
  const [renderFormat, setRenderFormat] = useState("landscape");
  const [karaokeEnabled, setKaraokeEnabled] = useState(true);
  // M42: Karaoke animasyon preset
  const [karaokeAnimPreset, setKaraokeAnimPreset] = useState("hype");

  // Load existing bulletin if resuming
  const { data: bulletin, refetch: refetchBulletin } = useQuery({
    queryKey: ["news-bulletin", bulletinId],
    queryFn: () => fetchNewsBulletinById(bulletinId!),
    enabled: !!bulletinId,
  });

  // Populate fields from existing bulletin
  useEffect(() => {
    if (bulletin) {
      setTopic(bulletin.topic || "");
      setLanguage(bulletin.language || "tr");
      setTone(bulletin.tone || "formal");
      setDuration(String(bulletin.target_duration_seconds || 120));
      setCompositionDirection(bulletin.composition_direction || "");
      setThumbnailDirection(bulletin.thumbnail_direction || "");
      setTemplateId(bulletin.template_id || "");
      setStyleBlueprintId(bulletin.style_blueprint_id || "");
      // M31 fields
      setRenderMode(bulletin.render_mode || "combined");
      setSubtitleStyle(bulletin.subtitle_style || "clean_white");
      setLowerThirdStyle(bulletin.lower_third_style || "broadcast");
      setTrustEnforcementLevel(bulletin.trust_enforcement_level || "warn");

      // M41a / M42 fields
      if (bulletin.render_format) setRenderFormat(bulletin.render_format);
      if (bulletin.karaoke_enabled !== undefined && bulletin.karaoke_enabled !== null) {
        setKaraokeEnabled(bulletin.karaoke_enabled);
      }
      if (bulletin.karaoke_anim_preset) setKaraokeAnimPreset(bulletin.karaoke_anim_preset);

      // Auto-advance based on status
      // selection_confirmed → step 1 (editorial gate henüz tamamlanmadı, consume_news gerekli)
      // in_progress         → step 2 (gate geçilmiş, style/production adımına devam)
      if (bulletin.status === "in_progress") {
        setStep(2);
      } else if (
        bulletin.status === "selection_confirmed" ||
        (bulletin.status === "draft" && (bulletin.selected_news_count ?? 0) > 0)
      ) {
        setStep(1);
      }
    }
  }, [bulletin]);

  // Sources list — for filter dropdown
  const { data: sourcesList = [] } = useQuery({
    queryKey: ["sources-active"],
    queryFn: () => fetchSources({ status: "active" }),
  });

  // Category style mapping — for visual style badge on news items
  const { data: categoryStyleMapSetting } = useQuery({
    queryKey: ["setting-category-style-mapping"],
    queryFn: () => fetchEffectiveSetting("news_bulletin.config.category_style_mapping"),
  });
  const categoryStyleMap: CategoryStyleMap = (categoryStyleMapSetting?.effective_value as CategoryStyleMap) ?? {};

  // Browse news items — available immediately (before bulletin creation)
  const { data: browseItems = [], isLoading: loadingBrowse } = useQuery({
    queryKey: ["browse-news-items", language, sourceFilter, categoryFilter],
    queryFn: () => fetchNewsItems({
      status: "new",
      language: language || undefined,
      source_id: sourceFilter || undefined,
      category: categoryFilter || undefined,
    }),
    enabled: !bulletinId,
  });

  // Selectable news items — after bulletin exists
  const { data: selectableItems = [], isLoading: loadingSelectable } = useQuery({
    queryKey: ["selectable-news", bulletinId, language, sourceFilter, categoryFilter],
    queryFn: () => fetchSelectableNewsItems(bulletinId!, {
      language: language || undefined,
      source_id: sourceFilter || undefined,
      category: categoryFilter || undefined,
    }),
    enabled: !!bulletinId,
  });

  // Selected items — after bulletin exists
  const { data: selectedItems = [], refetch: refetchSelected } = useQuery({
    queryKey: ["bulletin-selected", bulletinId],
    queryFn: () => fetchNewsBulletinSelectedItems(bulletinId!),
    enabled: !!bulletinId,
  });

  // M31: Trust check — fetched when on step 2 and bulletin exists
  const { data: trustCheck, refetch: refetchTrustCheck } = useQuery({
    queryKey: ["bulletin-trust-check", bulletinId],
    queryFn: () => fetchTrustCheck(bulletinId!),
    enabled: !!bulletinId && step === 2,
  });

  // M31: Category style suggestion — fetched when bulletin exists and on step 2
  const { data: categoryStyleSuggestion } = useQuery({
    queryKey: ["bulletin-category-suggestion", bulletinId],
    queryFn: () => fetchCategoryStyleSuggestion(bulletinId!),
    enabled: !!bulletinId && step === 2,
  });

  // M32: Subtitle presets — fetched when on step 2
  const { data: subtitlePresets = [], isLoading: loadingPresets, error: presetsError } = useQuery({
    queryKey: ["subtitle-presets"],
    queryFn: async () => {
      const res = await fetch("/api/v1/modules/standard-video/subtitle-presets");
      if (!res.ok) throw new Error("Preset yukleme hatasi");
      const data = await res.json();
      return data.presets ?? [];
    },
    enabled: step === 2,
  });

  // --- Local news selection helpers (before bulletin exists) ---

  function addLocalItem(item: NewsItemResponse) {
    setSelectedItemsLocal((prev) => {
      if (prev.some((s) => s.news_item_id === item.id)) return prev;
      const next = [...prev, { news_item_id: item.id, sort_order: prev.length, title: item.title, source_name: item.source_name, category: item.category }];
      // Auto-suggest topic from first selected news item
      if (next.length === 1 && !topic.trim()) {
        setTopic(item.title);
        setTopicAutoSet(true);
      }
      return next;
    });
    // Show bulletin settings once we have at least one item
    setShowBulletinSettings(true);
  }

  function removeLocalItem(newsItemId: string) {
    setSelectedItemsLocal((prev) => {
      const next = prev
        .filter((s) => s.news_item_id !== newsItemId)
        .map((s, i) => ({ ...s, sort_order: i }));
      // If we removed all items and topic was auto-set, clear it
      if (next.length === 0 && topicAutoSet) {
        setTopic("");
        setTopicAutoSet(false);
        setShowBulletinSettings(false);
      }
      return next;
    });
  }

  // --- Mutations ---

  const createBulletinMut = useMutation({
    mutationFn: async () => {
      // 1. Create bulletin
      const created = await createNewsBulletin({
        topic: topic.trim(),
        target_duration_seconds: duration ? Number(duration) : null,
        language: language || "tr",
        tone: tone || "formal",
        status: "draft",
        // Faz 5a: channel/project linkage from user wizard context
        ...(contextChannelProfileId ? { channel_profile_id: contextChannelProfileId } : {}),
        ...(contextContentProjectId ? { content_project_id: contextContentProjectId } : {}),
      });
      // 2. Add all locally selected items
      for (const item of selectedItemsLocal) {
        await createNewsBulletinSelectedItem(created.id, {
          news_item_id: item.news_item_id,
          sort_order: item.sort_order,
        });
      }
      return created;
    },
    onSuccess: (created) => {
      setBulletinId(created.id);
      setSelectedItemsLocal([]);
      toast.success("Bulten olusturuldu");
      refetchSelected();
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Bulten olusturulamadi: ${msg}`);
    },
  });

  const addItemMut = useMutation({
    mutationFn: (newsItemId: string) =>
      createNewsBulletinSelectedItem(bulletinId!, {
        news_item_id: newsItemId,
        sort_order: selectedItems.length,
      }),
    onSuccess: () => {
      refetchSelected();
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Haber eklenemedi: ${msg}`);
    },
  });

  const removeItemMut = useMutation({
    mutationFn: (selectionId: string) =>
      deleteNewsBulletinSelectedItem(bulletinId!, selectionId),
    onSuccess: () => {
      refetchSelected();
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Haber kaldirilamadi: ${msg}`);
    },
  });

  const updateNarrationMut = useMutation({
    mutationFn: ({ selectionId, narration }: { selectionId: string; narration: string }) =>
      updateNewsBulletinSelectedItem(bulletinId!, selectionId, {
        edited_narration: narration || null,
      }),
    onSuccess: () => refetchSelected(),
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Anlatim guncellenemedi: ${msg}`);
    },
  });

  const confirmSelectionMut = useMutation({
    mutationFn: () => confirmBulletinSelection(bulletinId!),
    onSuccess: (res) => {
      if (res.warning_items.length > 0) {
        toast.warning(`${res.warning_items.length} haber daha once kullanilmis (uyari)`);
      }
      toast.success(`Secim onaylandi (${res.confirmed_count} haber)`);
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Secim onaylanamadi: ${msg}`);
    },
  });

  const consumeNewsMut = useMutation({
    mutationFn: () => consumeBulletinNews(bulletinId!),
    onSuccess: (res) => {
      toast.success(`${res.consumed_count} haber tuketildi — pipeline hazir`);
      refetchBulletin();
      // Auto-advance to step 2 after consume succeeds (status → in_progress)
      setStep(2);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Haber tuketimi basarisiz: ${msg}`);
    },
  });

  const updateBulletinMut = useMutation({
    mutationFn: () =>
      updateNewsBulletin(bulletinId!, {
        composition_direction: compositionDirection || null,
        thumbnail_direction: thumbnailDirection || null,
        template_id: templateId || null,
        style_blueprint_id: styleBlueprintId || null,
        render_mode: renderMode,
        subtitle_style: subtitleStyle,
        lower_third_style: lowerThirdStyle,
        trust_enforcement_level: trustEnforcementLevel,
        render_format: renderFormat,
        karaoke_enabled: karaokeEnabled,
        karaoke_anim_preset: karaokeAnimPreset,
      }),
    onSuccess: () => {
      refetchBulletin();
      refetchTrustCheck();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Bulten guncellenemedi: ${msg}`);
    },
  });

  const startProductionMut = useMutation({
    mutationFn: () => startBulletinProduction(bulletinId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["news-bulletins"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      toast.success(`Uretim baslatildi — Job: ${res.job_id.slice(0, 8)}...`);
      // Faz 5a: navigate to project detail if context project exists
      if (contextContentProjectId) {
        navigate(`/user/projects/${contextContentProjectId}`);
      } else {
        navigate(`/admin/jobs/${res.job_id}`);
      }
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || "Uretim baslatilamadi";
      toast.error(`Uretim hatasi: ${detail}`);
    },
  });

  // --- Navigation logic ---

  const canGoNext = useCallback(() => {
    if (step === 0) {
      if (!bulletinId) {
        // Need at least 1 local selection and a topic
        return selectedItemsLocal.length > 0 && topic.trim().length > 0;
      }
      return selectedItems.length > 0;
    }
    if (step === 1) {
      return bulletin?.status === "in_progress";
    }
    if (step === 2) {
      // Block start if trust check failed (block mode)
      if (trustCheck && !trustCheck.pass_check && trustEnforcementLevel === "block") {
        return false;
      }
    }
    return true;
  }, [step, bulletinId, topic, selectedItemsLocal, selectedItems, bulletin, trustCheck, trustEnforcementLevel]);

  async function handleNext() {
    if (step === 0) {
      if (!bulletinId) {
        // Create bulletin + add all local selections
        createBulletinMut.mutate();
        return; // Stay on step 0 until bulletin is created, then auto-advance
      }
      setStep(1);
    } else if (step === 1) {
      // Guard: editorial gate must be completed (status === in_progress)
      if (bulletin?.status !== "in_progress") return;
      setStep(2);
    } else if (step === 2) {
      // Save style choices then start production (sequential — don't start if update fails)
      try {
        await updateBulletinMut.mutateAsync();
      } catch {
        // updateBulletinMut.onError already shows toast
        return;
      }
      startProductionMut.mutate();
    }
  }

  // Auto-advance to step 1 after bulletin creation succeeds
  useEffect(() => {
    if (bulletinId && createBulletinMut.isSuccess) {
      setStep(1);
    }
  }, [bulletinId, createBulletinMut.isSuccess]);

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  const isProcessing =
    createBulletinMut.isPending ||
    startProductionMut.isPending ||
    updateBulletinMut.isPending;

  const getNextLabel = () => {
    if (step === 0 && !bulletinId) return createBulletinMut.isPending ? "Olusturuluyor..." : "Bulten Olustur";
    if (step === 2) return startProductionMut.isPending ? "Baslatiliyor..." : "Uretimi Baslat";
    return "Devam";
  };

  const anyError =
    createBulletinMut.error ||
    startProductionMut.error ||
    confirmSelectionMut.error ||
    consumeNewsMut.error;

  return (
    <WizardShell
      title="Haber Bulteni Olustur"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      onCancel={() => navigate("/admin/news-bulletins")}
      nextDisabled={!canGoNext() || isProcessing}
      isLastStep={step === 2}
      nextLabel={getNextLabel()}
      testId="bulletin-wizard"
    >
      {/* ----------------------------------------------------------------- */}
      {/* Step 0: News-First Source & Selection                              */}
      {/* ----------------------------------------------------------------- */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Filter bar — language, source, category */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-neutral-700 shrink-0">Dil</label>
            <select
              className={cn(inputCls, "w-28")}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="tr">Turkce</option>
              <option value="en">English</option>
            </select>

            <label className="text-sm font-medium text-neutral-700 shrink-0">Kaynak</label>
            <select
              className={cn(inputCls, "w-44")}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">Tum Kaynaklar</option>
              {sourcesList.map((src) => (
                <option key={src.id} value={src.id}>{src.name}</option>
              ))}
            </select>

            <label className="text-sm font-medium text-neutral-700 shrink-0">Kategori</label>
            <select
              className={cn(inputCls, "w-36")}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Tum Kategoriler</option>
              {SOURCE_CATEGORIES.filter((c) => c !== "").map((cat) => (
                <option key={cat} value={cat}>{SOURCE_CATEGORY_LABELS[cat] ?? cat}</option>
              ))}
            </select>
          </div>

          {/* Pre-bulletin: browse news items from global pool */}
          {!bulletinId && (
            <>
              {/* Local selection basket */}
              {selectedItemsLocal.length > 0 && (
                <div className="space-y-1.5">
                  <p className="m-0 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Secilen Haberler ({selectedItemsLocal.length})
                  </p>
                  {selectedItemsLocal.map((item, idx) => (
                    <div
                      key={item.news_item_id}
                      className="flex items-center justify-between p-2 bg-success-light border border-success rounded-md text-sm"
                    >
                      <span className="text-neutral-800 truncate flex-1 mr-2">
                        #{idx + 1} — {item.title || item.news_item_id.slice(0, 12)}
                        {item.source_name && (
                          <span className="ml-1.5 text-neutral-400 text-xs font-normal">({item.source_name})</span>
                        )}
                        <span className="ml-1"><StyleBadge category={item.category} mapping={categoryStyleMap} /></span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLocalItem(item.news_item_id)}
                        className="text-xs text-error-dark bg-transparent border-none cursor-pointer hover:text-error-dark"
                      >
                        Kaldir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bulletin settings — collapsible, shown after first selection */}
              {selectedItemsLocal.length > 0 && (
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowBulletinSettings((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 text-sm font-medium text-neutral-700 cursor-pointer border-none hover:bg-neutral-100 transition-colors"
                  >
                    <span>Bulten Ayarlari</span>
                    <span className="text-neutral-400 text-xs">
                      {showBulletinSettings ? "Gizle" : "Goster"}
                    </span>
                  </button>
                  {showBulletinSettings && (
                    <div className="p-3 space-y-3 border-t border-neutral-200">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Konu <span className="text-error-dark">*</span>
                        </label>
                        <input
                          className={inputCls}
                          value={topic}
                          onChange={(e) => {
                            setTopic(e.target.value);
                            setTopicAutoSet(false);
                          }}
                          placeholder="Bultenin ana konusu"
                        />
                        {topicAutoSet && (
                          <p className="m-0 mt-0.5 text-[10px] text-neutral-400 italic">
                            Ilk secilen haberin basligindan otomatik dolduruldu
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Ton</label>
                          <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
                            <option value="formal">Formal</option>
                            <option value="casual">Casual</option>
                            <option value="dramatic">Dramatic</option>
                            <option value="neutral">Neutral</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Hedef Sure (sn)</label>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="120"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inline create button — above the news list for quick access */}
              {selectedItemsLocal.length > 0 && topic.trim().length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => createBulletinMut.mutate()}
                    disabled={createBulletinMut.isPending || !canGoNext()}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium text-white border-none rounded-sm",
                      createBulletinMut.isPending || !canGoNext()
                        ? "bg-neutral-300 cursor-not-allowed"
                        : "bg-brand-500 cursor-pointer hover:bg-brand-600 transition-colors",
                    )}
                  >
                    {createBulletinMut.isPending ? "Olusturuluyor..." : "Bulten Olustur"}
                  </button>
                </div>
              )}

              {/* Browseable news items */}
              <div className="space-y-1.5">
                <p className="m-0 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Mevcut Haberler ({browseItems.filter((ni) => !selectedItemsLocal.some((s) => s.news_item_id === ni.id)).length})
                  {loadingBrowse && " — yukleniyor..."}
                </p>
                {browseItems.length === 0 && !loadingBrowse && (
                  <p className="text-sm text-neutral-400 italic">Secilebilir haber bulunamadi.</p>
                )}
                {browseItems
                  .filter((ni) => !selectedItemsLocal.some((s) => s.news_item_id === ni.id))
                  .slice(0, 30)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      <div className="flex-1 mr-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-800 font-medium truncate">{item.title || "(basliksiz)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.source_name && (
                            <span className="text-xs text-brand-600 font-medium">{item.source_name}</span>
                          )}
                          <StyleBadge category={item.category} mapping={categoryStyleMap} />
                          <span className="text-xs text-neutral-300">{timeAgo(item.created_at)}</span>
                          {item.summary && (
                            <span className="text-neutral-400 text-xs truncate">{item.summary.slice(0, 60)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addLocalItem(item)}
                        className="text-xs text-info-dark bg-transparent border-none cursor-pointer hover:text-info-dark whitespace-nowrap"
                      >
                        Sec
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* Post-bulletin: server-side selection (resume flow) */}
          {bulletinId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="m-0 text-md font-semibold text-neutral-800">
                  Haber Secimi ({selectedItems.length} secili)
                </h3>
                <span className="text-xs text-neutral-400">
                  Bulten: {bulletin?.topic || "..."} ({bulletin?.status})
                </span>
              </div>

              {/* Selected items */}
              {selectedItems.length > 0 && (
                <div className="space-y-1.5">
                  <p className="m-0 text-xs font-medium text-neutral-500 uppercase tracking-wide">Secilen Haberler</p>
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-success-light border border-success rounded-md text-sm"
                    >
                      <div className="flex-1 mr-2 min-w-0">
                        <span className="text-neutral-800 font-medium truncate block">
                          #{item.sort_order + 1} — {item.news_title || item.news_item_id.slice(0, 12)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StyleBadge category={item.news_category} mapping={categoryStyleMap} />
                          {item.used_news_warning && (
                            <span className="text-xs text-warning-dark">(daha once kullanilmis)</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemMut.mutate(item.id)}
                        className="text-xs text-error-dark bg-transparent border-none cursor-pointer hover:text-error-dark"
                        disabled={removeItemMut.isPending}
                      >
                        Kaldir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available items */}
              <div className="space-y-1.5">
                <p className="m-0 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Mevcut Haberler ({selectableItems.filter((si) => !selectedItems.some((sel) => sel.news_item_id === si.id)).length})
                  {loadingSelectable && " — yukleniyor..."}
                </p>
                {selectableItems.length === 0 && !loadingSelectable && (
                  <p className="text-sm text-neutral-400 italic">Secilebilir haber bulunamadi.</p>
                )}
                {selectableItems
                  .filter((si) => !selectedItems.some((sel) => sel.news_item_id === si.id))
                  .slice(0, 30)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      <div className="flex-1 mr-2 min-w-0">
                        <span className="text-neutral-800 font-medium truncate block">{item.title || "(basliksiz)"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.source_name && (
                            <span className="text-xs text-brand-600 font-medium">{item.source_name}</span>
                          )}
                          <StyleBadge category={item.category} mapping={categoryStyleMap} />
                          <span className="text-xs text-neutral-300">{timeAgo(item.created_at)}</span>
                          {item.summary && (
                            <span className="text-neutral-400 text-xs truncate">{item.summary.slice(0, 60)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addItemMut.mutate(item.id)}
                        className="text-xs text-info-dark bg-transparent border-none cursor-pointer hover:text-info-dark whitespace-nowrap"
                        disabled={addItemMut.isPending}
                      >
                        Sec
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Step 1: Draft Review & Narration Edit                             */}
      {/* ----------------------------------------------------------------- */}
      {step === 1 && bulletinId && (
        <EditorialReviewStep
          bulletinId={bulletinId}
          bulletin={bulletin ?? null}
          selectedItems={selectedItems}
          onUpdateNarration={(selectionId, narration) =>
            updateNarrationMut.mutate({ selectionId, narration })
          }
          onConfirmSelection={() => confirmSelectionMut.mutate()}
          onConsumeNews={() => consumeNewsMut.mutate()}
          isConfirming={confirmSelectionMut.isPending}
          isConsuming={consumeNewsMut.isPending}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Step 2: Style & Production                                        */}
      {/* ----------------------------------------------------------------- */}
      {step === 2 && bulletinId && (
        <div className="space-y-4">
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Stil Sablonu</h3>
            <StyleBlueprintSelector
              value={styleBlueprintId || null}
              onChange={(id) => setStyleBlueprintId(id ?? "")}
              moduleScope="news_bulletin"
            />
          </div>

          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Kompozisyon Yonu</h3>
            <CompositionDirectionPreview
              selected={compositionDirection || undefined}
              onSelect={(dir) => setCompositionDirection(dir)}
            />
          </div>

          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Thumbnail Yonu</h3>
            <ThumbnailDirectionPreview
              selected={thumbnailDirection || undefined}
              onSelect={(dir) => setThumbnailDirection(dir)}
            />
          </div>

          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Sablon</h3>
            <TemplateSelector
              value={templateId || null}
              onChange={(id) => setTemplateId(id ?? "")}
              moduleScope="news_bulletin"
            />
          </div>

          {/* ---- M31: Render Mode ---- */}
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Video Modu</h3>
            <div className="flex gap-2">
              {(
                [
                  { value: "combined", label: "Tek Video" },
                  { value: "per_category", label: "Kategori Bazli" },
                  { value: "per_item", label: "Haber Bazli" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRenderMode(value)}
                  className={cn(
                    "px-3 py-1.5 text-sm border rounded-sm cursor-pointer transition-colors",
                    renderMode === value
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="m-0 mt-1.5 text-xs text-neutral-500">
              {RENDER_MODE_DESCRIPTIONS[renderMode] || ""}
            </p>
            {/* Output count estimate based on selected news */}
            {(() => {
              const newsCount = bulletinId ? selectedItems.length : selectedItemsLocal.length;
              if (newsCount === 0) return null;
              let outputCount = 1;
              let outputLabel = "1 video";
              if (renderMode === "per_item") {
                outputCount = newsCount;
                outputLabel = `${outputCount} video (haber basina 1)`;
              } else if (renderMode === "per_category") {
                // Estimate unique categories — exact count needs backend, show approximate
                outputLabel = "Kategori sayisi kadar video";
              }
              return (
                <p className="m-0 mt-1 text-xs font-medium text-brand-600">
                  Tahmini cikti: {outputLabel}
                </p>
              );
            })()}
          </div>

          {/* ---- M32: Subtitle Style — SubtitleStylePicker ---- */}
          <div>
            <SubtitleStylePicker
              value={subtitleStyle}
              onChange={(presetId) => setSubtitleStyle(presetId)}
              presets={subtitlePresets}
              loading={loadingPresets}
              error={presetsError instanceof Error ? presetsError.message : presetsError ? String(presetsError) : null}
            />
          </div>

          {/* ---- M32: Lower-Third Style — LowerThirdStylePreview ---- */}
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Alt Bant Stili</h3>
            <LowerThirdStylePreview
              selected={lowerThirdStyle || undefined}
              onSelect={(style) => setLowerThirdStyle(style)}
            />
          </div>

          {/* ---- M41a: Video Formati ---- */}
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Video Formati</h3>
            <div className="flex gap-2">
              {([
                { value: "landscape", label: "16:9 (Yatay)", desc: "YouTube, TV" },
                { value: "portrait", label: "9:16 (Shorts)", desc: "Shorts, Reels, TikTok" },
              ] as const).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRenderFormat(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-center",
                    renderFormat === value
                      ? "bg-brand-50 text-brand-700 border-brand-400 ring-1 ring-brand-200"
                      : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[11px] text-neutral-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ---- M41a: Karaoke Toggle ---- */}
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Karaoke Altyazi</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={karaokeEnabled}
                onChange={(e) => setKaraokeEnabled(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-neutral-700">
                Kelime bazli karaoke highlight
              </span>
            </label>
            <p className="m-0 mt-1 text-xs text-neutral-400">
              Acik: kelimeler konusulan anda vurgulanir. Kapali: standart zamanlama.
            </p>
          </div>

          {/* ---- M42: Karaoke Animasyon Preset ---- */}
          {karaokeEnabled && (
            <div>
              <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Animasyon Stili</h3>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "hype", label: "Hype", desc: "Bounce + parlama" },
                    { value: "explosive", label: "Explosive", desc: "Ates efekti + agresif scale" },
                    { value: "vibrant", label: "Vibrant", desc: "Renk kaymasi + dinamik" },
                    { value: "minimal", label: "Minimal", desc: "Sadece renk, animasyon yok" },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKaraokeAnimPreset(value)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 px-3 py-2.5 border rounded-md cursor-pointer transition-colors text-left",
                      karaokeAnimPreset === value
                        ? "bg-brand-50 text-brand-700 border-brand-400 ring-1 ring-brand-200"
                        : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                    )}
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-[11px] text-neutral-400">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- M31: Trust Enforcement Level ---- */}
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Guvenilirlik Denetimi</h3>
            <div className="flex gap-2">
              {(
                [
                  { value: "none", label: "Kontrol Yok" },
                  { value: "warn", label: "Uyari Ver" },
                  { value: "block", label: "Engelle" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrustEnforcementLevel(value)}
                  className={cn(
                    "px-3 py-1.5 text-sm border rounded-sm cursor-pointer transition-colors",
                    trustEnforcementLevel === value
                      ? value === "block"
                        ? "bg-error text-white border-error"
                        : value === "warn"
                          ? "bg-warning text-white border-warning"
                          : "bg-neutral-400 text-white border-neutral-400"
                      : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ---- M31: Category Style Suggestion ---- */}
          {categoryStyleSuggestion && !suggestionDismissed && (
            <div className="flex items-start gap-3 p-3 bg-info-light border border-info rounded-md text-sm">
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium text-info-dark">
                  Baskin kategori:{" "}
                  <span className="font-bold">{categoryStyleSuggestion.dominant_category ?? categoryStyleSuggestion.category_used}</span>
                  {" -> "}Onerilen stil:{" "}
                  <span className="font-bold">{categoryStyleSuggestion.suggested_subtitle_style}</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSubtitleStyle(categoryStyleSuggestion.suggested_subtitle_style);
                    setLowerThirdStyle(categoryStyleSuggestion.suggested_lower_third_style);
                    setCompositionDirection(categoryStyleSuggestion.suggested_composition_direction);
                    setSuggestionDismissed(true);
                  }}
                  className="px-2 py-1 text-xs font-medium text-white bg-info hover:bg-info-dark border-none rounded-sm cursor-pointer"
                >
                  Oneriyi Uygula
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestionDismissed(true)}
                  className="text-xs text-info bg-transparent border-none cursor-pointer hover:text-info-dark underline"
                >
                  Manuel secim yapiyorum
                </button>
              </div>
            </div>
          )}

          {/* ---- M31: Trust Check Result ---- */}
          {trustCheck && (
            <div
              className={cn(
                "p-3 rounded-md border text-sm",
                !trustCheck.pass_check
                  ? "bg-error-light border-error text-error-dark"
                  : trustCheck.low_trust_items.length > 0
                    ? "bg-warning-light border-warning text-warning-dark"
                    : "bg-success-light border-success text-success-dark",
              )}
            >
              {!trustCheck.pass_check ? (
                <>
                  <p className="m-0 font-medium">Guvenilirlik Engeli</p>
                  <p className="m-0 mt-1">{trustCheck.message}</p>
                  {trustCheck.low_trust_items.map((item) => (
                    <p key={item.news_item_id} className="m-0 mt-0.5 text-xs">
                      -- {item.source_name} (duzey: {item.trust_level})
                    </p>
                  ))}
                </>
              ) : trustCheck.low_trust_items.length > 0 ? (
                <>
                  <p className="m-0 font-medium">Guvenilirlik Uyarisi</p>
                  <p className="m-0 mt-1">{trustCheck.message}</p>
                  {trustCheck.low_trust_items.map((item) => (
                    <p key={item.news_item_id} className="m-0 mt-0.5 text-xs">
                      -- {item.source_name} (duzey: {item.trust_level})
                    </p>
                  ))}
                </>
              ) : (
                <p className="m-0 font-medium">Tum kaynaklar guvenilir</p>
              )}
            </div>
          )}

          {/* Production summary */}
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <p className="m-0 font-medium text-neutral-700">Uretim Ozeti</p>
            <SummaryRow label="Konu" value={bulletin?.topic || topic} />
            <SummaryRow label="Durum" value={bulletin?.status || "---"} />
            <SummaryRow label="Secili Haber" value={String(selectedItems.length)} />
            <SummaryRow label="Dil" value={bulletin?.language || language} />
            <SummaryRow label="Ton" value={bulletin?.tone || tone} />
            <SummaryRow label="Kompozisyon" value={compositionDirection || "---"} />
            <SummaryRow label="Thumbnail" value={thumbnailDirection || "---"} />
            <SummaryRow label="Video Modu" value={
              renderMode === "per_item" ? `Haber Basina (${selectedItems.length} video)` :
              renderMode === "per_category" ? "Kategori Basina" :
              "Tek Video"
            } />
            <SummaryRow label="Altyazi" value={subtitleStyle} />
            <SummaryRow label="Alt Bant" value={lowerThirdStyle} />
            <SummaryRow label="Format" value={renderFormat === "portrait" ? "9:16 (Shorts)" : "16:9 (Yatay)"} />
            <SummaryRow label="Karaoke" value={karaokeEnabled ? `Acik (${karaokeAnimPreset})` : "Kapali"} />
            <SummaryRow label="Guvenilirlik" value={trustEnforcementLevel} />
          </div>

          {bulletin?.status !== "in_progress" && (
            <p className="text-warning-dark text-xs">
              Uretim baslatmak icin editorial gate gecilmis olmali (durum: in_progress).
              Mevcut durum: {bulletin?.status}
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {anyError && (
        <p className="text-error-dark text-sm mt-2 break-words [overflow-wrap:anywhere]">
          {anyError instanceof Error ? anyError.message : String(anyError)}
        </p>
      )}
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step 1 sub-component: Editorial Review
// ---------------------------------------------------------------------------

function EditorialReviewStep({
  bulletinId,
  bulletin,
  selectedItems,
  onUpdateNarration,
  onConfirmSelection,
  onConsumeNews,
  isConfirming,
  isConsuming,
}: {
  bulletinId: string;
  bulletin: NewsBulletinResponse | null;
  selectedItems: NewsBulletinSelectedItemResponse[];
  onUpdateNarration: (selectionId: string, narration: string) => void;
  onConfirmSelection: () => void;
  onConsumeNews: () => void;
  isConfirming: boolean;
  isConsuming: boolean;
}) {
  const status = bulletin?.status || "draft";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-md font-semibold text-neutral-800">
          Editorial Review
        </h3>
        <StatusBadge status={status} />
      </div>

      <p className="m-0 text-xs text-neutral-500">
        Her haber icin narration duzenleme yapabilirsiniz. Duzenlenenmis narration pipeline'da korunacaktir.
      </p>

      {/* Selected items with narration editing */}
      <div className="space-y-3">
        {selectedItems.map((item, idx) => (
          <NarrationEditCard
            key={item.id}
            item={item}
            index={idx}
            onSave={(narration) => onUpdateNarration(item.id, narration)}
            disabled={status !== "draft"}
          />
        ))}
      </div>

      {/* Gate actions */}
      <div className="flex gap-2 pt-3 border-t border-neutral-200">
        {status === "draft" && (
          <button
            type="button"
            onClick={onConfirmSelection}
            disabled={isConfirming || selectedItems.length === 0}
            className={cn(
              "px-4 py-1.5 text-sm font-medium border-none rounded-sm",
              isConfirming || selectedItems.length === 0
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                : "bg-warning text-white cursor-pointer hover:bg-warning-dark",
            )}
          >
            {isConfirming ? "Onaylaniyor..." : "Secimi Onayla"}
          </button>
        )}

        {status === "selection_confirmed" && (
          <button
            type="button"
            onClick={onConsumeNews}
            disabled={isConsuming}
            className={cn(
              "px-4 py-1.5 text-sm font-medium border-none rounded-sm",
              isConsuming
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                : "bg-success text-white cursor-pointer hover:bg-success-dark",
            )}
          >
            {isConsuming ? "Islem yapiliyor..." : "Haberleri Tuket & Uretim Hazirla"}
          </button>
        )}

        {status === "in_progress" && (
          <span className="text-success-dark text-sm font-medium">
            Gate gecildi — devam edebilirsiniz
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narration edit card
// ---------------------------------------------------------------------------

function NarrationEditCard({
  item,
  index,
  onSave,
  disabled,
}: {
  item: NewsBulletinSelectedItemResponse;
  index: number;
  onSave: (narration: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.edited_narration || "");

  useEffect(() => {
    setDraft(item.edited_narration || "");
  }, [item.edited_narration]);

  return (
    <div className="border border-neutral-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-neutral-700">
          #{index + 1} — {item.news_title || item.news_item_id.slice(0, 12)}
          {item.news_category && (
            <span className="ml-1 text-neutral-400 text-xs font-normal">[{item.news_category}]</span>
          )}
        </span>
        {item.used_news_warning && (
          <span className="text-xs text-warning-dark">daha once kullanilmis</span>
        )}
      </div>

      {item.selection_reason && (
        <p className="m-0 text-xs text-neutral-400 mb-1.5">Secim nedeni: {item.selection_reason}</p>
      )}

      {/* Narration area */}
      <div className="mt-2">
        <label className="block text-xs font-medium text-neutral-500 mb-1">
          Narration {item.edited_narration ? "(duzenlenmis)" : "(henuz duzenlenmemis)"}
        </label>
        {editing ? (
          <div className="space-y-1.5">
            <textarea
              className={cn(inputCls, "min-h-[80px] resize-y")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Spiker narration metni..."
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
                className="px-3 py-1 text-xs font-medium text-white bg-brand-500 border-none rounded-sm cursor-pointer hover:bg-brand-600"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(item.edited_narration || "");
                  setEditing(false);
                }}
                className="px-3 py-1 text-xs text-neutral-500 bg-transparent border border-border rounded-sm cursor-pointer hover:bg-neutral-50"
              >
                Vazgec
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="m-0 text-sm text-neutral-600 flex-1">
              {item.edited_narration || <em className="text-neutral-300">Henuz duzenleme yapilmadi</em>}
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-info-dark bg-transparent border-none cursor-pointer hover:text-info-dark whitespace-nowrap"
              >
                Duzenle
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    selection_confirmed: "bg-warning-light text-warning-dark",
    in_progress: "bg-success-light text-success-dark",
    rendering: "bg-info-light text-info-dark",
    done: "bg-success-light text-success-dark",
    failed: "bg-error-light text-error-dark",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[status] || "bg-neutral-100 text-neutral-500")}>
      {status}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="text-neutral-800">{value || <em className="text-neutral-300">{"\u2014"}</em>}</span>
    </div>
  );
}
