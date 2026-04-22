/**
 * AuroraNewsBulletinWizardPage — Aurora Dusk Cockpit / Haber Bülteni Sihirbazı (admin).
 *
 * Tasarım hedefi (CLAUDE.md uyumu):
 *   - Sol/üst bölge: 3 adımlı "Kaynak & Haber → Draft & Review → Stil & Üretim"
 *     wizard'ı; her adım kendi card'ı; üstte Aurora stepper (1–2–3).
 *   - Sağ bölge: AuroraInspector — "Aşama özeti" başlığı altında o ana kadar
 *     yapılan seçimlerin liste görünümü + "İlerleme" KPI tile.
 *   - Breadcrumb: "News Bulletins → Wizard".
 *
 * Davranış disiplini (CLAUDE.md / "stay within scope"):
 *   - Wizard adımları, validation kuralları, mutasyonlar (createNewsBulletin,
 *     confirmBulletinSelection, consumeBulletinNews, updateNewsBulletin,
 *     startBulletinProduction, …) legacy sayfayla AYNI hook/api'leri kullanır.
 *   - Yeni store / yeni endpoint EKLENMEZ. Sadece görsel kabuk değişir.
 *   - Final submit (start production), legacy ile aynı sıralı flow ile çalışır:
 *     update bulletin → start production → navigate.
 *
 * Surface override sistemi:
 *   - `useSurfacePageOverride("admin.news-bulletins.wizard")` ile bağlanır.
 *   - register.tsx'e bu commit'te dokunulmaz; manifest girişi tanımlanmadığı
 *     sürece legacy sayfa render olur (trampolinin doğal fallback'i).
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraCard,
  AuroraStatusChip,
  AuroraMeterTile,
} from "./primitives";
import { Icon } from "./icons";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
import { SubtitleStylePicker } from "../../components/standard-video/SubtitleStylePicker";
import { useToast } from "../../hooks/useToast";
import {
  type NewsBulletinResponse,
  type NewsBulletinSelectedItemResponse,
  createNewsBulletin,
  fetchNewsBulletinById,
  fetchSelectableNewsItems,
  fetchNewsBulletinSelectedItems,
  createNewsBulletinSelectedItem,
  deleteNewsBulletinSelectedItem,
  updateNewsBulletinSelectedItem,
  confirmBulletinSelection,
  consumeBulletinNews,
  updateAndStartBulletinProduction,
  fetchTrustCheck,
  fetchCategoryStyleSuggestion,
} from "../../api/newsBulletinApi";
import {
  type NewsItemResponse,
  fetchNewsItems,
} from "../../api/newsItemsApi";
import { fetchSources, type SourceResponse } from "../../api/sourcesApi";
import { fetchEffectiveSetting } from "../../api/effectiveSettingsApi";
import {
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABELS,
} from "../../constants/statusOptions";
import { timeAgo } from "../../lib/formatDate";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface CategoryStyleEntry {
  accent: string;
  bg: string;
  grid: string;
  label_tr: string;
  label_en: string;
}
type CategoryStyleMap = Record<string, CategoryStyleEntry>;

const STEPS: { id: string; label: string }[] = [
  { id: "source", label: "Kaynak & Haber" },
  { id: "review", label: "Draft & Review" },
  { id: "style", label: "Stil & Üretim" },
];

const RENDER_MODE_DESCRIPTIONS: Record<string, string> = {
  combined: "Tüm haberler tek bir video olarak render edilir",
  per_category: "Her kategori için ayrı video render edilir",
  per_item: "Her haber için ayrı video render edilir",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "taslak",
  selection_confirmed: "seçim onaylı",
  in_progress: "üretiliyor",
  rendering: "render",
  done: "tamamlandı",
  failed: "başarısız",
};

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
const STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  selection_confirmed: "warning",
  in_progress: "info",
  rendering: "info",
  done: "success",
  failed: "danger",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraNewsBulletinWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Shell Branching Rule (CLAUDE.md): shell is decided by URL, not role. The
  // wizard is reachable from /admin/news-bulletins/wizard and from the user
  // shell's wizard module — whichever shell you entered from, you return to.
  // Previously this was `role === "admin"` which silently crossed impersonating
  // admins onto the admin shell on final-submit navigation.
  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";
  const qc = useQueryClient();
  const toast = useToast();

  // Resume / context params (legacy ile aynı kontrat)
  const resumeId = searchParams.get("bulletinId");
  const contextChannelProfileId = searchParams.get("channelProfileId");
  const contextContentProjectId = searchParams.get("contentProjectId");
  const contextLowerThirdStyle = searchParams.get("lowerThirdStyle");
  const contextStyleBlueprintId = searchParams.get("styleBlueprintId");
  // Aurora news picker (`/user/news-picker` / `/admin/news-picker`) seçim
  // onaylandığında wizard'a `?news_ids=a,b,c` ile gönderiliyor. Pre-Pass-7'de
  // wizard bu paramı okumuyordu, dolayısıyla seçim kayıp gidiyordu. Aşağıdaki
  // hook ilk mount'ta ID listesini alıp, bulletin daha oluşmadığı durumda
  // `selectedItemsLocal`'a hydrate eder.
  const preselectIdsCsv = searchParams.get("news_ids");

  const [step, setStep] = useState(0);
  const [bulletinId, setBulletinId] = useState<string | null>(resumeId);

  // Step 0
  const [language, setLanguage] = useState("tr");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("formal");
  const [duration, setDuration] = useState("120");
  const [selectedItemsLocal, setSelectedItemsLocal] = useState<
    {
      news_item_id: string;
      sort_order: number;
      title: string;
      source_name?: string | null;
      category?: string | null;
    }[]
  >([]);
  const [topicAutoSet, setTopicAutoSet] = useState(false);

  // Step 2
  const [compositionDirection, setCompositionDirection] = useState("");
  const [thumbnailDirection, setThumbnailDirection] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [styleBlueprintId, setStyleBlueprintId] = useState(
    contextStyleBlueprintId ?? "",
  );
  const [renderMode, setRenderMode] = useState("combined");
  const [subtitleStyle, setSubtitleStyle] = useState("clean_white");
  const [lowerThirdStyle, setLowerThirdStyle] = useState(
    contextLowerThirdStyle ?? "broadcast",
  );
  const [trustEnforcementLevel, setTrustEnforcementLevel] = useState("warn");
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [renderFormat, setRenderFormat] = useState("landscape");
  const [karaokeEnabled, setKaraokeEnabled] = useState(true);
  const [karaokeAnimPreset, setKaraokeAnimPreset] = useState("hype");

  // ---- Server state (legacy ile birebir aynı queryKey'ler) ----
  const { data: bulletin, refetch: refetchBulletin } = useQuery({
    queryKey: ["news-bulletin", bulletinId],
    queryFn: () => fetchNewsBulletinById(bulletinId!),
    enabled: !!bulletinId,
  });

  useEffect(() => {
    if (!bulletin) return;
    setTopic(bulletin.topic || "");
    setLanguage(bulletin.language || "tr");
    setTone(bulletin.tone || "formal");
    setDuration(String(bulletin.target_duration_seconds || 120));
    setCompositionDirection(bulletin.composition_direction || "");
    setThumbnailDirection(bulletin.thumbnail_direction || "");
    setTemplateId(bulletin.template_id || "");
    setStyleBlueprintId(bulletin.style_blueprint_id || "");
    setRenderMode(bulletin.render_mode || "combined");
    setSubtitleStyle(bulletin.subtitle_style || "clean_white");
    setLowerThirdStyle(bulletin.lower_third_style || "broadcast");
    setTrustEnforcementLevel(bulletin.trust_enforcement_level || "warn");
    if (bulletin.render_format) setRenderFormat(bulletin.render_format);
    if (
      bulletin.karaoke_enabled !== undefined &&
      bulletin.karaoke_enabled !== null
    ) {
      setKaraokeEnabled(bulletin.karaoke_enabled);
    }
    if (bulletin.karaoke_anim_preset)
      setKaraokeAnimPreset(bulletin.karaoke_anim_preset);

    if (bulletin.status === "in_progress") {
      setStep(2);
    } else if (
      bulletin.status === "selection_confirmed" ||
      (bulletin.status === "draft" && (bulletin.selected_news_count ?? 0) > 0)
    ) {
      setStep(1);
    }
  }, [bulletin]);

  // News picker → wizard hand-off hydration.
  // AuroraUserNewsPickerPage "Seçimleri onayla" butonu CSV `news_ids` ile
  // buraya yönlendirir. Sadece *yeni* bulletin (bulletinId yok) + henüz seçim
  // yapılmamış (selectedItemsLocal boş) durumda, ID listesini NewsItemResponse
  // formatına hydrate edip `selectedItemsLocal`'a aktarırız. Sonraki rerender'larda
  // effect ya bulletinId (persisted path) ya da boş olmayan local seçim nedeniyle
  // tetiklenmez → duplicate ekleme olmaz.
  const { data: preselectItems } = useQuery({
    queryKey: ["news-picker-preselect", preselectIdsCsv, language],
    queryFn: async () => {
      const ids = (preselectIdsCsv ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) return [] as NewsItemResponse[];
      // newsItemsApi filter=new + geniş limit; client-side id filter.
      const list = await fetchNewsItems({
        status: "new",
        language: language || undefined,
        limit: 200,
      });
      const idSet = new Set(ids);
      return list.filter((it) => idSet.has(it.id));
    },
    enabled: !!preselectIdsCsv && !bulletinId && selectedItemsLocal.length === 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!preselectItems || preselectItems.length === 0) return;
    if (bulletinId) return; // persisted path zaten bulletin'den okuyor
    if (selectedItemsLocal.length > 0) return; // kullanıcı manuel ekledi
    setSelectedItemsLocal(
      preselectItems.map((it, i) => ({
        news_item_id: it.id,
        sort_order: i,
        title: it.title,
        source_name: it.source_name,
        category: it.category,
      })),
    );
    if (preselectItems[0] && !topic.trim()) {
      setTopic(preselectItems[0].title);
      setTopicAutoSet(true);
    }
  }, [preselectItems, bulletinId, selectedItemsLocal.length, topic]);

  const { data: sourcesList = [] } = useQuery<SourceResponse[]>({
    queryKey: ["sources-active"],
    queryFn: async () => {
      const resp = await fetchSources({ status: "active" });
      return resp.items;
    },
  });

  const { data: categoryStyleMapSetting } = useQuery({
    queryKey: ["setting-category-style-mapping"],
    queryFn: () =>
      fetchEffectiveSetting("news_bulletin.config.category_style_mapping"),
  });
  const categoryStyleMap: CategoryStyleMap =
    (categoryStyleMapSetting?.effective_value as CategoryStyleMap) ?? {};

  const { data: browseItems = [], isLoading: loadingBrowse } = useQuery({
    queryKey: ["browse-news-items", language, sourceFilter, categoryFilter],
    queryFn: () =>
      fetchNewsItems({
        status: "new",
        language: language || undefined,
        source_id: sourceFilter || undefined,
        category: categoryFilter || undefined,
      }),
    enabled: !bulletinId,
  });

  const { data: selectableItems = [], isLoading: loadingSelectable } = useQuery(
    {
      queryKey: [
        "selectable-news",
        bulletinId,
        language,
        sourceFilter,
        categoryFilter,
      ],
      queryFn: () =>
        fetchSelectableNewsItems(bulletinId!, {
          language: language || undefined,
          source_id: sourceFilter || undefined,
          category: categoryFilter || undefined,
        }),
      enabled: !!bulletinId,
    },
  );

  const { data: selectedItems = [], refetch: refetchSelected } = useQuery({
    queryKey: ["bulletin-selected", bulletinId],
    queryFn: () => fetchNewsBulletinSelectedItems(bulletinId!),
    enabled: !!bulletinId,
  });

  const { data: trustCheck, refetch: refetchTrustCheck } = useQuery({
    queryKey: ["bulletin-trust-check", bulletinId],
    queryFn: () => fetchTrustCheck(bulletinId!),
    enabled: !!bulletinId && step === 2,
  });

  const { data: categoryStyleSuggestion } = useQuery({
    queryKey: ["bulletin-category-suggestion", bulletinId],
    queryFn: () => fetchCategoryStyleSuggestion(bulletinId!),
    enabled: !!bulletinId && step === 2,
  });

  const {
    data: subtitlePresets = [],
    isLoading: loadingPresets,
    error: presetsError,
  } = useQuery({
    queryKey: ["news-bulletin-subtitle-presets"],
    queryFn: async () => {
      const res = await fetch("/api/v1/modules/standard-video/subtitle-presets");
      if (!res.ok) throw new Error("Preset yükleme hatası");
      const data = await res.json();
      const list = data?.presets;
      return Array.isArray(list) ? list : [];
    },
    enabled: step === 2,
  });

  // ---- Local selection helpers ----

  function addLocalItem(item: NewsItemResponse) {
    setSelectedItemsLocal((prev) => {
      if (prev.some((s) => s.news_item_id === item.id)) return prev;
      const next = [
        ...prev,
        {
          news_item_id: item.id,
          sort_order: prev.length,
          title: item.title,
          source_name: item.source_name,
          category: item.category,
        },
      ];
      if (next.length === 1 && !topic.trim()) {
        setTopic(item.title);
        setTopicAutoSet(true);
      }
      return next;
    });
  }

  function removeLocalItem(newsItemId: string) {
    setSelectedItemsLocal((prev) => {
      const next = prev
        .filter((s) => s.news_item_id !== newsItemId)
        .map((s, i) => ({ ...s, sort_order: i }));
      if (next.length === 0 && topicAutoSet) {
        setTopic("");
        setTopicAutoSet(false);
      }
      return next;
    });
  }

  // ---- Mutations ----

  const createBulletinMut = useMutation({
    mutationFn: async () => {
      const created = await createNewsBulletin({
        topic: topic.trim(),
        target_duration_seconds: duration ? Number(duration) : null,
        language: language || "tr",
        tone: tone || "formal",
        status: "draft",
        ...(contextChannelProfileId
          ? { channel_profile_id: contextChannelProfileId }
          : {}),
        ...(contextContentProjectId
          ? { content_project_id: contextContentProjectId }
          : {}),
      });
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
      toast.success("Bülten oluşturuldu");
      refetchSelected();
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Bülten oluşturulamadı: ${msg}`);
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
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
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
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Haber kaldırılamadı: ${msg}`);
    },
  });

  const updateNarrationMut = useMutation({
    mutationFn: ({
      selectionId,
      narration,
    }: {
      selectionId: string;
      narration: string;
    }) =>
      updateNewsBulletinSelectedItem(bulletinId!, selectionId, {
        edited_narration: narration || null,
      }),
    onSuccess: () => refetchSelected(),
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Anlatım güncellenemedi: ${msg}`);
    },
  });

  const confirmSelectionMut = useMutation({
    mutationFn: () => confirmBulletinSelection(bulletinId!),
    onSuccess: (res) => {
      if (res.warning_items.length > 0) {
        toast.warning(
          `${res.warning_items.length} haber daha önce kullanılmış (uyarı)`,
        );
      }
      toast.success(`Seçim onaylandı (${res.confirmed_count} haber)`);
      refetchBulletin();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Seçim onaylanamadı: ${msg}`);
    },
  });

  const consumeNewsMut = useMutation({
    mutationFn: () => consumeBulletinNews(bulletinId!),
    onSuccess: (res) => {
      toast.success(`${res.consumed_count} haber tüketildi — pipeline hazır`);
      refetchBulletin();
      setStep(2);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail || err?.message || "Bilinmeyen hata";
      toast.error(`Haber tüketimi başarısız: ${msg}`);
    },
  });

  // Wizard son adimi: alan guncelleme + uretim baslatma atomik tek call.
  // Eskiden updateBulletinMut + startProductionMut sirayla cagriliyordu; ikinci
  // call patlarsa bulten alanlari guncel, is baslatilmamis tutarsiz durumu
  // olusuyordu. Artik backend update-and-start-production endpoint'i iki adimi
  // tek transaction mantigiyla yurutur; dispatch patlarsa alan degisiklikleri
  // geri alinir.
  const startProductionMut = useMutation({
    mutationFn: () =>
      updateAndStartBulletinProduction(bulletinId!, {
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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["news-bulletins"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      refetchBulletin();
      refetchTrustCheck();
      toast.success(`Üretim başlatıldı — Job: ${res.job_id.slice(0, 8)}…`);
      if (contextContentProjectId) {
        navigate(`${baseRoute}/projects/${contextContentProjectId}`);
      } else {
        navigate(`${baseRoute}/jobs/${res.job_id}`);
      }
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail || err?.message || "Üretim başlatılamadı";
      toast.error(`Üretim hatası: ${detail}`);
    },
  });

  // ---- Navigation ----

  const canGoNext = useCallback(() => {
    if (step === 0) {
      if (!bulletinId) {
        return selectedItemsLocal.length > 0 && topic.trim().length > 0;
      }
      return selectedItems.length > 0;
    }
    if (step === 1) {
      return bulletin?.status === "in_progress";
    }
    if (step === 2) {
      if (
        trustCheck &&
        !trustCheck.pass_check &&
        trustEnforcementLevel === "block"
      ) {
        return false;
      }
    }
    return true;
  }, [
    step,
    bulletinId,
    topic,
    selectedItemsLocal,
    selectedItems,
    bulletin,
    trustCheck,
    trustEnforcementLevel,
  ]);

  // Faz 4.1 — disabled nedeni kullanıcıya açıkça söylensin (silent no-op
  // hissi ortadan kalksın). Hem title hem inline status ile.
  const nextDisabledReason = useCallback((): string | null => {
    if (step === 0) {
      if (!bulletinId) {
        if (selectedItemsLocal.length === 0 && topic.trim().length === 0) {
          return "Başlık girin ve en az bir haber seçin.";
        }
        if (selectedItemsLocal.length === 0) return "En az bir haber seçin.";
        if (topic.trim().length === 0) return "Bülten başlığı gerekli.";
      } else if (selectedItems.length === 0) {
        return "En az bir haber seçin.";
      }
    } else if (step === 1 && bulletin?.status !== "in_progress") {
      return "Taslak hazır değil — draft oluşturmayı bekleyin.";
    } else if (
      step === 2 &&
      trustCheck &&
      !trustCheck.pass_check &&
      trustEnforcementLevel === "block"
    ) {
      return "Kaynak güveni düşük — üretim bloklu.";
    }
    return null;
  }, [
    step,
    bulletinId,
    topic,
    selectedItemsLocal,
    selectedItems,
    bulletin,
    trustCheck,
    trustEnforcementLevel,
  ]);

  async function handleNext() {
    if (step === 0) {
      if (!bulletinId) {
        createBulletinMut.mutate();
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (bulletin?.status !== "in_progress") return;
      setStep(2);
    } else if (step === 2) {
      // Atomik başlat — backend guncelle+dispatch'i tek transaction mantiginda yurutur.
      startProductionMut.mutate();
    }
  }

  useEffect(() => {
    if (bulletinId && createBulletinMut.isSuccess) {
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulletinId, createBulletinMut.isSuccess]);

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  const isProcessing =
    createBulletinMut.isPending || startProductionMut.isPending;

  const nextLabel = (() => {
    if (step === 0 && !bulletinId)
      return createBulletinMut.isPending ? "Oluşturuluyor…" : "Bülten Oluştur";
    if (step === 2)
      return startProductionMut.isPending ? "Başlatılıyor…" : "Üretimi Başlat";
    return "Devam";
  })();

  const anyError =
    createBulletinMut.error ||
    startProductionMut.error ||
    confirmSelectionMut.error ||
    consumeNewsMut.error;

  const status = bulletin?.status ?? "draft";
  const totalSelected = bulletinId
    ? selectedItems.length
    : selectedItemsLocal.length;

  // ilerleme yüzdesi: 3 adımlı kaba ölçüm (CLAUDE.md "fake precision" uyarısı):
  // adım numarasından türetilir, başlangıç %5 ile gösterilir.
  const progressPct = step === 0 ? 5 : step === 1 ? 50 : 90;

  // ---- Inspector ----

  const inspector = (
    <AuroraInspector title="Sihirbaz">
      <AuroraInspectorSection title="İlerleme">
        <AuroraMeterTile
          label="aşama"
          value={`${step + 1}/${STEPS.length}`}
          footer={STEPS[step]?.label ?? "—"}
        />
        <div style={{ marginTop: 8 }}>
          <AuroraInspectorRow
            label="ilerleme"
            value={`%${progressPct}`}
          />
          <AuroraInspectorRow
            label="durum"
            value={
              <AuroraStatusChip tone={STATUS_TONE[status] ?? "neutral"}>
                {STATUS_LABEL[status] ?? status}
              </AuroraStatusChip>
            }
          />
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Aşama özeti">
        <AuroraInspectorRow
          label="bülten"
          value={bulletinId ? bulletinId.slice(0, 8) + "…" : "—"}
        />
        <AuroraInspectorRow label="konu" value={topic || "—"} />
        <AuroraInspectorRow label="dil" value={(language || "—").toUpperCase()} />
        <AuroraInspectorRow label="ton" value={tone || "—"} />
        <AuroraInspectorRow
          label="hedef sn"
          value={duration ? `${duration}s` : "—"}
        />
        <AuroraInspectorRow
          label="seçili haber"
          value={String(totalSelected)}
        />
      </AuroraInspectorSection>

      {step >= 2 && (
        <AuroraInspectorSection title="Stil seçimleri">
          <AuroraInspectorRow
            label="şablon"
            value={templateId ? templateId.slice(0, 8) + "…" : "—"}
          />
          <AuroraInspectorRow
            label="blueprint"
            value={
              styleBlueprintId ? styleBlueprintId.slice(0, 8) + "…" : "—"
            }
          />
          <AuroraInspectorRow
            label="kompozisyon"
            value={compositionDirection || "—"}
          />
          <AuroraInspectorRow
            label="thumbnail"
            value={thumbnailDirection || "—"}
          />
          <AuroraInspectorRow
            label="video modu"
            value={
              renderMode === "per_item"
                ? "Haber başına"
                : renderMode === "per_category"
                  ? "Kategori başına"
                  : "Tek video"
            }
          />
          <AuroraInspectorRow label="altyazı" value={subtitleStyle} />
          <AuroraInspectorRow label="alt bant" value={lowerThirdStyle} />
          <AuroraInspectorRow
            label="format"
            value={renderFormat === "portrait" ? "9:16 Shorts" : "16:9 Yatay"}
          />
          <AuroraInspectorRow
            label="karaoke"
            value={karaokeEnabled ? `Açık (${karaokeAnimPreset})` : "Kapalı"}
          />
          <AuroraInspectorRow
            label="güvenilirlik"
            value={trustEnforcementLevel}
          />
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  // ---- Render ----

  return (
    <div className="aurora-wizard">
      <div className="page">
        <nav className="breadcrumbs caption" aria-label="Konum">
          <span>
            <a
              href="/admin/news-bulletins"
              onClick={(e) => {
                e.preventDefault();
                navigate("/admin/news-bulletins");
              }}
            >
              News Bulletins
            </a>
            <span className="sep"> / </span>
          </span>
          <span>Wizard</span>
        </nav>

        <header className="page-head">
          <div>
            <h1>Haber Bülteni Oluştur</h1>
            <div className="sub">
              {bulletinId
                ? `Bülten ${bulletinId.slice(0, 8)}… · ${STATUS_LABEL[status] ?? status}`
                : "Yeni bülten · 3 adımlı sihirbaz"}
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/news-bulletins")}
            >
              İptal
            </AuroraButton>
          </div>
        </header>

        <div className="page-body">
          {/* Stepper */}
          <Stepper currentStep={step} />

          {/* Step 0: Source & news selection */}
          {step === 0 && (
            <AuroraCard pad="default">
              <h2 className="wizard-h2">{STEPS[0].label}</h2>
              <p className="wizard-sub">
                Önce haberleri seçin; sonra bülten ayarlarını tamamlayıp
                bülteni oluşturun.
              </p>

              {/* Filter bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dil</label>
                  <select
                    className="form-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kaynak</label>
                  <select
                    className="form-select"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                  >
                    <option value="">Tüm Kaynaklar</option>
                    {sourcesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Tüm Kategoriler</option>
                    {SOURCE_CATEGORIES.filter((c) => c !== "").map((cat) => (
                      <option key={cat} value={cat}>
                        {SOURCE_CATEGORY_LABELS[cat] ?? cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pre-bulletin: browse + local basket */}
              {!bulletinId && (
                <>
                  {selectedItemsLocal.length > 0 && (
                    <SectionHead
                      label={`Seçilen haberler (${selectedItemsLocal.length})`}
                    />
                  )}
                  {selectedItemsLocal.length > 0 && (
                    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                      {selectedItemsLocal.map((item, idx) => (
                        <SelectedItemRow
                          key={item.news_item_id}
                          index={idx}
                          title={item.title}
                          sourceName={item.source_name}
                          category={item.category}
                          categoryStyleMap={categoryStyleMap}
                          onRemove={() => removeLocalItem(item.news_item_id)}
                        />
                      ))}
                    </div>
                  )}

                  {selectedItemsLocal.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 12,
                        marginTop: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          Konu *
                        </label>
                        <input
                          className="form-input"
                          value={topic}
                          onChange={(e) => {
                            setTopic(e.target.value);
                            setTopicAutoSet(false);
                          }}
                          placeholder="Bültenin ana konusu"
                        />
                        {topicAutoSet && (
                          <div className="form-hint">
                            İlk seçilen haberden otomatik dolduruldu
                          </div>
                        )}
                      </div>
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ton</label>
                        <select
                          className="form-select"
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                        >
                          <option value="formal">Formal</option>
                          <option value="casual">Casual</option>
                          <option value="dramatic">Dramatic</option>
                          <option value="neutral">Neutral</option>
                        </select>
                      </div>
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label className="form-label">Hedef Süre (sn)</label>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="120"
                        />
                      </div>
                    </div>
                  )}

                  <SectionHead
                    label={`Mevcut haberler (${
                      browseItems.filter(
                        (ni) =>
                          !selectedItemsLocal.some(
                            (s) => s.news_item_id === ni.id,
                          ),
                      ).length
                    }${loadingBrowse ? " · yükleniyor…" : ""})`}
                  />
                  <div style={{ display: "grid", gap: 6 }}>
                    {browseItems.length === 0 && !loadingBrowse && (
                      <EmptyHint>Seçilebilir haber bulunamadı.</EmptyHint>
                    )}
                    {browseItems
                      .filter(
                        (ni) =>
                          !selectedItemsLocal.some(
                            (s) => s.news_item_id === ni.id,
                          ),
                      )
                      .slice(0, 30)
                      .map((item) => (
                        <BrowseItemRow
                          key={item.id}
                          item={item}
                          categoryStyleMap={categoryStyleMap}
                          onSelect={() => addLocalItem(item)}
                        />
                      ))}
                  </div>
                </>
              )}

              {/* Post-bulletin: server-driven selection (resume) */}
              {bulletinId && (
                <>
                  <SectionHead
                    label={`Seçili haberler (${selectedItems.length})`}
                  />
                  <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                    {selectedItems.map((it) => (
                      <SelectedItemRow
                        key={it.id}
                        index={it.sort_order}
                        title={it.news_title || it.news_item_id.slice(0, 12)}
                        sourceName={null}
                        category={it.news_category}
                        categoryStyleMap={categoryStyleMap}
                        onRemove={() => removeItemMut.mutate(it.id)}
                        warning={it.used_news_warning ?? undefined}
                      />
                    ))}
                  </div>

                  <SectionHead
                    label={`Mevcut haberler (${
                      selectableItems.filter(
                        (si) =>
                          !selectedItems.some(
                            (sel) => sel.news_item_id === si.id,
                          ),
                      ).length
                    }${loadingSelectable ? " · yükleniyor…" : ""})`}
                  />
                  <div style={{ display: "grid", gap: 6 }}>
                    {selectableItems.length === 0 && !loadingSelectable && (
                      <EmptyHint>Seçilebilir haber bulunamadı.</EmptyHint>
                    )}
                    {selectableItems
                      .filter(
                        (si) =>
                          !selectedItems.some(
                            (sel) => sel.news_item_id === si.id,
                          ),
                      )
                      .slice(0, 30)
                      .map((item) => (
                        <BrowseItemRow
                          key={item.id}
                          item={item}
                          categoryStyleMap={categoryStyleMap}
                          onSelect={() => addItemMut.mutate(item.id)}
                        />
                      ))}
                  </div>
                </>
              )}
            </AuroraCard>
          )}

          {/* Step 1: Editorial review */}
          {step === 1 && bulletinId && (
            <AuroraCard pad="default">
              <h2 className="wizard-h2">{STEPS[1].label}</h2>
              <p className="wizard-sub">
                Her haber için narration metnini düzenleyebilirsiniz. Düzenlenmiş
                narration pipeline'da korunur. Editorial gate geçtikten sonra
                üretim adımına geçilir.
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                {selectedItems.map((item, idx) => (
                  <NarrationEditCard
                    key={item.id}
                    item={item}
                    index={idx}
                    onSave={(n) =>
                      updateNarrationMut.mutate({
                        selectionId: item.id,
                        narration: n,
                      })
                    }
                    disabled={status !== "draft"}
                  />
                ))}
              </div>

              <div
                className="wizard-footer"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {status === "draft" && (
                  <AuroraButton
                    variant="primary"
                    size="sm"
                    onClick={() => confirmSelectionMut.mutate()}
                    disabled={
                      confirmSelectionMut.isPending ||
                      selectedItems.length === 0
                    }
                  >
                    {confirmSelectionMut.isPending
                      ? "Onaylanıyor…"
                      : "Seçimi Onayla"}
                  </AuroraButton>
                )}
                {status === "selection_confirmed" && (
                  <AuroraButton
                    variant="primary"
                    size="sm"
                    onClick={() => consumeNewsMut.mutate()}
                    disabled={consumeNewsMut.isPending}
                  >
                    {consumeNewsMut.isPending
                      ? "İşlem yapılıyor…"
                      : "Haberleri Tüket & Üretim Hazırla"}
                  </AuroraButton>
                )}
                {status === "in_progress" && (
                  <AuroraStatusChip tone="success">
                    Gate geçildi — devam edebilirsiniz
                  </AuroraStatusChip>
                )}
              </div>
            </AuroraCard>
          )}

          {/* Step 2: Style & production */}
          {step === 2 && bulletinId && (
            <AuroraCard pad="default">
              <h2 className="wizard-h2">{STEPS[2].label}</h2>
              <p className="wizard-sub">
                Stil tercihlerini gözden geçirin. Üretim başlatıldığında bu
                değerler bültene snapshot edilir.
              </p>

              <Field title="Stil Şablonu">
                <StyleBlueprintSelector
                  value={styleBlueprintId || null}
                  onChange={(id) => setStyleBlueprintId(id ?? "")}
                  moduleScope="news_bulletin"
                />
              </Field>

              <Field title="Kompozisyon Yönü">
                <CompositionDirectionPreview
                  selected={compositionDirection || undefined}
                  onSelect={(dir) => setCompositionDirection(dir)}
                />
              </Field>

              <Field title="Thumbnail Yönü">
                <ThumbnailDirectionPreview
                  selected={thumbnailDirection || undefined}
                  onSelect={(dir) => setThumbnailDirection(dir)}
                />
              </Field>

              <Field title="Şablon">
                <TemplateSelector
                  value={templateId || null}
                  onChange={(id) => setTemplateId(id ?? "")}
                  moduleScope="news_bulletin"
                />
              </Field>

              <Field title="Video Modu">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(
                    [
                      { value: "combined", label: "Tek Video" },
                      { value: "per_category", label: "Kategori Bazlı" },
                      { value: "per_item", label: "Haber Bazlı" },
                    ] as const
                  ).map((opt) => (
                    <AuroraButton
                      key={opt.value}
                      size="sm"
                      variant={
                        renderMode === opt.value ? "primary" : "secondary"
                      }
                      onClick={() => setRenderMode(opt.value)}
                    >
                      {opt.label}
                    </AuroraButton>
                  ))}
                </div>
                <div className="form-hint" style={{ marginTop: 6 }}>
                  {RENDER_MODE_DESCRIPTIONS[renderMode] || ""}
                </div>
                {(() => {
                  const newsCount = bulletinId
                    ? selectedItems.length
                    : selectedItemsLocal.length;
                  if (newsCount === 0) return null;
                  let outputLabel = "1 video";
                  if (renderMode === "per_item") {
                    outputLabel = `${newsCount} video (haber başına 1)`;
                  } else if (renderMode === "per_category") {
                    outputLabel = "Kategori sayısı kadar video";
                  }
                  return (
                    <div
                      className="form-hint"
                      style={{
                        marginTop: 4,
                        color: "var(--accent-primary-hover)",
                      }}
                    >
                      Tahmini çıktı: {outputLabel}
                    </div>
                  );
                })()}
              </Field>

              <Field title="Altyazı Stili">
                <SubtitleStylePicker
                  value={subtitleStyle}
                  onChange={(presetId) => setSubtitleStyle(presetId)}
                  presets={subtitlePresets}
                  loading={loadingPresets}
                  error={
                    presetsError instanceof Error
                      ? presetsError.message
                      : presetsError
                        ? String(presetsError)
                        : null
                  }
                />
              </Field>

              <Field title="Alt Bant Stili">
                <LowerThirdStylePreview
                  selected={lowerThirdStyle || undefined}
                  onSelect={(s) => setLowerThirdStyle(s)}
                />
              </Field>

              <Field title="Video Formatı">
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      {
                        value: "landscape",
                        label: "16:9 (Yatay)",
                        desc: "YouTube, TV",
                      },
                      {
                        value: "portrait",
                        label: "9:16 (Shorts)",
                        desc: "Shorts, Reels, TikTok",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRenderFormat(opt.value)}
                      className={
                        "module-card" +
                        (renderFormat === opt.value ? " selected" : "")
                      }
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      <div className="mc-name">{opt.label}</div>
                      <div className="mc-desc">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field title="Karaoke Altyazı">
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={karaokeEnabled}
                    onChange={(e) => setKaraokeEnabled(e.target.checked)}
                  />
                  Kelime bazlı karaoke highlight
                </label>
                <div className="form-hint" style={{ marginTop: 4 }}>
                  Açık: kelimeler konuşulan anda vurgulanır. Kapalı: standart
                  zamanlama.
                </div>
              </Field>

              {karaokeEnabled && (
                <Field title="Animasyon Stili">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {(
                      [
                        {
                          value: "hype",
                          label: "Hype",
                          desc: "Bounce + parlama",
                        },
                        {
                          value: "explosive",
                          label: "Explosive",
                          desc: "Ateş efekti + agresif scale",
                        },
                        {
                          value: "vibrant",
                          label: "Vibrant",
                          desc: "Renk kayması + dinamik",
                        },
                        {
                          value: "minimal",
                          label: "Minimal",
                          desc: "Sadece renk, animasyon yok",
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setKaraokeAnimPreset(opt.value)}
                        className={
                          "module-card" +
                          (karaokeAnimPreset === opt.value ? " selected" : "")
                        }
                        style={{ cursor: "pointer", textAlign: "left" }}
                      >
                        <div className="mc-name">{opt.label}</div>
                        <div className="mc-desc">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field title="Güvenilirlik Denetimi">
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      { value: "none", label: "Kontrol Yok" },
                      { value: "warn", label: "Uyarı Ver" },
                      { value: "block", label: "Engelle" },
                    ] as const
                  ).map((opt) => (
                    <AuroraButton
                      key={opt.value}
                      size="sm"
                      variant={
                        trustEnforcementLevel === opt.value
                          ? opt.value === "block"
                            ? "danger"
                            : "primary"
                          : "secondary"
                      }
                      onClick={() => setTrustEnforcementLevel(opt.value)}
                    >
                      {opt.label}
                    </AuroraButton>
                  ))}
                </div>
              </Field>

              {/* Category style suggestion */}
              {categoryStyleSuggestion && !suggestionDismissed && (
                <div
                  className="card card-pad"
                  style={{
                    background: "var(--state-info-bg)",
                    border: "1px solid var(--state-info-border)",
                    color: "var(--state-info-fg)",
                    margin: "12px 0",
                  }}
                >
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Baskın kategori:{" "}
                    <strong>
                      {categoryStyleSuggestion.dominant_category ??
                        categoryStyleSuggestion.category_used}
                    </strong>
                    {" → "}Önerilen stil:{" "}
                    <strong>
                      {categoryStyleSuggestion.suggested_subtitle_style}
                    </strong>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <AuroraButton
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSubtitleStyle(
                          categoryStyleSuggestion.suggested_subtitle_style,
                        );
                        setLowerThirdStyle(
                          categoryStyleSuggestion.suggested_lower_third_style,
                        );
                        setCompositionDirection(
                          categoryStyleSuggestion.suggested_composition_direction,
                        );
                        setSuggestionDismissed(true);
                      }}
                    >
                      Öneriyi Uygula
                    </AuroraButton>
                    <AuroraButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setSuggestionDismissed(true)}
                    >
                      Manuel seçim yapıyorum
                    </AuroraButton>
                  </div>
                </div>
              )}

              {/* Trust check */}
              {trustCheck && (
                <div
                  className="card card-pad"
                  style={{
                    margin: "12px 0",
                    background: !trustCheck.pass_check
                      ? "var(--state-danger-bg)"
                      : trustCheck.low_trust_items.length > 0
                        ? "var(--state-warning-bg)"
                        : "var(--state-success-bg)",
                    border: `1px solid ${
                      !trustCheck.pass_check
                        ? "var(--state-danger-border)"
                        : trustCheck.low_trust_items.length > 0
                          ? "var(--state-warning-border)"
                          : "var(--state-success-border)"
                    }`,
                    color: !trustCheck.pass_check
                      ? "var(--state-danger-fg)"
                      : trustCheck.low_trust_items.length > 0
                        ? "var(--state-warning-fg)"
                        : "var(--state-success-fg)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {!trustCheck.pass_check
                      ? "Güvenilirlik Engeli"
                      : trustCheck.low_trust_items.length > 0
                        ? "Güvenilirlik Uyarısı"
                        : "Tüm kaynaklar güvenilir"}
                  </div>
                  {trustCheck.message && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {trustCheck.message}
                    </div>
                  )}
                  {trustCheck.low_trust_items.map((it) => (
                    <div
                      key={it.news_item_id}
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      — {it.source_name} (düzey: {it.trust_level})
                    </div>
                  ))}
                </div>
              )}

              {bulletin?.status !== "in_progress" && (
                <div
                  className="form-hint"
                  style={{
                    color: "var(--state-warning-fg)",
                    marginTop: 12,
                  }}
                >
                  Üretim başlatmak için editorial gate geçilmiş olmalı (durum:
                  in_progress). Mevcut durum: {bulletin?.status}
                </div>
              )}
            </AuroraCard>
          )}

          {/* Wizard footer (shared) */}
          <div className="wizard-footer">
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={step === 0}
              iconLeft={<Icon name="chevron-left" size={12} />}
            >
              Geri
            </AuroraButton>
            <div style={{ flex: 1 }} />
            {anyError && (
              <span
                style={{
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  marginRight: 8,
                  maxWidth: 360,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={
                  anyError instanceof Error
                    ? anyError.message
                    : String(anyError)
                }
              >
                <Icon name="alert-circle" size={11} />{" "}
                {anyError instanceof Error
                  ? anyError.message
                  : String(anyError)}
              </span>
            )}
            {/* Faz 4.1 — disabled nedeni inline bildirim */}
            {nextDisabledReason() ? (
              <span
                role="status"
                aria-live="polite"
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
                data-testid="aurora-news-bulletin-next-hint"
              >
                {nextDisabledReason()}
              </span>
            ) : null}
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext() || isProcessing}
              title={nextDisabledReason() ?? undefined}
              iconRight={
                step === 2 ? (
                  <Icon name="zap" size={12} />
                ) : (
                  <Icon name="arrow-right" size={12} />
                )
              }
            >
              {nextLabel}
            </AuroraButton>
          </div>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stepper({ currentStep }: { currentStep: number }) {
  const stepState = (i: number): "done" | "active" | "pending" =>
    i < currentStep ? "done" : i === currentStep ? "active" : "pending";
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <div
          key={s.id}
          className="step-item-w"
          style={{ flex: i === STEPS.length - 1 ? "none" : 1 }}
        >
          <div className="step-col">
            <div className={"step-circle " + stepState(i)}>
              {i < currentStep ? <Icon name="check" size={14} /> : i + 1}
            </div>
            <div className={"step-label " + stepState(i)}>{s.label}</div>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={
                "step-conn " +
                (i < currentStep ? "done" : i === currentStep ? "active" : "")
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="form-field">
      <label className="form-label">{title}</label>
      {children}
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 6,
        marginTop: 12,
      }}
    >
      {label}
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        fontStyle: "italic",
        padding: "10px 0",
      }}
    >
      {children}
    </div>
  );
}

