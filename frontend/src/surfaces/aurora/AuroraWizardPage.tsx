/**
 * Aurora Wizard — port of design/contenthub/pages/admin/wizard.html.
 * Generic "yeni içerik" launcher: 3 adımlı stepper (modül seçimi → form
 * detayları → review). Final "Başlat" adımı, modüle özel mevcut admin
 * wizard rotalarına yönlendirir (gerçek pipeline bu deterministik
 * sayfalarda çalışır — burada sadece adımlama UX'i).
 *
 * CLAUDE.md uyumu: Sihirbaz akışı iki form yerine snapshot edilen, geri
 * dönülebilen bir hazırlık ekranı; gerçek job init mevcut modül
 * sayfalarında kalıyor.
 */
import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
} from "./primitives";
import { Icon } from "./icons";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";

// --- constants -------------------------------------------------------------

const STEPS = ["Modül seç", "İçerik detayları", "İncele & başlat"] as const;

const MODULES: Array<{
  id: string;
  name: string;
  icon: string;
  desc: string;
  route: string;
}> = [
  {
    id: "news_bulletin",
    name: "Haber Bülteni",
    icon: "📰",
    desc: "Günlük/haftalık haber özeti",
    route: "/admin/news-bulletins/wizard",
  },
  {
    id: "product_review",
    name: "Ürün İnceleme",
    icon: "⚡",
    desc: "Ürün tanıtım ve inceleme",
    route: "/admin/standard-videos/wizard",
  },
  {
    id: "standard_video",
    name: "Standart Video",
    icon: "🎬",
    desc: "Belgesel, eğitim, genel",
    route: "/admin/standard-videos/wizard",
  },
];

/**
 * NOT: Bu sayfa "ön-prep" wizard'ıdır — gerçek job init modüle özel
 * (`/admin/news-bulletins/wizard` vb.) sayfada çalışır. Buradaki form
 * verisi hedef route'a `state` ile aktarılır; modül sayfası bunu okuyup
 * kendi formunu önceden doldurur.
 *
 * VOICES/DURATIONS sabit listeleri provider/settings registry'ye bağlı
 * değil — bu sayfada sadece "ön-tercih" olarak kullanılırlar; modül
 * sayfası kendi gerçek listesiyle override eder. Tasarım tercihi: Aurora
 * giriş wizard'ı hızlı bir başlatıcı, otorite değil.
 */
const VOICES = [
  "Türkçe - Zeynep (Kadın)",
  "Türkçe - Mehmet (Erkek)",
  "Türkçe - Elif (Nötr)",
];
const DURATIONS = ["2", "3", "5", "7", "10", "15"];
const PIPELINE_STEPS = [
  ["Senaryo üretimi (LLM)", 30],
  ["TTS ses sentezi", 45],
  ["Görsel üretim", 90],
  ["Kompozisyon & render", 120],
  ["Yayın kuyruğu", 10],
] as const;

const LS_KEY = "aurora_wizard_draft_v1";

interface DraftForm {
  module: string;
  topic: string;
  channel: string;
  voice: string;
  duration: string;
  notes: string;
}

const DEFAULT_FORM: DraftForm = {
  module: "",
  topic: "",
  channel: "",
  voice: VOICES[0],
  duration: "3",
  notes: "",
};

function loadDraft(): { step: number; form: DraftForm } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.step !== "number" || !parsed?.form) return null;
    return { step: parsed.step, form: { ...DEFAULT_FORM, ...parsed.form } };
  } catch {
    return null;
  }
}

function saveDraft(d: { step: number; form: DraftForm }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* noop */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* noop */
  }
}

// --- page ------------------------------------------------------------------

