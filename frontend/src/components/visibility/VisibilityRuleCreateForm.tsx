import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisibilityRule, type VisibilityRuleCreate } from "../../api/visibilityApi";
import {
  filterTargetCatalog,
  flattenTargetCatalog,
  type VisibilityTargetOption,
} from "./visibilityTargetCatalog";

interface VisibilityRuleCreateFormProps {
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

const RULE_TYPE_OPTIONS = [
  { value: "page", label: "Sayfa" },
  { value: "widget", label: "Widget / Bileşen" },
  { value: "field", label: "Alan (Field)" },
  { value: "wizard_step", label: "Wizard Adımı" },
  { value: "panel", label: "Panel" },
];

const MODULE_OPTIONS = [
  { value: "", label: "Tümü (modül sınırı yok)" },
  { value: "standard_video", label: "Standart Video" },
  { value: "news_bulletin", label: "Haber Bülteni" },
];

const ROLE_OPTIONS = [
  { value: "", label: "Tümü (rol sınırı yok)" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "Kullanıcı" },
];

export function VisibilityRuleCreateForm({ onSuccess, onCancel }: VisibilityRuleCreateFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    rule_type: string;
    target_key: string;
    module_scope: string;
    role_scope: string;
    visible: boolean;
    read_only: boolean;
    wizard_visible: boolean;
    priority: number;
    notes: string;
  }>({
    rule_type: "page",
    target_key: "",
    module_scope: "",
    role_scope: "",
    visible: true,
    read_only: false,
    wizard_visible: false,
    priority: 100,
    notes: "",
  });

  // Target picker state — browse-first UX.
  //
  // The free-text input stays available (`manualMode`) so admins can still
  // type a key that isn't in the catalog yet. This keeps the form a proper
  // superset of the old one: nothing that worked before breaks.
  const [targetQuery, setTargetQuery] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const filteredGroups = useMemo(
    () => filterTargetCatalog(targetQuery),
    [targetQuery],
  );
  const selectedCatalogEntry = useMemo(() => {
    if (!form.target_key) return null;
    return (
      flattenTargetCatalog().find((o) => o.key === form.target_key) ?? null
    );
  }, [form.target_key]);

  function selectCatalogOption(opt: VisibilityTargetOption) {
    setForm((p) => ({
      ...p,
      target_key: opt.key,
      // The catalog entry knows the canonical rule_type; syncing here
      // means admins don't have to re-pick it manually.
      rule_type: opt.rule_type,
    }));
    setManualMode(false);
  }

