/**
 * CreateBulletinWizardPage — User-facing news bulletin creation wizard.
 *
 * Gate Sources Closure §S7:
 *   Artik admin wizard'a redirect YOK. Kullanici channel + project + style
 *   adimlarini bitirince kendi surface'indaki "/user/news-picker"
 *   sayfasina yonlendirilir. Haber secim + uretim baslatma admin panele
 *   gecmeden tamamlanir. Editorial gate ve clone gibi ileri fonksiyonlar
 *   admin surface'ta kalir.
 *
 * Flow: ChannelProfile (Step 0) → ContentProject → Stil → /user/news-picker
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserWizardShell } from "../../components/wizard/UserWizardShell";
import type { WizardStep } from "../../components/wizard/WizardShell";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

const STEPS: WizardStep[] = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "style", label: "Stil Secimi" },
  { id: "continue", label: "Bulten Wizard" },
];

/**
 * Public entry — Aurora `user.create.bulletin` override varsa onu kullan;
 * yoksa legacy 4-adımlı bülten wizard'ı.
 */
export function CreateBulletinWizardPage() {
  const Override = useSurfacePageOverride("user.create.bulletin");
  if (Override) return <Override />;
  return <LegacyCreateBulletinWizardPage />;
}

function LegacyCreateBulletinWizardPage() {
  const navigate = useNavigate();
  // PHASE AF: launcher deep-link destegi. ?contentProjectId=... ve
  // ?channelProfileId=... query parametreleri verilmisse wizard o context
  // ile acilsin — user projenin icinden yeni bir bulten baslatabiliyor.
  const [searchParams] = useSearchParams();
  const presetChannelProfileId = searchParams.get("channelProfileId");
  const presetContentProjectId = searchParams.get("contentProjectId");

  const [step, setStep] = useState(0);
  const [channelProfileId, setChannelProfileId] = useState<string | null>(
    presetChannelProfileId,
  );
  const [contentProjectId, setContentProjectId] = useState<string | null>(
    presetContentProjectId,
  );
  const [lowerThirdStyle, setLowerThirdStyle] = useState<string>("");
  const [styleBlueprintId, setStyleBlueprintId] = useState<string | null>(null);

  // Eger launcher'dan geldiyse (proje + kanal dolu), style adimina zipla.
  // Bu user'i ayni adimlardan ikinci kez gecmek zorunda birakmaz.
  useEffect(() => {
    if (presetChannelProfileId && presetContentProjectId) {
      setStep(2);
    } else if (presetChannelProfileId) {
      setStep(1);
    }
  }, [presetChannelProfileId, presetContentProjectId]);

  const handleChannelSelect = useCallback(
    (id: string) => setChannelProfileId(id),
    [],
  );

  const handleProjectReady = useCallback(
    (id: string) => {
      setContentProjectId(id);
      setStep(2);
    },
    [],
  );

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return !!channelProfileId;
      case 1:
        return !!contentProjectId;
      case 2:
        return true; // style step is optional
      case 3:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Gate Sources Closure §S7: user surface'ta kal — admin panele redirect yok.
      const params = new URLSearchParams();
      if (channelProfileId) params.set("channelProfileId", channelProfileId);
      if (contentProjectId) params.set("contentProjectId", contentProjectId);
      if (lowerThirdStyle) params.set("lowerThirdStyle", lowerThirdStyle);
      if (styleBlueprintId) params.set("styleBlueprintId", styleBlueprintId);
      navigate(`/user/news-picker?${params.toString()}`);
    }
  }

  return (
    <UserWizardShell
      title="Yeni Haber Bulteni"
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={handleNext}
      onCancel={() => navigate(-1)}
      nextDisabled={!canGoNext()}
      isLastStep={step === 3}
      nextLabel={step === 3 ? "Haber Secimine Gec" : undefined}
      testId="create-bulletin-wizard"
    >
      {/* Step 0: Channel selection */}
      {step === 0 && (
        <ChannelProfileStep
          selectedId={channelProfileId}
          onSelect={handleChannelSelect}
        />
      )}

      {/* Step 1: Project creation */}
      {step === 1 && channelProfileId && (
        <ContentProjectStep
          channelProfileId={channelProfileId}
          moduleType="news_bulletin"
          existingProjectId={contentProjectId}
          onProjectReady={handleProjectReady}
        />
      )}

      {/* Step 2: Style selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Stil Sablonu</h3>
            <StyleBlueprintSelector
              value={styleBlueprintId}
              onChange={(id) => setStyleBlueprintId(id)}
              moduleScope="news_bulletin"
            />
          </div>
          <div>
            <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Alt Bant Stili</h3>
            <LowerThirdStylePreview
              selected={lowerThirdStyle || undefined}
              onSelect={(style) => setLowerThirdStyle(style)}
            />
          </div>
          <p className="m-0 text-[10px] text-neutral-400 italic">
            Stil secimi opsiyoneldir — bulten wizard'da da degistirilebilir.
          </p>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className="m-0 mb-1 text-md font-semibold text-neutral-800">
            Hazir
          </h3>
          <p className="m-0 text-sm text-neutral-600">
            Kanal ve proje olusturuldu. Devam butonuna tiklayarak haber secimi
            ve uretim adimlarina gecebilirsiniz.
          </p>
          <div className="bg-neutral-50 border border-border-subtle rounded-md p-3 space-y-1.5 text-sm">
            <div className="flex">
              <span className="w-[100px] shrink-0 text-neutral-500">Kanal</span>
              <span className="text-neutral-800 font-mono text-xs">
                {channelProfileId ? `...${channelProfileId.slice(-8)}` : "\u2014"}
              </span>
            </div>
            <div className="flex">
              <span className="w-[100px] shrink-0 text-neutral-500">Proje</span>
              <span className="text-neutral-800 font-mono text-xs">
                {contentProjectId ? `...${contentProjectId.slice(-8)}` : "\u2014"}
              </span>
            </div>
            <div className="flex">
              <span className="w-[100px] shrink-0 text-neutral-500">Alt Bant</span>
              <span className="text-neutral-800 text-xs">
                {lowerThirdStyle || "\u2014"}
              </span>
            </div>
            <div className="flex">
              <span className="w-[100px] shrink-0 text-neutral-500">Stil</span>
              <span className="text-neutral-800 font-mono text-xs">
                {styleBlueprintId ? `...${styleBlueprintId.slice(-8)}` : "\u2014"}
              </span>
            </div>
          </div>
        </div>
      )}
    </UserWizardShell>
  );
}
