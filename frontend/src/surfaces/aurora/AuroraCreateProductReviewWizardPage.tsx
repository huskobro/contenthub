/**
 * AuroraCreateProductReviewWizardPage — kullanıcı tarafı ürün incelemesi wizard'ı.
 *
 * Legacy `pages/user/CreateProductReviewWizardPage.tsx` ile birebir aynı 5-adım akış:
 *   - 0: Kanal
 *   - 1: Proje (moduleType=product_review)
 *   - 2: Ürün (URL → scrape → confirm)
 *   - 3: Ayarlar (template_type, dil, orientation, süre, run_mode, affiliate)
 *   - 4: Önizleme + submit (createProductReview + startProductReviewProduction)
 *
 * Sadece kabuk Aurora: AuroraPageShell + AuroraCard + AuroraInspector +
 * AuroraButton. Form bileşenleri ChannelProfileStep / ContentProjectStep
 * legacy implementasyondan birebir aynı.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AuroraPageShell,
  AuroraCard,
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { useToast } from "../../hooks/useToast";
import {
  createProduct,
  triggerProductScrape,
  createProductReview,
  startProductReviewProduction,
  type ProductResponse,
  type ProductReviewTemplateType,
  type ProductReviewOrientation,
  type ProductReviewRunMode,
} from "../../api/productReviewApi";

const STEPS = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "product", label: "Ürün" },
  { id: "options", label: "Ayarlar" },
  { id: "review", label: "Önizleme" },
] as const;

interface WizardState {
  channelProfileId: string | null;
  contentProjectId: string | null;
  productUrl: string;
  product: ProductResponse | null;
  scrapeError: string | null;
  topic: string;
  template_type: ProductReviewTemplateType;
  language: string;
  orientation: ProductReviewOrientation;
  duration_seconds: number;
  run_mode: ProductReviewRunMode;
  affiliate_enabled: boolean;
  disclosure_text: string;
}

const initialState: WizardState = {
  channelProfileId: null,
  contentProjectId: null,
  productUrl: "",
  product: null,
  scrapeError: null,
  topic: "",
  template_type: "single",
  language: "tr",
  orientation: "vertical",
  duration_seconds: 60,
  run_mode: "semi_auto",
  affiliate_enabled: false,
  disclosure_text: "",
};

const FIELD_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 6,
};

const INPUT_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--border-default)",
  borderRadius: 6,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? `…${id.slice(-8)}` : id;
}

export function AuroraCreateProductReviewWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const presetChannelProfileId = searchParams.get("channelProfileId");
  const presetContentProjectId = searchParams.get("contentProjectId");

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardState>({
    ...initialState,
    channelProfileId: presetChannelProfileId,
    contentProjectId: presetContentProjectId,
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    if (presetChannelProfileId && presetContentProjectId) setStep(2);
    else if (presetChannelProfileId) setStep(1);
  }, [presetChannelProfileId, presetContentProjectId]);

  function set<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleScrapeProduct() {
    const url = values.productUrl.trim();
    if (!url) return;
    setCreatingProduct(true);
    set("scrapeError", null);
    try {
      const product = await createProduct({ source_url: url });
      try {
        await triggerProductScrape(product.id);
      } catch {
        // best-effort: scrape başarısız olsa bile ürün ile devam edebiliriz
      }
      set("product", product);
      if (!values.topic.trim()) {
        set(
          "topic",
          product.name ? `${product.name} incelemesi` : "Ürün incelemesi",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set("scrapeError", msg);
    } finally {
      setCreatingProduct(false);
    }
  }

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (v: WizardState) => {
      if (!v.product) throw new Error("Ürün seçilmedi");
      const review = await createProductReview({
        topic: v.topic.trim(),
        template_type: v.template_type,
        primary_product_id: v.product.id,
        secondary_product_ids: [],
        language: v.language,
        orientation: v.orientation,
        duration_seconds: v.duration_seconds,
        run_mode: v.run_mode,
        affiliate_enabled: v.affiliate_enabled,
        disclosure_text: v.disclosure_text.trim() || undefined,
      });
      await startProductReviewProduction(review.id, {
        content_project_id: v.contentProjectId ?? undefined,
        channel_profile_id: v.channelProfileId ?? undefined,
      });
      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-reviews"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("İnceleme oluşturuldu ve üretime gönderildi.");
      if (values.contentProjectId) {
        navigate(`/user/projects/${values.contentProjectId}`);
      } else {
        navigate("/user/projects");
      }
    },
  });

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return !!values.channelProfileId;
      case 1:
        return !!values.contentProjectId;
      case 2:
        return !!values.product;
      case 3:
        return values.topic.trim().length >= 3;
      case 4:
        return !!values.product && values.topic.trim().length >= 3;
      default:
        return true;
    }
  }

  function handleNext() {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    mutate(values);
  }

  function handleBack() {
    if (isFirst) {
      navigate("/user/projects");
      return;
    }
    setStep(step - 1);
  }

  let stepContent: ReactNode = null;
  if (step === 0) {
    stepContent = (
      <ChannelProfileStep
        selectedId={values.channelProfileId}
        onSelect={(id) => set("channelProfileId", id)}
      />
    );
  } else if (step === 1 && values.channelProfileId) {
    stepContent = (
      <ContentProjectStep
        channelProfileId={values.channelProfileId}
        moduleType="product_review"
        existingProjectId={values.contentProjectId}
        onProjectReady={(id) => {
          set("contentProjectId", id);
          setStep(2);
        }}
      />
    );
  } else if (step === 2) {
    stepContent = (
      <div style={{ display: "grid", gap: 14 }} data-testid="aurora-product-review-step-product">
        <div>
          <span style={FIELD_LABEL}>
            Ürün URL <span style={{ color: "var(--state-danger-fg, #f87171)" }}>*</span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={INPUT_STYLE}
              value={values.productUrl}
              onChange={(e) => set("productUrl", e.target.value)}
              placeholder="https://shop.example.com/urun"
              autoFocus
            />
            <AuroraButton
              variant="primary"
              size="sm"
              onClick={handleScrapeProduct}
              disabled={creatingProduct || !values.productUrl.trim()}
              data-testid="aurora-product-scrape-btn"
            >
              {creatingProduct ? "Yükleniyor…" : "Yükle"}
            </AuroraButton>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
            URL'yi yapıştırın; sistem otomatik olarak ürün bilgilerini çekmeye çalışır.
            Başarısız olursa manuel bilgi girebilirsiniz.
          </p>
        </div>

        {values.scrapeError && (
          <AuroraCard pad="tight">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AuroraStatusChip tone="warning">uyarı</AuroraStatusChip>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Otomatik çekim başarısız: {values.scrapeError}. Yine de devam edebilirsiniz.
              </span>
            </div>
          </AuroraCard>
        )}

        {values.product && (
          <AuroraCard pad="default" data-testid="aurora-product-review-product-card">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {values.product.primary_image_url ? (
                <img
                  src={values.product.primary_image_url}
                  alt={values.product.name}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  Görsel yok
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {values.product.name || "(isim yok)"}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {values.product.brand || values.product.vendor || "—"}
                </p>
                {values.product.current_price !== null && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                    {values.product.current_price} {values.product.currency ?? ""}
                  </p>
                )}
                {values.product.parser_source && (
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
                    Kaynak: {values.product.parser_source}
                    {values.product.scrape_confidence !== null &&
                      values.product.scrape_confidence !== undefined && (
                        <> · güven: {Math.round(values.product.scrape_confidence * 100)}%</>
                      )}
                  </p>
                )}
              </div>
            </div>
          </AuroraCard>
        )}
      </div>
    );
  } else if (step === 3) {
    stepContent = (
      <div style={{ display: "grid", gap: 16 }} data-testid="aurora-product-review-step-options">
        <div>
          <span style={FIELD_LABEL}>
            Konu <span style={{ color: "var(--state-danger-fg, #f87171)" }}>*</span>
          </span>
          <input
            style={INPUT_STYLE}
            value={values.topic}
            onChange={(e) => set("topic", e.target.value)}
            placeholder="Örneğin: X ürününün kutu açılımı ve ilk izlenim"
          />
        </div>

        <div>
          <span style={FIELD_LABEL}>Şablon</span>
          <ChoiceGrid
            cols={3}
            value={values.template_type}
            onChange={(v) => set("template_type", v as ProductReviewTemplateType)}
            options={[
              { value: "single", label: "Tek Ürün", desc: "Tek ürünün detaylı incelemesi" },
              { value: "comparison", label: "Karşılaştırma", desc: "Birden fazla ürün kıyası" },
              { value: "alternatives", label: "Alternatifler", desc: "Benzer ürün önerileri" },
            ]}
          />
          {values.template_type !== "single" && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--state-warning-fg, #f59e0b)" }}>
              Not: Karşılaştırma/alternatif için ek ürünler şu an eklenmiyor — v1'de tek
              ürün üzerinden başlanır. Ek ürünleri proje sayfasından ekleyebilirsiniz.
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <span style={FIELD_LABEL}>Süre (sn)</span>
            <input
              style={INPUT_STYLE}
              type="number"
              min={30}
              max={600}
              value={values.duration_seconds}
              onChange={(e) =>
                set(
                  "duration_seconds",
                  Math.max(30, Math.min(600, Number(e.target.value) || 60)),
                )
              }
            />
          </div>
          <div>
            <span style={FIELD_LABEL}>Dil</span>
            <select
              style={INPUT_STYLE}
              value={values.language}
              onChange={(e) => set("language", e.target.value)}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div>
          <span style={FIELD_LABEL}>Yönlendirme</span>
          <ChoiceGrid
            cols={2}
            value={values.orientation}
            onChange={(v) => set("orientation", v as ProductReviewOrientation)}
            options={[
              { value: "vertical", label: "9:16 (Shorts)", desc: "Reels, Shorts, TikTok" },
              { value: "horizontal", label: "16:9 (Yatay)", desc: "YouTube standart" },
            ]}
          />
        </div>

        <div>
          <span style={FIELD_LABEL}>Üretim Modu</span>
          <ChoiceGrid
            cols={2}
            value={values.run_mode}
            onChange={(v) => set("run_mode", v as ProductReviewRunMode)}
            options={[
              { value: "semi_auto", label: "Yarı Otomatik", desc: "Review gate ile onay" },
              { value: "full_auto", label: "Tam Otomatik", desc: "Otomatik yayına kadar" },
            ]}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={values.affiliate_enabled}
            onChange={(e) => set("affiliate_enabled", e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--accent-primary, #6366f1)" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
            Affiliate bağlantısı aktif
          </span>
        </label>

        {values.affiliate_enabled && (
          <div>
            <span style={FIELD_LABEL}>Açıklama metni (opsiyonel)</span>
            <textarea
              style={{ ...INPUT_STYLE, minHeight: 60, resize: "vertical" }}
              value={values.disclosure_text}
              onChange={(e) => set("disclosure_text", e.target.value)}
              placeholder="Bu video affiliate bağlantısı içerir…"
            />
          </div>
        )}
      </div>
    );
  } else if (step === 4) {
    stepContent = (
      <div style={{ display: "grid", gap: 12 }} data-testid="aurora-product-review-step-review">
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Önizleme
        </h3>
        <AuroraCard pad="default">
          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <KeyValue k="Kanal" v={shortId(values.channelProfileId)} mono />
            <KeyValue k="Proje" v={shortId(values.contentProjectId)} mono />
            <KeyValue k="Ürün" v={values.product?.name ?? "—"} />
            <KeyValue k="Konu" v={values.topic || "—"} />
            <KeyValue k="Şablon" v={values.template_type} />
            <KeyValue k="Süre" v={`${values.duration_seconds}s`} />
            <KeyValue k="Dil" v={values.language} />
            <KeyValue
              k="Format"
              v={values.orientation === "vertical" ? "9:16 (Shorts)" : "16:9 (Yatay)"}
            />
            <KeyValue
              k="Mod"
              v={values.run_mode === "semi_auto" ? "Yarı Otomatik" : "Tam Otomatik"}
            />
            <KeyValue k="Affiliate" v={values.affiliate_enabled ? "Açık" : "Kapalı"} />
          </div>
        </AuroraCard>
        {error && (
          <AuroraCard pad="tight">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AuroraStatusChip tone="danger">hata</AuroraStatusChip>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--state-danger-fg, #f87171)",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {error instanceof Error ? error.message : String(error)}
              </span>
            </div>
          </AuroraCard>
        )}
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
          “Oluştur ve Başlat”a tıkladığınızda inceleme kaydı oluşturulur ve üretim
          pipeline'ına gönderilir. Job ilerleme durumunu proje sayfasında takip
          edebilirsiniz.
        </p>
      </div>
    );
  }

  const inspector = (
    <AuroraInspector title="İnceleme planı">
      <AuroraInspectorSection title="Adım">
        <AuroraInspectorRow
          label="mevcut"
          value={`${step + 1} / ${STEPS.length} — ${STEPS[step].label}`}
        />
        <AuroraInspectorRow
          label="modül"
          value={<AuroraStatusChip tone="info">product_review</AuroraStatusChip>}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Bağlam">
        <AuroraInspectorRow label="kanal" value={shortId(values.channelProfileId)} />
        <AuroraInspectorRow label="proje" value={shortId(values.contentProjectId)} />
        <AuroraInspectorRow
          label="ürün"
          value={values.product?.name ? values.product.name.slice(0, 24) : "—"}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Çıktı">
        <AuroraInspectorRow label="şablon" value={values.template_type} />
        <AuroraInspectorRow label="süre" value={`${values.duration_seconds}s`} />
        <AuroraInspectorRow
          label="format"
          value={values.orientation === "vertical" ? "9:16" : "16:9"}
        />
        <AuroraInspectorRow label="dil" value={values.language} />
        <AuroraInspectorRow
          label="mod"
          value={
            <AuroraStatusChip tone={values.run_mode === "full_auto" ? "warning" : "success"}>
              {values.run_mode === "full_auto" ? "tam-oto" : "yarı-oto"}
            </AuroraStatusChip>
          }
        />
        <AuroraInspectorRow
          label="affiliate"
          value={
            <AuroraStatusChip tone={values.affiliate_enabled ? "info" : "neutral"}>
              {values.affiliate_enabled ? "açık" : "kapalı"}
            </AuroraStatusChip>
          }
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-create-product-review-wizard">
      <AuroraPageShell
        title="Yeni Ürün İncelemesi"
        description="Kanal → proje → ürün → ayarlar → önizleme & başlat"
        breadcrumbs={[
          { label: "Projelerim", href: "/user/projects" },
          { label: "Yeni İnceleme" },
        ]}
        actions={
          <AuroraButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
            İptal
          </AuroraButton>
        }
      >
        <Stepper steps={STEPS} current={step} />

        <AuroraCard pad="default" data-testid={`aurora-product-review-step-${STEPS[step].id}`}>
          {stepContent}
        </AuroraCard>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            iconLeft={<Icon name="chevron-left" size={12} />}
          >
            Geri
          </AuroraButton>
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext() || isPending}
            iconRight={!isLast ? <Icon name="arrow-right" size={12} /> : undefined}
            data-testid="aurora-product-review-next"
          >
            {isLast
              ? isPending
                ? "Gönderiliyor…"
                : "Oluştur ve Başlat"
              : "Devam et"}
          </AuroraButton>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

interface KeyValueProps {
  k: string;
  v: string;
  mono?: boolean;
}

function KeyValue({ k, v, mono }: KeyValueProps) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ width: 110, color: "var(--text-muted)", flexShrink: 0 }}>{k}</span>
      <span
        style={{
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono, ui-monospace, monospace)" : "inherit",
          fontSize: mono ? 11 : 12,
        }}
      >
        {v}
      </span>
    </div>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
  desc: string;
}

interface ChoiceGridProps {
  cols: number;
  value: string;
  onChange: (v: string) => void;
  options: readonly ChoiceOption[];
}

function ChoiceGrid({ cols, value, onChange, options }: ChoiceGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 10px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "center",
              border: active
                ? "1px solid var(--accent-primary, var(--border-strong, #6366f1))"
                : "1px solid var(--border-default)",
              background: active
                ? "var(--accent-bg, var(--bg-elevated))"
                : "var(--bg-surface)",
              color: active
                ? "var(--accent-primary, var(--text-primary))"
                : "var(--text-secondary)",
              transition: "background 120ms ease, border-color 120ms ease",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StepperProps {
  steps: readonly { id: string; label: string }[];
  current: number;
}

function Stepper({ steps, current }: StepperProps) {
  return (
    <ol
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        margin: "0 0 16px",
        padding: 0,
        listStyle: "none",
      }}
      data-testid="aurora-product-review-stepper"
    >
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              border: "1px solid var(--border-default)",
              background: active
                ? "var(--accent-bg, var(--bg-elevated))"
                : done
                  ? "var(--bg-elevated)"
                  : "transparent",
              color: active
                ? "var(--accent-primary, var(--text-primary))"
                : done
                  ? "var(--text-secondary)"
                  : "var(--text-muted)",
            }}
            aria-current={active ? "step" : undefined}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: active
                  ? "var(--accent-primary, var(--bg-elevated))"
                  : done
                    ? "var(--state-success-bg, var(--bg-elevated))"
                    : "var(--bg-surface)",
                color:
                  active || done ? "var(--text-inverse, white)" : "var(--text-muted)",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-default)",
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
