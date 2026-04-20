/**
 * AuroraOnboardingPage — minimal 3-adımlı Aurora onboarding.
 *
 * Aurora "minimal cockpit" yaklaşımı: tam onboarding sihirbazı (kaynak,
 * şablon, sağlayıcı, çalışma alanı vb.) Aurora'da körlemesine gösterilmek
 * yerine 3 hızlı adımla özetlenir:
 *   1) Hoşgeldin
 *   2) Kısa yönlendirme (modüller)
 *   3) Tamamla → /user
 *
 * Detaylı kurulum istendiğinde kullanıcı sonradan admin Settings → Onboarding
 * Wizard üzerinden veya `?force=true` ile legacy 10-adımlı sürüme dönebilir.
 *
 * Davranış sözleşmeleri:
 * - `onboarding_required === false` ise (forceMode dışında) /user'a redirect.
 * - "Tamamla" CTA `useCompleteOnboarding` mutate eder; başarılı olunca
 *   /user'a gider — legacy davranışla aynı.
 */
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";
import { useCompleteOnboarding } from "../../hooks/useCompleteOnboarding";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";
import { Icon } from "./icons";

const STEPS = ["Hoşgeldin", "Yönlendirme", "Tamamla"] as const;

interface ModuleHint {
  id: string;
  name: string;
  desc: string;
}

const MODULE_HINTS: ModuleHint[] = [
  {
    id: "standard_video",
    name: "Standart Video",
    desc: "Eğitim, belgesel ve genel amaçlı video üretimi.",
  },
  {
    id: "news_bulletin",
    name: "Haber Bülteni",
    desc: "RSS / API kaynaklarından otomatik bülten üretimi.",
  },
  {
    id: "publish",
    name: "Yayın Merkezi",
    desc: "YouTube ve diğer platformlara denetimli yayın akışı.",
  },
];

export function AuroraOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceMode = searchParams.get("force") === "true";
  const { data: status, isLoading: statusLoading } = useOnboardingStatus();
  const completeMutation = useCompleteOnboarding();
  const [step, setStep] = useState(0);

  // Bypass: onboarding zaten tamamlanmışsa /user'a yönlendir.
  if (
    !forceMode &&
    !statusLoading &&
    status &&
    status.onboarding_required === false
  ) {
    return <Navigate to="/user" replace />;
  }

  function handleComplete() {
    completeMutation.mutate(undefined, {
      onSuccess: () => navigate("/user", { replace: true }),
    });
  }

  function stepState(i: number): "done" | "active" | "pending" {
    return i < step ? "done" : i === step ? "active" : "pending";
  }

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-onboarding-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 24px",
        background:
          "radial-gradient(ellipse at top, rgba(176,122,216,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(59,200,184,0.16), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: 16,
              letterSpacing: "-0.01em",
            }}
          >
            ContentHub
          </div>
          <div style={{ marginTop: 4 }}>
            <AuroraStatusChip tone="info">aurora · onboarding</AuroraStatusChip>
          </div>
        </div>

        <AuroraCard pad="default">
          {/* Stepper */}
          <div
            className="stepper"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              justifyContent: "center",
            }}
          >
            {STEPS.map((label, i) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div className={"step-circle " + stepState(i)}>
                    {i < step ? <Icon name="check" size={12} /> : i + 1}
                  </div>
                  <div className={"step-label " + stepState(i)}>{label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={
                      "step-conn " +
                      (i < step ? "done" : i === step ? "active" : "")
                    }
                    style={{ width: 60 }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  margin: "0 0 8px",
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                  letterSpacing: "-0.01em",
                }}
              >
                ContentHub'a hoş geldiniz
              </h1>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                Modüler içerik üretimi, operasyon görünürlüğü ve kontrollü
                yayın için tek merkez. Önce kısa bir tur, sonra kuruluma
                geçelim.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <AuroraButton
                  variant="primary"
                  size="md"
                  onClick={() => setStep(1)}
                  iconRight={<Icon name="arrow-right" size={12} />}
                  data-testid="aurora-onboarding-next"
                >
                  Devam et
                </AuroraButton>
                <AuroraButton
                  variant="ghost"
                  size="md"
                  onClick={() => navigate("/user")}
                  data-testid="aurora-onboarding-skip"
                >
                  Atla
                </AuroraButton>
              </div>
            </div>
          )}

          {/* Step 1 — Orientation (modules) */}
          {step === 1 && (
            <div>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                }}
              >
                Neyi nerede yaparsınız?
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                }}
              >
                Aşağıdaki modüller MVP kapsamında etkin. Detaylı kaynak /
                şablon kurulumunu sonradan Yönetim Paneli &gt; Sihirbaz'dan
                yapabilirsiniz.
              </p>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 22,
                }}
              >
                {MODULE_HINTS.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--border-default)",
                      borderRadius: 10,
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(0)}
                  iconLeft={<Icon name="chevron-left" size={12} />}
                >
                  Geri
                </AuroraButton>
                <AuroraButton
                  variant="primary"
                  size="md"
                  onClick={() => setStep(2)}
                  iconRight={<Icon name="arrow-right" size={12} />}
                  data-testid="aurora-onboarding-next-2"
                >
                  Sonraki
                </AuroraButton>
              </div>
            </div>
          )}

          {/* Step 2 — Complete */}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--state-success-bg, rgba(59,200,184,0.12))",
                  border: "2px solid var(--state-success-fg, var(--accent-primary))",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  color: "var(--state-success-fg, var(--accent-primary))",
                }}
              >
                <Icon name="check" size={24} />
              </div>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                }}
              >
                Hazırsınız
              </h2>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                }}
              >
                İlk içeriğinizi oluşturmaya başlayabilir veya detaylı
                kurulum için Yönetim Paneli'ne geçebilirsiniz.
              </p>
              {completeMutation.isError && (
                <div style={{ marginBottom: 14 }}>
                  <AuroraStatusChip tone="danger">
                    Tamamlanamadı, tekrar deneyin.
                  </AuroraStatusChip>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <AuroraButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  iconLeft={<Icon name="chevron-left" size={12} />}
                  disabled={completeMutation.isPending}
                >
                  Geri
                </AuroraButton>
                <AuroraButton
                  variant="primary"
                  size="md"
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  data-testid="aurora-onboarding-complete"
                >
                  {completeMutation.isPending ? "..." : "Tamamla ve Başla"}
                </AuroraButton>
              </div>
            </div>
          )}
        </AuroraCard>
      </div>
    </div>
  );
}
