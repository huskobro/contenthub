import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisibilityRule, type VisibilityRuleCreate } from "../../api/visibilityApi";

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

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="m-0 text-lg font-bold text-neutral-900">Yeni Kural Ekle</h3>

      {/* Kural tipi */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Kural Tipi <span className="text-error">*</span>
        </label>
        <select
          value={form.rule_type}
          onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value }))}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {RULE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Hedef anahtar */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Hedef Anahtar <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={form.target_key}
          onChange={(e) => setForm((p) => ({ ...p, target_key: e.target.value }))}
          placeholder="örn: panel:jobs, field:subtitle_style, page:analytics"
          className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
          required
        />
        <p className="text-xs text-neutral-500 mt-1">
          Format: <code>tip:alt_anahtar</code> — panel, page, field, widget veya wizard_step
        </p>
      </div>

      {/* Modül kapsamı */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Modül Kapsamı
        </label>
        <select
          value={form.module_scope}
          onChange={(e) => setForm((p) => ({ ...p, module_scope: e.target.value }))}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {MODULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Rol kapsamı */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Rol Kapsamı
        </label>
        <select
          value={form.role_scope}
          onChange={(e) => setForm((p) => ({ ...p, role_scope: e.target.value }))}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Governance checkboxlar */}
      <div className="border border-border-subtle rounded-lg p-3 space-y-2">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Davranış</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm((p) => ({ ...p, visible: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-800">Görünür</span>
          <span className="text-xs text-neutral-500">— hedef bu kapsam için gösterilsin mi?</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.read_only}
            onChange={(e) => setForm((p) => ({ ...p, read_only: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-800">Salt Okunur</span>
          <span className="text-xs text-neutral-500">— düzenleme devre dışı</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.wizard_visible}
            onChange={(e) => setForm((p) => ({ ...p, wizard_visible: e.target.checked }))}
            className="cursor-pointer accent-brand-500"
          />
          <span className="text-sm text-neutral-800">Wizard'da Görünür</span>
          <span className="text-xs text-neutral-500">— wizard akışında gösterilsin mi?</span>
        </label>
      </div>

      {/* Öncelik */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Öncelik
        </label>
        <input
          type="number"
          value={form.priority}
          onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value) || 100 }))}
          min={0}
          max={9999}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <p className="text-xs text-neutral-500 mt-1">Düşük sayı = daha yüksek öncelik</p>
      </div>

      {/* Notlar */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Notlar
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Bu kuralın amacı ve kapsamı hakkında açıklama..."
          rows={3}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
        />
      </div>

      {mut.isError && (
        <div className="text-error text-sm bg-error-light border border-error-border rounded px-3 py-2">
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
            className="px-4 py-2 rounded-md border border-border text-sm text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
