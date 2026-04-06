import { useVisibilityRuleDetail } from "../../hooks/useVisibilityRuleDetail";
import { cn } from "../../lib/cn";

const DASH = "—";

interface VisibilityRuleDetailPanelProps {
  selectedId: string | null;
}

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return (
      <span className="inline-block py-0.5 px-2 rounded-sm text-sm font-semibold bg-neutral-50 text-neutral-700 border border-border-subtle">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-block py-0.5 px-2 rounded-sm text-sm font-semibold",
        value ? "bg-success-light text-success-text" : "bg-error-light text-error-text"
      )}
    >
      {value ? "evet" : "hayır"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-neutral-100">
      <span className="w-40 shrink-0 text-neutral-600 text-base">
        {label}
      </span>
      <span className="text-md break-words [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

export function VisibilityRuleDetailPanel({ selectedId }: VisibilityRuleDetailPanelProps) {
  const { data, isLoading, isError, error } = useVisibilityRuleDetail(selectedId);

  if (!selectedId) {
    return (
      <div className="text-neutral-500 p-4">
        Detay görmek için bir visibility rule seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-neutral-600">Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-error">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4">
      <h3 className="m-0 mb-1 text-lg" data-testid="visibility-detail-heading">Kural Detayı</h3>
      <p className="m-0 mb-3 text-xs text-neutral-500" data-testid="visibility-detail-note">
        Kural bilgileri, kapsam ayarlari ve governance durumu asagida gorunur.
      </p>

      <div className="mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="visibility-section-identity">
        Kimlik ve Hedef
      </div>
      <Row label="Kural Turu">{data.rule_type ?? DASH}</Row>
      <Row label="Hedef Anahtar"><code>{data.target_key ?? DASH}</code></Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="visibility-section-scope">
        Kapsam
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em className="text-neutral-500">—</em>}</Row>
      <Row label="Rol Kapsami">{data.role_scope ?? <em className="text-neutral-500">—</em>}</Row>
      <Row label="Mod Kapsami">{data.mode_scope ?? <em className="text-neutral-500">—</em>}</Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="visibility-section-governance">
        Governance
      </div>
      <Row label="Gorunur"><BoolBadge value={data.visible} /></Row>
      <Row label="Salt Okunur"><BoolBadge value={data.read_only} /></Row>
      <Row label="Wizard Gorunur"><BoolBadge value={data.wizard_visible} /></Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="visibility-section-status">
        Durum ve Notlar
      </div>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Oncelik">{data.priority ?? DASH}</Row>
      <Row label="Notlar">{data.notes ?? <em className="text-neutral-500">—</em>}</Row>
    </div>
  );
}
