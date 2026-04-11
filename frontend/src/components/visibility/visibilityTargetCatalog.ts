/**
 * VisibilityTargetCatalog
 *
 * Static catalog of ALL visibility target keys known to the product, grouped
 * by area and annotated with short Turkish descriptions. The Visibility
 * Registry's "Yeni Kural" form renders a searchable grouped picker backed by
 * this list so operators don't have to memorize key strings.
 *
 * WHY A STATIC FILE:
 * The backend currently has no `/visibility/targets` catalog endpoint and
 * mixing keys into the backend for a pure UX concern would cross a layer
 * boundary. These keys are already referenced with string literals in
 * `require_visible(...)` calls across the backend and in frontend guards;
 * this file mirrors that set. If a new key is added to code but not here,
 * the form still accepts manual entry as a fallback — nothing breaks.
 *
 * HOW TO KEEP IN SYNC:
 * When you introduce a new `require_visible("...")`, `VisibilityGuard
 * targetKey="..."`, `useVisibility("...")` or `ReadOnlyGuard targetKey="..."`
 * in the codebase, add the matching entry to the group that best describes
 * it. Descriptions are short (≤ 80 chars) and in Turkish to match operator
 * UI language.
 */

export interface VisibilityTargetOption {
  /** Canonical key (e.g. "panel:jobs"). */
  key: string;
  /** Rule type this key uses on create (page | panel | widget | field | wizard_step). */
  rule_type: "panel" | "page" | "field" | "widget" | "wizard_step";
  /** Short human label shown in the picker row. */
  label: string;
  /** One-line Turkish description of what hiding/restricting this key means. */
  description: string;
}

export interface VisibilityTargetGroup {
  /** Unique group id used as React key. */
  id: string;
  /** Group title shown in the picker. */
  title: string;
  /** One-line group summary shown under the title. */
  summary: string;
  options: VisibilityTargetOption[];
}

