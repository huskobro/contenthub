import { cn } from "../../lib/cn";
import { useSettingDetail } from "../../hooks/useSettingDetail";

const DASH = "—";

interface SettingDetailPanelProps {
  selectedId: string | null;
}

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-sm text-sm font-semibold bg-neutral-50 text-neutral-700 border border-border-subtle"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded-sm text-sm font-semibold",
        value ? "bg-success-light text-success-text" : "bg-error-light text-error-text",
      )}
    >
      {value ? "evet" : "hayır"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-neutral-100">
      <span className="w-[180px] shrink-0 text-neutral-600 text-base">
        {label}
      </span>
      <span className="text-md break-words">{children}</span>
    </div>
  );
}

export function SettingDetailPanel({ selectedId }: SettingDetailPanelProps) {
  const { data, isLoading, isError, error } = useSettingDetail(selectedId);

  if (!selectedId) {
    return (
      <div className="text-neutral-500 p-4">
        Detay görmek için bir ayar seçin.
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

  if (!data) {
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="m-0 mb-1 text-lg" data-testid="setting-detail-heading">Ayar Detayı</h3>
      <p className="m-0 mb-3 text-xs text-neutral-500" data-testid="setting-detail-note">
        Ayar bilgileri, degerleri ve governance durumu asagida gorunur.
      </p>

      <div className="mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-identity">
        Kimlik ve Deger
      </div>
      <Row label="Anahtar">
        <code>{data.key ?? DASH}</code>
      </Row>
      <Row label="Grup">{data.group_name ?? DASH}</Row>
      <Row label="Tur">{data.type ?? DASH}</Row>
      <Row label="Varsayilan Deger">
        <code className="break-all [overflow-wrap:anywhere]">{data.default_value_json ?? DASH}</code>
      </Row>
      <Row label="Admin Degeri">
        <code className="break-all [overflow-wrap:anywhere]">{data.admin_value_json ?? DASH}</code>
      </Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-governance">
        Governance
      </div>
      <Row label="Kullanici Gorunur">
        <BoolBadge value={data.visible_to_user} />
      </Row>
      <Row label="Override Izni">
        <BoolBadge value={data.user_override_allowed} />
      </Row>
      <Row label="Wizard Gorunur">
        <BoolBadge value={data.visible_in_wizard} />
      </Row>
      <Row label="Salt Okunur">
        <BoolBadge value={data.read_only_for_user} />
      </Row>

      <div className="mt-3 mb-2 text-xs font-semibold text-neutral-600 uppercase tracking-wide" data-testid="setting-section-scope">
        Kapsam ve Durum
      </div>
      <Row label="Modul Kapsami">{data.module_scope ?? <em className="text-neutral-500">—</em>}</Row>
      <Row label="Aciklama">{data.help_text ?? <em className="text-neutral-500">—</em>}</Row>
      <Row label="Durum">{data.status ?? DASH}</Row>
      <Row label="Versiyon">{data.version ?? DASH}</Row>
    </div>
  );
}