  const mut = useMutation({
    mutationFn: (payload: VisibilityRuleCreate) => createVisibilityRule(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["visibility-rules"] });
      onSuccess?.(data.id);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.target_key.trim()) return;
    mut.mutate({
      rule_type: form.rule_type,
      target_key: form.target_key.trim(),
      module_scope: form.module_scope || null,
      role_scope: form.role_scope || null,
      visible: form.visible,
      read_only: form.read_only,
      wizard_visible: form.wizard_visible,
      priority: form.priority,
      notes: form.notes || null,
      status: "active",
    });
  }

  // Shared Tailwind class strings. Every colour here comes from
  // tema-semantic tokens so the form is legible under Chalk/Obsidian/Sand/
  // Midnight without per-tema overrides. (design-tokens-guide.md)
  //
  // Rules applied:
  //  - inputs/selects: bg-neutral-0 (tema arka plan) + text-neutral-900
  //  - cards/lists: bg-neutral-0 surface, bg-neutral-100 for inset headers
  //  - secondary text: text-neutral-600 (body) / text-neutral-500 (muted)
  //  - no bg-white, no bg-brand-50 (light-mode sabitleri) — seçili satır
  //    için bg-info-light kullanıyoruz, o tema semantik.
  const inputCls =
    "w-full border border-border rounded-md px-3 py-2 text-sm bg-neutral-0 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-300";
  const monoInputCls = inputCls + " font-mono";
  const labelCls = "block text-sm font-medium text-neutral-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 text-neutral-900">
      <h3 className="m-0 text-lg font-bold text-neutral-900">Yeni Kural Ekle</h3>

      {/* Hedef seçici — gruplu katalog + arama + manuel giriş modu */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls + " mb-0"}>
            Hedef Anahtar <span className="text-error">*</span>
          </label>
          <button
            type="button"
            onClick={() => setManualMode((m) => !m)}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer"
            data-testid="visibility-target-manual-toggle"
          >
            {manualMode ? "← Kataloğa dön" : "Manuel anahtar gir"}
          </button>
        </div>

        {manualMode ? (
          <div className="space-y-2">
            <input
              type="text"
              value={form.target_key}
              onChange={(e) =>
                setForm((p) => ({ ...p, target_key: e.target.value }))
              }
              placeholder="örn: panel:jobs, field:subtitle_style, page:analytics"
              className={monoInputCls}
              data-testid="visibility-target-manual-input"
              required
            />
            <p className="text-xs text-neutral-600">
              Format: <code className="font-mono text-neutral-800">tip:alt_anahtar</code>.
              Katalogda olmayan yeni anahtarlar için kullanın. Kural tipini
              aşağıdan elle seçin.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                Kural Tipi
              </label>
              <select
                value={form.rule_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, rule_type: e.target.value }))
                }
                className={inputCls}
                data-testid="visibility-target-manual-rule-type"
              >
                {RULE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="search"
              value={targetQuery}
              onChange={(e) => setTargetQuery(e.target.value)}
              placeholder="Ara: örn. jobs, analytics, provider trace…"
              className={inputCls}
              data-testid="visibility-target-search"
            />

            {selectedCatalogEntry && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-info bg-info-light text-xs"
                data-testid="visibility-target-selected-banner"
              >
                <span className="text-info-text font-semibold uppercase tracking-wider">
                  seçili
                </span>
                <code className="font-mono text-neutral-900">
                  {selectedCatalogEntry.key}
                </code>
                <span className="text-neutral-700 flex-1 truncate">
                  {selectedCatalogEntry.label} — {selectedCatalogEntry.description}
                </span>
              </div>
            )}

            <div
              className="max-h-[340px] overflow-y-auto border border-border rounded-md bg-neutral-0"
              data-testid="visibility-target-catalog"
            >
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-neutral-500">
                  Eşleşen anahtar yok. İsterseniz <em>Manuel anahtar gir</em>'i
                  kullanın.
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className="border-b border-border-subtle last:border-b-0"
                    data-testid={`visibility-target-group-${group.id}`}
                  >
                    <div className="sticky top-0 z-10 px-3 py-1.5 bg-neutral-100 border-b border-border-subtle">
                      <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-neutral-800">
                        {group.title}
                      </p>
                      <p className="m-0 text-[10px] text-neutral-600 truncate">
                        {group.summary}
                      </p>
                    </div>
                    <ul className="list-none m-0 p-0">
                      {group.options.map((opt) => {
                        const isSelected = form.target_key === opt.key;
                        return (
                          <li key={opt.key}>
                            <button
                              type="button"
                              onClick={() => selectCatalogOption(opt)}
                              className={
                                "w-full text-left px-3 py-2 border-b border-border-subtle last:border-b-0 cursor-pointer transition-colors " +
                                (isSelected
                                  ? "bg-info-light hover:bg-info-light"
                                  : "bg-neutral-0 hover:bg-neutral-100")
                              }
                              data-testid={`visibility-target-option-${opt.key}`}
                            >
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-[12px] text-neutral-900 font-semibold">
                                  {opt.key}
                                </code>
                                <span className="text-[9px] font-mono uppercase text-neutral-600 border border-border-subtle rounded px-1">
                                  {opt.rule_type}
                                </span>
                                {isSelected && (
                                  <span className="ml-auto text-[10px] font-bold text-info-text uppercase">
                                    seçili
                                  </span>
                                )}
                              </div>
                              <p className="m-0 mt-1 text-[12px] text-neutral-700 leading-snug">
                                <span className="font-semibold text-neutral-900">
                                  {opt.label}
                                </span>{" "}
                                — {opt.description}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modül kapsamı */}
      <div>
        <label className={labelCls}>Modül Kapsamı</label>
        <select
          value={form.module_scope}
          onChange={(e) => setForm((p) => ({ ...p, module_scope: e.target.value }))}
          className={inputCls}
        >
          {MODULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Rol kapsamı */}
      <div>
        <label className={labelCls}>Rol Kapsamı</label>
        <select
          value={form.role_scope}
          onChange={(e) => setForm((p) => ({ ...p, role_scope: e.target.value }))}
          className={inputCls}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Governance checkboxlar */}
      <div className="border border-border-subtle rounded-lg p-3 space-y-2 bg-neutral-50">
        <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
          Davranış
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm((p) => ({ ...p, visible: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-900">Görünür</span>
          <span className="text-xs text-neutral-600">— hedef bu kapsam için gösterilsin mi?</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.read_only}
            onChange={(e) => setForm((p) => ({ ...p, read_only: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-900">Salt Okunur</span>
          <span className="text-xs text-neutral-600">— düzenleme devre dışı</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.wizard_visible}
            onChange={(e) => setForm((p) => ({ ...p, wizard_visible: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-900">Wizard'da Görünür</span>
          <span className="text-xs text-neutral-600">— wizard akışında gösterilsin mi?</span>
        </label>
      </div>

      {/* Öncelik */}
      <div>
        <label className={labelCls}>Öncelik</label>
        <input
          type="number"
          value={form.priority}
          onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value) || 100 }))}
          min={0}
          max={9999}
          className={inputCls}
        />
        <p className="text-xs text-neutral-600 mt-1">Düşük sayı = daha yüksek öncelik</p>
      </div>

      {/* Notlar */}
      <div>
        <label className={labelCls}>Notlar</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Bu kuralın amacı ve kapsamı hakkında açıklama..."
          rows={3}
          className={inputCls + " resize-y"}
        />
      </div>

      {mut.isError && (
        <div className="text-error-text text-sm bg-error-light border border-error-border rounded px-3 py-2">
          {mut.error instanceof Error ? mut.error.message : "Kural oluşturulamadı."}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={mut.isPending || !form.target_key.trim()}
          className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-neutral-0 font-medium py-2 px-4 rounded-md text-sm cursor-pointer border-0 transition-colors"
        >
          {mut.isPending ? "Kaydediliyor..." : "Kural Ekle"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-border text-sm text-neutral-800 bg-neutral-0 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