function StyleBadge({
  category,
  mapping,
}: {
  category: string | null | undefined;
  mapping: CategoryStyleMap;
}) {
  if (!category)
    return (
      <span
        style={{
          fontSize: 10,
          padding: "1px 6px",
          borderRadius: 4,
          background: "var(--bg-inset)",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        GS—
      </span>
    );
  const entry = mapping[category];
  if (!entry)
    return (
      <span
        style={{
          fontSize: 10,
          padding: "1px 6px",
          borderRadius: 4,
          background: "var(--bg-inset)",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        GS—
      </span>
    );
  return (
    <span
      style={{
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 4,
        backgroundColor: entry.accent + "22",
        color: entry.accent,
        fontWeight: 600,
      }}
    >
      {entry.label_tr}
    </span>
  );
}

function SelectedItemRow({
  index,
  title,
  sourceName,
  category,
  categoryStyleMap,
  onRemove,
  warning,
}: {
  index: number;
  title: string;
  sourceName?: string | null;
  category?: string | null;
  categoryStyleMap: CategoryStyleMap;
  onRemove: () => void;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        border: "1px solid var(--state-success-border)",
        background: "var(--state-success-bg)",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          marginRight: 8,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontWeight: 500 }}>
          #{index + 1} — {title}
        </span>
        {sourceName && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            ({sourceName})
          </span>
        )}
        <span style={{ marginLeft: 6 }}>
          <StyleBadge category={category} mapping={categoryStyleMap} />
        </span>
        {warning && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              color: "var(--state-warning-fg)",
            }}
          >
            (daha önce kullanılmış)
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        style={{
          fontSize: 11,
          color: "var(--state-danger-fg)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Kaldır
      </button>
    </div>
  );
}

interface BrowseItemShape {
  id: string;
  title: string;
  source_name?: string | null;
  category?: string | null;
  created_at?: string | null;
}

function BrowseItemRow({
  item,
  categoryStyleMap,
  onSelect,
}: {
  item: BrowseItemShape;
  categoryStyleMap: CategoryStyleMap;
  onSelect: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <div
          style={{
            color: "var(--text-primary)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title || "(başlıksız)"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
            flexWrap: "wrap",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {item.source_name && (
            <span style={{ color: "var(--accent-primary-hover)", fontWeight: 500 }}>
              {item.source_name}
            </span>
          )}
          <StyleBadge category={item.category} mapping={categoryStyleMap} />
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {timeAgo(item.created_at)} önce
          </span>
        </div>
      </div>
      <AuroraButton size="sm" variant="ghost" onClick={onSelect}>
        Seç
      </AuroraButton>
    </div>
  );
}

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
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: 14,
        background: "var(--bg-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          #{index + 1} — {item.news_title || item.news_item_id.slice(0, 12)}
          {item.news_category && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 400,
              }}
            >
              [{item.news_category}]
            </span>
          )}
        </span>
        {item.used_news_warning && (
          <span
            style={{ fontSize: 11, color: "var(--state-warning-fg)" }}
          >
            daha önce kullanılmış
          </span>
        )}
      </div>

      {item.selection_reason && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 6,
          }}
        >
          Seçim nedeni: {item.selection_reason}
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          Narration{" "}
          {item.edited_narration
            ? "(düzenlenmiş)"
            : "(henüz düzenlenmemiş)"}
        </div>
        {editing ? (
          <div style={{ display: "grid", gap: 6 }}>
            <textarea
              className="form-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Spiker narration metni..."
              autoFocus
              rows={4}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <AuroraButton
                size="sm"
                variant="primary"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
              >
                Kaydet
              </AuroraButton>
              <AuroraButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(item.edited_narration || "");
                  setEditing(false);
                }}
              >
                Vazgeç
              </AuroraButton>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-primary)",
                flex: 1,
              }}
            >
              {item.edited_narration || (
                <em style={{ color: "var(--text-muted)" }}>
                  Henüz düzenleme yapılmadı
                </em>
              )}
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  fontSize: 11,
                  color: "var(--accent-primary-hover)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                Düzenle
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-exports & type-only imports kept minimal — no extra surface state.
export type { NewsBulletinResponse };
