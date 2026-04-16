/**
 * CreateProductReviewWizardPage — PHASE AE: User-facing product review wizard.
 *
 * Flow:
 *   Step 0: ChannelProfile
 *   Step 1: ContentProject (moduleType="product_review")
 *   Step 2: Primary product (URL -> scrape -> confirm)
 *   Step 3: Options (template_type, duration, orientation, language, affiliate)
 *   Step 4: Review & submit
 *
 * On submit:
 *   - POST /product-reviews (creates the review row)
 *   - POST /product-reviews/{id}/start-production (kicks the pipeline)
 *   - Navigate to project detail page (preview/review lives there).
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WizardShell, type WizardStep } from "../../components/wizard/WizardShell";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/cn";
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

const STEPS: WizardStep[] = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "product", label: "Urun" },
  { id: "options", label: "Ayarlar" },
  { id: "review", label: "Onizleme" },
];

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

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

export function CreateProductReviewWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardState>(initialState);
  const [creatingProduct, setCreatingProduct] = useState(false);

  function set<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  const handleChannelSelect = useCallback(
    (id: string) => set("channelProfileId", id),
    [],
  );

  const handleProjectReady = useCallback((id: string) => {
    set("contentProjectId", id);
    setStep(2);
  }, []);

  // ---------- Product creation + scrape ----------
  async function handleScrapeProduct() {
    const url = values.productUrl.trim();
    if (!url) return;
    setCreatingProduct(true);
    set("scrapeError", null);
    try {
      // 1. create product (idempotent by canonical_url)
      const product = await createProduct({ source_url: url });
      // 2. best-effort scrape (inline, no job)
      try {
        await triggerProductScrape(product.id);
      } catch {
        // scrape fail ignored — user can still proceed with manual topic
      }
      // 3. re-fetch? createProduct already returned the row; if scrape
      //    succeeded server-side the data will be stale, but we read back via
      //    side effect of trigger on next call. Keep it simple: use returned.
      set("product", product);
      // default topic if empty
      if (!values.topic.trim()) {
        set(
          "topic",
          product.name ? `${product.name} incelemesi` : "Urun incelemesi",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set("scrapeError", msg);
    } finally {
      setCreatingProduct(false);
    }
  }

  // ---------- Submit ----------
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (v: WizardState) => {
      if (!v.product) throw new Error("Urun secilmedi");
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
      // Kick production pipeline immediately
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
      toast.success("Inceleme olusturuldu ve uretime gonderildi.");
      if (values.contentProjectId) {
        navigate(`/user/projects/${values.contentProjectId}`);
      } else {
        navigate("/user/projects");
      }
    },
  });

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
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      mutate(values);
    }
  }

  return (
    <WizardShell
      title="Yeni Urun Incelemesi"
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={handleNext}
      onCancel={() => navigate(-1)}
      nextDisabled={!canGoNext() || isPending}
      isLastStep={step === STEPS.length - 1}
      nextLabel={
        step === STEPS.length - 1
          ? isPending
            ? "Gonderiliyor..."
            : "Olustur ve Baslat"
          : undefined
      }
      testId="create-product-review-wizard"
    >
      {step === 0 && (
        <ChannelProfileStep
          selectedId={values.channelProfileId}
          onSelect={handleChannelSelect}
        />
      )}

      {step === 1 && values.channelProfileId && (
        <ContentProjectStep
          channelProfileId={values.channelProfileId}
          moduleType="product_review"
          existingProjectId={values.contentProjectId}
          onProjectReady={handleProjectReady}
        />
      )}

      {step === 2 && (
        <div className="space-y-3" data-testid="product-review-wizard-product-step">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Urun URL <span className="text-error-dark">*</span>
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={values.productUrl}
                onChange={(e) => set("productUrl", e.target.value)}
                placeholder="https://shop.example.com/urun"
                autoFocus
              />
              <button
                type="button"
                onClick={handleScrapeProduct}
                disabled={creatingProduct || !values.productUrl.trim()}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-sm border",
                  creatingProduct || !values.productUrl.trim()
                    ? "bg-neutral-100 text-neutral-400 border-border cursor-not-allowed"
                    : "bg-brand-600 text-white border-brand-700 hover:bg-brand-700",
                )}
                data-testid="scrape-product-btn"
              >
                {creatingProduct ? "Yukleniyor..." : "Yukle"}
              </button>
            </div>
            <p className="m-0 mt-1 text-[11px] text-neutral-500">
              URL'yi yapistirin; sistem otomatik olarak urun bilgilerini cekmeye calisir.
              Basarisiz olursa manuel bilgi girebilirsiniz.
            </p>
          </div>

          {values.scrapeError && (
            <div className="rounded-sm border border-warning-300 bg-warning-50 p-2 text-xs text-warning-900">
              Otomatik cekim basarisiz: {values.scrapeError}. Yine de devam edebilirsiniz.
            </div>
          )}

          {values.product && (
            <div
              className="rounded-md border border-border bg-surface-card p-3 space-y-1.5"
              data-testid="product-review-wizard-product-card"
            >
              <div className="flex items-start gap-3">
                {values.product.primary_image_url ? (
                  <img
                    src={values.product.primary_image_url}
                    alt={values.product.name}
                    className="w-16 h-16 object-cover rounded-sm border border-border-subtle"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-sm border border-border-subtle bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                    Gorsel yok
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
                    {values.product.name || "(isim yok)"}
                  </p>
                  <p className="m-0 text-xs text-neutral-500 truncate">
                    {values.product.brand || values.product.vendor || "\u2014"}
                  </p>
                  {values.product.current_price !== null && (
                    <p className="m-0 mt-1 text-xs text-neutral-700">
                      {values.product.current_price} {values.product.currency ?? ""}
                    </p>
                  )}
                  {values.product.parser_source && (
                    <p className="m-0 mt-1 text-[10px] text-neutral-400">
                      Kaynak: {values.product.parser_source}
                      {values.product.scrape_confidence !== null &&
                        values.product.scrape_confidence !== undefined && (
                          <> · guven: {Math.round(values.product.scrape_confidence * 100)}%</>
                        )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3" data-testid="product-review-wizard-options-step">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Konu <span className="text-error-dark">*</span>
            </label>
            <input
              className={inputCls}
              value={values.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="Ornegin: X urununun kutu acilimi ve ilk izlenim"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Sablon
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "single", label: "Tek Urun", desc: "Tek urunun detayli incelemesi" },
                  { value: "comparison", label: "Karsilastirma", desc: "Birden fazla urun kiyasi" },
                  { value: "alternatives", label: "Alternatifler", desc: "Benzer urun onerileri" },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("template_type", value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-center",
                    values.template_type === value
                      ? "bg-brand-50 text-brand-700 border-brand-400 ring-1 ring-brand-200"
                      : "bg-white text-neutral-600 border-border hover:bg-neutral-50",
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[11px] text-neutral-400">{desc}</span>
                </button>
              ))}
            </div>
            {values.template_type !== "single" && (
              <p className="m-0 mt-1 text-[11px] text-warning-700">
                Not: Karsilastirma/alternatif icin ek urunler su an eklenmiyor — v1'de
                tek urun uzerinden baslanir. Ek urunleri proje sayfasindan ekleyebilirsiniz.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Sure (sn)
              </label>
              <input
                className={inputCls}
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Dil
              </label>
              <select
                className={inputCls}
                value={values.language}
                onChange={(e) => set("language", e.target.value)}
              >
                <option value="tr">Turkce</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Yonlendirme
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "vertical", label: "9:16 (Shorts)", desc: "Reels, Shorts, TikTok" },
                  { value: "horizontal", label: "16:9 (Yatay)", desc: "YouTube standart" },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("orientation", value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-center",
                    values.orientation === value
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

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Uretim Modu
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "semi_auto", label: "Yari Otomatik", desc: "Review gate ile onay" },
                  { value: "full_auto", label: "Tam Otomatik", desc: "Otomatik yayina kadar" },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("run_mode", value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-3 py-3 border rounded-md cursor-pointer transition-colors text-center",
                    values.run_mode === value
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

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.affiliate_enabled}
                onChange={(e) => set("affiliate_enabled", e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-neutral-700">Affiliate baglantisi aktif</span>
            </label>
          </div>

          {values.affiliate_enabled && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Aciklama metni (opsiyonel)
              </label>
              <textarea
                className={cn(inputCls, "min-h-[60px] resize-y")}
                value={values.disclosure_text}
                onChange={(e) => set("disclosure_text", e.target.value)}
                placeholder="Bu video affiliate baglantisi icerir..."
              />
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div data-testid="product-review-wizard-review-step">
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Onizleme</h3>
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <ReviewRow
              label="Kanal"
              value={values.channelProfileId ? `...${values.channelProfileId.slice(-8)}` : ""}
            />
            <ReviewRow
              label="Proje"
              value={values.contentProjectId ? `...${values.contentProjectId.slice(-8)}` : ""}
            />
            <ReviewRow label="Urun" value={values.product?.name ?? ""} />
            <ReviewRow label="Konu" value={values.topic} />
            <ReviewRow label="Sablon" value={values.template_type} />
            <ReviewRow label="Sure" value={`${values.duration_seconds}s`} />
            <ReviewRow label="Dil" value={values.language} />
            <ReviewRow
              label="Format"
              value={values.orientation === "vertical" ? "9:16 (Shorts)" : "16:9 (Yatay)"}
            />
            <ReviewRow
              label="Mod"
              value={values.run_mode === "semi_auto" ? "Yari Otomatik" : "Tam Otomatik"}
            />
            <ReviewRow
              label="Affiliate"
              value={values.affiliate_enabled ? "Acik" : "Kapali"}
            />
          </div>
          {error && (
            <p className="text-error-dark text-sm mt-2 break-words [overflow-wrap:anywhere]">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          <p className="m-0 mt-2 text-[11px] text-neutral-500">
            Olustur ve Baslat'a tikladiginizda inceleme kaydi olusturulur ve uretim
            pipeline'ina gonderilir. Job ilerleme durumunu proje sayfasinda takip
            edebilirsiniz.
          </p>
        </div>
      )}
    </WizardShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="text-neutral-800">
        {value || <em className="text-neutral-300">{"\u2014"}</em>}
      </span>
    </div>
  );
}