export const VISIBILITY_TARGET_GROUPS: VisibilityTargetGroup[] = [
  // ---------------------------------------------------------------------
  // Admin paneli — ana sayfa/panel anahtarları
  // ---------------------------------------------------------------------
  {
    id: "admin-panels",
    title: "Admin Panelleri",
    summary:
      "Yönetim arayüzündeki üst düzey paneller — kapalı olan panel sidebar'da ve backend router'da engellenir.",
    options: [
      {
        key: "panel:settings",
        rule_type: "panel",
        label: "Ayarlar",
        description: "Ayar kayıtları sayfası ve /api/v1/settings router'ı.",
      },
      {
        key: "panel:visibility",
        rule_type: "panel",
        label: "Görünürlük Kuralları",
        description: "Bu sayfa — görünürlük kural yönetimi.",
      },
      {
        key: "panel:templates",
        rule_type: "panel",
        label: "Şablonlar",
        description: "İçerik/stil şablonları paneli ve ilgili endpointler.",
      },
      {
        key: "panel:style-blueprints",
        rule_type: "panel",
        label: "Stil Blueprintleri",
        description: "Görsel kimlik kuralları (stil blueprint) paneli.",
      },
      {
        key: "panel:template-style-links",
        rule_type: "panel",
        label: "Şablon–Stil Bağları",
        description: "Şablon ve stil blueprint eşleşmeleri paneli.",
      },
      {
        key: "panel:sources",
        rule_type: "panel",
        label: "Haber Kaynakları",
        description: "RSS / manuel URL / API kaynak kaydı paneli.",
      },
      {
        key: "panel:source-scans",
        rule_type: "panel",
        label: "Kaynak Taramaları",
        description: "Otomatik ve manuel kaynak tarama kayıtları.",
      },
      {
        key: "panel:news-items",
        rule_type: "panel",
        label: "Haber Öğeleri",
        description: "Taranmış ham haber öğeleri paneli.",
      },
      {
        key: "panel:used-news",
        rule_type: "panel",
        label: "Kullanılmış Haberler",
        description: "Dedupe için işaretlenmiş haber kayıtları.",
      },
      {
        key: "panel:news-bulletin",
        rule_type: "panel",
        label: "Haber Bülteni Modülü",
        description: "Haber bülteni modülü router'ı ve paneli.",
      },
      {
        key: "panel:standard-video",
        rule_type: "panel",
        label: "Standart Video Modülü",
        description: "Standart video modülü router'ı ve paneli.",
      },
      {
        key: "panel:jobs",
        rule_type: "panel",
        label: "İşler (Jobs)",
        description: "Üretim işleri listesi, detay ve router'ı.",
      },
      {
        key: "panel:publish",
        rule_type: "panel",
        label: "Yayın Merkezi",
        description: "Yayın akışı + YouTube management router'ları.",
      },
      {
        key: "panel:analytics",
        rule_type: "panel",
        label: "Analitik",
        description: "Tüm analitik sayfaları (platform, operations, YouTube).",
      },
      {
        key: "panel:audit-logs",
        rule_type: "panel",
        label: "Denetim Kayıtları",
        description: "Audit log paneli ve router'ı.",
      },
      {
        key: "panel:providers",
        rule_type: "panel",
        label: "Sağlayıcılar",
        description: "Harici sağlayıcı (LLM/TTS/render) yönetim paneli.",
      },
      {
        key: "panel:assets",
        rule_type: "panel",
        label: "Varlık Kütüphanesi",
        description: "Asset library paneli ve router'ı.",
      },
      {
        key: "panel:content-library",
        rule_type: "panel",
        label: "İçerik Kütüphanesi",
        description: "Tamamlanmış içerik kütüphanesi paneli.",
      },
      {
        key: "panel:discovery",
        rule_type: "panel",
        label: "Keşif",
        description: "Discovery (arama/keşif) paneli ve router'ı.",
      },
      {
        key: "panel:onboarding",
        rule_type: "panel",
        label: "Onboarding",
        description: "Kurulum/onboarding router'ı — genelde sadece yeni kullanıcı.",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // Job Detail alt panelleri
  // ---------------------------------------------------------------------
  {
    id: "job-detail",
    title: "İş Detayı Alt Panelleri",
    summary:
      "Job Detail sayfasındaki sekme/kartlar — tamamını gizlemeden sadece belirli alt paneli kapatabilirsiniz.",
    options: [
      {
        key: "panel:job_detail:artifacts",
        rule_type: "panel",
        label: "Artifact Listesi",
        description: "İş çıktıları (video, ses, altyazı) sekmesi.",
      },
      {
        key: "panel:job_detail:provider_trace",
        rule_type: "panel",
        label: "Provider Trace",
        description: "LLM/TTS çağrı izleri ve maliyet kartı.",
      },
      {
        key: "panel:job_detail:retry_history",
        rule_type: "panel",
        label: "Yeniden Deneme Geçmişi",
        description: "Adım retry geçmişi sekmesi.",
      },
      {
        key: "panel:job_detail:review_state",
        rule_type: "panel",
        label: "İnceleme Durumu",
        description: "Manuel review / onay kartı.",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // Alan (Field) anahtarları — hassas metadata alanları
  // ---------------------------------------------------------------------
  {
    id: "fields",
    title: "Alanlar (Field)",
    summary:
      "Tek bir alan seviyesinde gizleme/salt-okunur — örn. hassas metadata veya reviewer bilgisi.",
    options: [
      {
        key: "field:artifact:*",
        rule_type: "field",
        label: "Artifact Alanları (*)",
        description: "Tüm artifact metadata alanları için joker kural.",
      },
      {
        key: "field:provider_trace:cost_metadata",
        rule_type: "field",
        label: "Provider Trace — Maliyet",
        description: "Sağlayıcı çağrı maliyet metadata alanı.",
      },
      {
        key: "field:provider_trace:request_summary",
        rule_type: "field",
        label: "Provider Trace — İstek Özeti",
        description: "Sağlayıcı çağrı istek özeti alanı.",
      },
      {
        key: "field:review_state:reviewer_id",
        rule_type: "field",
        label: "Review — İnceleyen ID",
        description: "Manuel incelemeyi yapan kullanıcı kimliği.",
      },
      {
        key: "field:review_state:rejection_reason",
        rule_type: "field",
        label: "Review — Red Gerekçesi",
        description: "Manuel inceleme red gerekçesi alanı.",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // Wizard adımları
  // ---------------------------------------------------------------------
  {
    id: "wizards",
    title: "Wizard Adımları",
    summary:
      "Onboarding ve kurulum sihirbazlarındaki adımlar — belirli rollerden veya modüllerden gizlenebilir.",
    options: [
      {
        key: "wizard:source-setup",
        rule_type: "wizard_step",
        label: "Kaynak Kurulumu",
        description: "Onboarding sırasındaki ilk haber kaynağı adımı.",
      },
      {
        key: "wizard:template-setup",
        rule_type: "wizard_step",
        label: "Şablon Kurulumu",
        description: "Onboarding sırasındaki şablon seçim adımı.",
      },
      {
        key: "wizard:settings-setup",
        rule_type: "wizard_step",
        label: "Ayarlar Kurulumu",
        description: "Onboarding sırasındaki ayarlar adımı.",
      },
    ],
  },
];

/**
 * Flatten the catalog for fuzzy search. Duplicates are avoided because each
 * key appears in exactly one group.
 */
export function flattenTargetCatalog(): Array<
  VisibilityTargetOption & { groupId: string; groupTitle: string }
> {
  const rows: Array<
    VisibilityTargetOption & { groupId: string; groupTitle: string }
  > = [];
  for (const group of VISIBILITY_TARGET_GROUPS) {
    for (const opt of group.options) {
      rows.push({ ...opt, groupId: group.id, groupTitle: group.title });
    }
  }
  return rows;
}

/**
 * Case-insensitive substring filter over key + label + description + group.
 */
export function filterTargetCatalog(
  query: string,
): VisibilityTargetGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return VISIBILITY_TARGET_GROUPS;
  const matches = (text: string) => text.toLowerCase().includes(q);
  return VISIBILITY_TARGET_GROUPS
    .map((group) => {
      if (matches(group.title) || matches(group.summary)) {
        // Whole group matches — return all its options.
        return group;
      }
      const filtered = group.options.filter(
        (o) =>
          matches(o.key) ||
          matches(o.label) ||
          matches(o.description) ||
          matches(o.rule_type),
      );
      if (filtered.length === 0) return null;
      return { ...group, options: filtered };
    })
    .filter((g): g is VisibilityTargetGroup => g !== null);
}
