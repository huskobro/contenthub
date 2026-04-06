/**
 * M29 — News Bulletin Wizard Page
 *
 * 3-step wizard: kaynak/haber secimi → draft review / narration edit → stil & uretim
 *
 * Step 0: Bulletin olusturma + haber secimi
 * Step 1: Editorial review — inline narration duzenleme + gate
 * Step 2: Stil/preview secimleri + production baslatma
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WizardShell, type WizardStep } from "../../components/wizard/WizardShell";
import { CompositionDirectionPreview } from "../../components/preview/CompositionDirectionPreview";
import { ThumbnailDirectionPreview } from "../../components/preview/ThumbnailDirectionPreview";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { TemplateSelector } from "../../components/preview/TemplateSelector";
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
} from "../../api/newsBulletinApi";

const STEPS: WizardStep[] = [
  { id: "source", label: "Kaynak & Haber" },
  { id: "review", label: "Draft & Review" },
  { id: "style", label: "Stil & Uretim" },
];

const inputCls =
  "block w-full px-2 py-1.5 text-sm border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

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

  const [step, setStep] = useState(0);
  const [bulletinId, setBulletinId] = useState<string | null>(resumeId);

  // Step 0 state
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [language, setLanguage] = useState("tr");
  const [tone, setTone] = useState("formal");
  const [duration, setDuration] = useState("120");

  // Step 2 state
  const [compositionDirection, setCompositionDirection] = useState("");
  const [thumbnailDirection, setThumbnailDirection] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [styleBlueprintId, setStyleBlueprintId] = useState("");

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
      setTitle(bulletin.title || "");
      setBrief(bulletin.brief || "");
      setLanguage(bulletin.language || "tr");
      setTone(bulletin.tone || "formal");
      setDuration(String(bulletin.target_duration_seconds || 120));
      setCompositionDirection(bulletin.composition_direction || "");
      setThumbnailDirection(bulletin.thumbnail_direction || "");
      setTemplateId(bulletin.template_id || "");
      setStyleBlueprintId(bulletin.style_blueprint_id || "");

      // Auto-advance based on status
      if (bulletin.status === "selection_confirmed" || bulletin.status === "in_progress") {
        setStep(2);
      } else if (bulletin.status === "draft" && (bulletin.selected_news_count ?? 0) > 0) {
        setStep(1);
      }
    }
  }, [bulletin]);

  // Selectable news items
  const { data: selectableItems = [], isLoading: loadingSelectable } = useQuery({
    queryKey: ["selectable-news", bulletinId, language],
    queryFn: () => fetchSelectableNewsItems(bulletinId!, { language: language || undefined }),
    enabled: !!bulletinId,
  });

  // Selected items
  const { data: selectedItems = [], refetch: refetchSelected } = useQuery({
    queryKey: ["bulletin-selected", bulletinId],
    queryFn: () => fetchNewsBulletinSelectedItems(bulletinId!),
    enabled: !!bulletinId,
  });

  // --- Mutations ---

  const createBulletinMut = useMutation({
    mutationFn: () =>
      createNewsBulletin({
        topic: topic.trim(),
        title: title.trim() || undefined,
        brief: brief.trim() || undefined,
        target_duration_seconds: duration ? Number(duration) : null,
        language: language || "tr",
        tone: tone || "formal",
        status: "draft",
      }),
    onSuccess: (created) => {
      setBulletinId(created.id);
      toast.success("Bulten olusturuldu");
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
  });

  const removeItemMut = useMutation({
    mutationFn: (selectionId: string) =>
      deleteNewsBulletinSelectedItem(bulletinId!, selectionId),
    onSuccess: () => {
      refetchSelected();
      refetchBulletin();
    },
  });

  const updateNarrationMut = useMutation({
    mutationFn: ({ selectionId, narration }: { selectionId: string; narration: string }) =>
      updateNewsBulletinSelectedItem(bulletinId!, selectionId, {
        edited_narration: narration || null,
      }),
    onSuccess: () => refetchSelected(),
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
  });

  const consumeNewsMut = useMutation({
    mutationFn: () => consumeBulletinNews(bulletinId!),
    onSuccess: (res) => {
      toast.success(`${res.consumed_count} haber tuketildi — pipeline hazir`);
      refetchBulletin();
    },
  });

  const updateBulletinMut = useMutation({
    mutationFn: () =>
      updateNewsBulletin(bulletinId!, {
        composition_direction: compositionDirection || null,
        thumbnail_direction: thumbnailDirection || null,
        template_id: templateId || null,
        style_blueprint_id: styleBlueprintId || null,
      }),
    onSuccess: () => refetchBulletin(),
  });

  const startProductionMut = useMutation({
    mutationFn: () => startBulletinProduction(bulletinId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["news-bulletins"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(`Uretim baslatildi — Job: ${res.job_id.slice(0, 8)}...`);
      navigate(`/admin/jobs/${res.job_id}`);
    },
  });

  // --- Navigation logic ---

  const canGoNext = useCallback(() => {
    if (step === 0) {
      if (!bulletinId) return topic.trim().length > 0;
      return selectedItems.length > 0;
    }
    if (step === 1) {
      return bulletin?.status === "in_progress";
    }
    return true;
  }, [step, bulletinId, topic, selectedItems, bulletin]);

  async function handleNext() {
    if (step === 0) {
      // Create bulletin if not exists
      if (!bulletinId) {
        createBulletinMut.mutate();
        return; // Stay on step 0, bulletin will be created, then user selects news
      }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Save style choices then start production
      await updateBulletinMut.mutateAsync();
      startProductionMut.mutate();
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  const isProcessing =
    createBulletinMut.isPending ||
    startProductionMut.isPending ||
    updateBulletinMut.isPending;

  const getNextLabel = () => {
    if (step === 0 && !bulletinId) return "Bulten Olustur";
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
      {/* Step 0: Source & News Selection                                    */}
      {/* ----------------------------------------------------------------- */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Bulletin basics — only if not yet created */}
          {!bulletinId && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Konu <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Bultenin ana konusu"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Dil</label>
                  <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="tr">Turkce</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Ton</label>
                  <input className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="formal" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Hedef Sure (sn)</label>
                <input className={inputCls} type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="120" />
              </div>
            </div>
          )}

          {/* News selection — only if bulletin exists */}
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
                      className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm"
                    >
                      <span className="text-neutral-800 truncate flex-1 mr-2">
                        #{item.sort_order + 1} — {item.news_item_id.slice(0, 8)}...
                        {item.used_news_warning && (
                          <span className="ml-1 text-amber-600 text-xs">(daha once kullanilmis)</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItemMut.mutate(item.id)}
                        className="text-xs text-red-500 bg-transparent border-none cursor-pointer hover:text-red-700"
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
                  Mevcut Haberler {loadingSelectable && "(yukleniyor...)"}
                </p>
                {selectableItems.length === 0 && !loadingSelectable && (
                  <p className="text-sm text-neutral-400 italic">Secilebilir haber bulunamadi.</p>
                )}
                {selectableItems
                  .filter((si) => !selectedItems.some((sel) => sel.news_item_id === si.id))
                  .slice(0, 20)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      <div className="flex-1 mr-2 min-w-0">
                        <span className="text-neutral-800 font-medium truncate block">{item.title || "(basliksiz)"}</span>
                        {item.summary && (
                          <span className="text-neutral-400 text-xs truncate block">{item.summary.slice(0, 100)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => addItemMut.mutate(item.id)}
                        className="text-xs text-blue-600 bg-transparent border-none cursor-pointer hover:text-blue-800 whitespace-nowrap"
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

          {/* Production summary */}
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <p className="m-0 font-medium text-neutral-700">Uretim Ozeti</p>
            <SummaryRow label="Konu" value={bulletin?.topic || topic} />
            <SummaryRow label="Durum" value={bulletin?.status || "—"} />
            <SummaryRow label="Secili Haber" value={String(selectedItems.length)} />
            <SummaryRow label="Dil" value={bulletin?.language || language} />
            <SummaryRow label="Ton" value={bulletin?.tone || tone} />
            <SummaryRow label="Kompozisyon" value={compositionDirection || "—"} />
            <SummaryRow label="Thumbnail" value={thumbnailDirection || "—"} />
          </div>

          {bulletin?.status !== "in_progress" && (
            <p className="text-amber-600 text-xs">
              Uretim baslatmak icin editorial gate gecilmis olmali (durum: in_progress).
              Mevcut durum: {bulletin?.status}
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {anyError && (
        <p className="text-red-600 text-sm mt-2 break-words [overflow-wrap:anywhere]">
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
                : "bg-amber-500 text-white cursor-pointer hover:bg-amber-600",
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
                : "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600",
            )}
          >
            {isConsuming ? "Islem yapiliyor..." : "Haberleri Tuket & Uretim Hazirla"}
          </button>
        )}

        {status === "in_progress" && (
          <span className="text-emerald-600 text-sm font-medium">
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
          #{index + 1} — {item.news_item_id.slice(0, 12)}...
        </span>
        {item.used_news_warning && (
          <span className="text-xs text-amber-500">daha once kullanilmis</span>
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
                className="text-xs text-blue-600 bg-transparent border-none cursor-pointer hover:text-blue-800 whitespace-nowrap"
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
    selection_confirmed: "bg-amber-100 text-amber-700",
    in_progress: "bg-emerald-100 text-emerald-700",
    rendering: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
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