export function AuroraWizardPage() {
  const navigate = useNavigate();
  const initial = loadDraft();
  const [step, setStep] = useState<number>(initial?.step ?? 0);
  const [form, setForm] = useState<DraftForm>(initial?.form ?? DEFAULT_FORM);
  const [launched, setLaunched] = useState(false);
  const { data: channelProfiles = [] } = useMyChannelProfiles();

  const channelOptions = useMemo(
    () =>
      channelProfiles.map((c) => ({
        id: c.id,
        label: c.profile_name,
      })),
    [channelProfiles],
  );

  function set<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      saveDraft({ step, form: next });
      return next;
    });
  }

  function next() {
    const s = step + 1;
    setStep(s);
    saveDraft({ step: s, form });
  }

  function back() {
    const s = Math.max(0, step - 1);
    setStep(s);
    saveDraft({ step: s, form });
  }

  function launch() {
    const mod = MODULES.find((m) => m.id === form.module);
    if (!mod) return;
    clearDraft();
    setLaunched(true);
    // Form verisini route state ile aktar — modül sayfası okuyup
    // form'unu önceden doldurabilir. 800ms görsel onay sonra geçilir.
    setTimeout(
      () =>
        navigate(mod.route, {
          state: {
            aurora_prep: {
              module: form.module,
              topic: form.topic,
              channel_profile_id: form.channel || null,
              voice: form.voice,
              duration_minutes: form.duration,
              notes: form.notes,
            },
          },
        }),
      800,
    );
  }

  function reset() {
    if (!form.topic && !form.notes && step === 0) {
      // boş — onay gerekmez
      setForm(DEFAULT_FORM);
      setStep(0);
      setLaunched(false);
      clearDraft();
      return;
    }
    if (
      !window.confirm(
        "Sihirbaz taslağı silinecek (konu, notlar, modül seçimi). Devam edilsin mi?",
      )
    ) {
      return;
    }
    setForm(DEFAULT_FORM);
    setStep(0);
    setLaunched(false);
    clearDraft();
  }

  function stepState(i: number): "done" | "active" | "pending" {
    return i < step ? "done" : i === step ? "active" : "pending";
  }

  // --- inspector ---------------------------------------------------------

  const inspector = (
    <AuroraInspector title="Sihirbaz">
      <AuroraInspectorSection title="Taslak durumu">
        <AuroraInspectorRow
          label="adım"
          value={`${Math.min(step + 1, STEPS.length)}/${STEPS.length}`}
        />
        <AuroraInspectorRow label="modül" value={form.module || "—"} />
        <AuroraInspectorRow
          label="kanal"
          value={
            channelOptions.find((c) => c.id === form.channel)?.label ?? "—"
          }
        />
        <AuroraInspectorRow label="durum" value="taslak (otomatik)" />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="İpuçları">
        <AuroraInspectorRow
          label="kayıt"
          value="localStorage"
        />
        <AuroraInspectorRow
          label="sıfırla"
          value={launched ? "tamam" : "geri dön"}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // --- render ------------------------------------------------------------

  return (
    <div className="aurora-wizard">
      <div className="page">
        <div className="wizard-wrap">
          {/* Stepper */}
          <div className="stepper">
            {STEPS.map((label, i) => (
              <Fragment key={label}>
                <div className="step-col">
                  <div className={"step-circle " + stepState(i)}>
                    {i < step ? <Icon name="check" size={14} /> : i + 1}
                  </div>
                  <div className={"step-label " + stepState(i)}>{label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={
                      "step-conn " +
                      (i < step ? "done" : i === step ? "active" : "")
                    }
                  />
                )}
              </Fragment>
            ))}
          </div>

          {/* Step 0: Module */}
          {step === 0 && !launched && (
            <div>
              <h2 className="wizard-h2">Modül seç</h2>
              <p className="wizard-sub">
                Hangi içerik türünü oluşturmak istiyorsun?
              </p>
              <div className="module-grid">
                {MODULES.map((m) => (
                  <div
                    key={m.id}
                    className={
                      "module-card" +
                      (form.module === m.id ? " selected" : "")
                    }
                    onClick={() => set("module", m.id)}
                  >
                    <div className="mc-icon">{m.icon}</div>
                    <div className="mc-name">{m.name}</div>
                    <div className="mc-desc">{m.desc}</div>
                  </div>
                ))}
              </div>
              <div className="wizard-footer">
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                >
                  İptal
                </AuroraButton>
                <div style={{ flex: 1 }} />
                <AuroraButton
                  variant="primary"
                  size="sm"
                  disabled={!form.module}
                  onClick={next}
                  iconRight={<Icon name="arrow-right" size={12} />}
                >
                  Devam et
                </AuroraButton>
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && !launched && (
            <div>
              <h2 className="wizard-h2">İçerik detayları</h2>
              <p className="wizard-sub">
                Modül:{" "}
                <strong style={{ color: "var(--accent-primary-hover)" }}>
                  {form.module}
                </strong>
              </p>
              <div className="form-field">
                <label className="form-label">Konu / başlık</label>
                <input
                  className="form-input"
                  placeholder="Örn: Haftalık ekonomi bülteni · 18 Nisan"
                  value={form.topic}
                  onChange={(e) => set("topic", e.target.value)}
                />
                <div className="form-hint">
                  İçeriğin ana konusu. Senaryo bu bilgiye göre üretilir.
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div className="form-field">
                  <label className="form-label">Kanal</label>
                  <select
                    className="form-select"
                    value={form.channel}
                    onChange={(e) => set("channel", e.target.value)}
                    disabled={channelOptions.length === 0}
                  >
                    <option value="">
                      {channelOptions.length === 0
                        ? "Henüz kanal profili yok"
                        : "Kanal seçin (opsiyonel)"}
                    </option>
                    {channelOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Tahmini süre (dk)</label>
                  <select
                    className="form-select"
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} dakika
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Ses / anlatıcı</label>
                <select
                  className="form-select"
                  value={form.voice}
                  onChange={(e) => set("voice", e.target.value)}
                >
                  {VOICES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Ek notlar (isteğe bağlı)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Vurgulanmasını istediğin noktalar, ton, hedef kitle..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="wizard-footer">
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={back}
                  iconLeft={<Icon name="chevron-left" size={12} />}
                >
                  Geri
                </AuroraButton>
                <div style={{ flex: 1 }} />
                <AuroraButton
                  variant="primary"
                  size="sm"
                  disabled={!form.topic}
                  onClick={next}
                  iconRight={<Icon name="arrow-right" size={12} />}
                >
                  İncele
                </AuroraButton>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && !launched && (
            <div>
              <h2 className="wizard-h2">İncele &amp; başlat</h2>
              <p className="wizard-sub">Her şey doğru görünüyor mu?</p>
              <div className="review-card">
                <div className="rc-title">İçerik bilgileri</div>
                <div className="review-row">
                  <span className="k">modül</span>
                  <span className="v">{form.module}</span>
                </div>
                <div className="review-row">
                  <span className="k">konu</span>
                  <span className="v">{form.topic}</span>
                </div>
                <div className="review-row">
                  <span className="k">kanal</span>
                  <span className="v">
                    {channelOptions.find((c) => c.id === form.channel)?.label ?? "—"}
                  </span>
                </div>
                <div className="review-row">
                  <span className="k">süre</span>
                  <span className="v">{form.duration} dakika</span>
                </div>
                <div className="review-row">
                  <span className="k">ses</span>
                  <span className="v">{form.voice}</span>
                </div>
                {form.notes && (
                  <div className="review-row">
                    <span className="k">notlar</span>
                    <span className="v">{form.notes}</span>
                  </div>
                )}
              </div>
              <div className="review-card">
                <div className="rc-title">İşlem adımları</div>
                {PIPELINE_STEPS.map(([s, est], i) => (
                  <div key={s} className="review-row">
                    <span className="k">adım {i + 1}</span>
                    <span
                      className="v"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {s}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        ~{est}s
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="wizard-footer">
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={back}
                  iconLeft={<Icon name="chevron-left" size={12} />}
                >
                  Geri
                </AuroraButton>
                <div style={{ flex: 1 }} />
                <AuroraButton
                  variant="primary"
                  size="sm"
                  onClick={launch}
                  iconLeft={<Icon name="zap" size={12} />}
                >
                  Modül sihirbazını aç
                </AuroraButton>
              </div>
            </div>
          )}

          {/* Launched */}
          {launched && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--state-success-bg, rgba(59,200,184,0.1))",
                  border: "2px solid var(--state-success-fg)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  color: "var(--state-success-fg)",
                }}
              >
                <Icon name="check" size={28} />
              </div>
              <h2 className="wizard-h2" style={{ textAlign: "center" }}>
                Modül sihirbazına yönlendiriliyor…
              </h2>
              <p className="wizard-sub" style={{ textAlign: "center" }}>
                Hazırladığın taslak modülün resmi sihirbazında devam edecek.
              </p>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <AuroraButton size="sm" onClick={reset}>
                  Yeniden başlat
                </AuroraButton>
              </div>
            </div>
          )}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
