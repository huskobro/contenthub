/**
 * CreateBulletinWizardPage — Faz 5F: User-facing news bulletin creation wizard.
 *
 * Flow: ChannelProfile (Step 0) → ContentProject → Redirect to admin bulletin wizard
 *       with channelProfileId + contentProjectId context.
 *
 * The bulletin wizard itself (NewsBulletinWizardPage) is complex with editorial gates.
 * Rather than duplicating 1400 lines, this page handles Channel + Project setup,
 * then redirects to the existing wizard with context params.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { WizardShell, type WizardStep } from "../../components/wizard/WizardShell";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";

const STEPS: WizardStep[] = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "style", label: "Stil Secimi" },
  { id: "continue", label: "Bulten Wizard" },
];

export function CreateBulletinWizardPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [channelProfileId, setChannelProfileId] = useState<string | null>(null);
  const [contentProjectId, setContentProjectId] = useState<string | null>(null);
  const [lowerThirdStyle, setLowerThirdStyle] = useState<string>("");
  const [styleBlueprintId, setStyleBlueprintId] = useState<string | null>(null);

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
      // Navigate to bulletin wizard with context + style selections
      const params = new URLSearchParams();
      if (channelProfileId) params.set("channelProfileId", channelProfileId);
      if (contentProjectId) params.set("contentProjectId", contentProjectId);
      if (lowerThirdStyle) params.set("lowerThirdStyle", lowerThirdStyle);
      if (styleBlueprintId) params.set("styleBlueprintId", styleBlueprintId);
      navigate(`/admin/news-bulletins/wizard?${params.toString()}`);
    }
  }

  return (
    <WizardShell
      title="Yeni Haber Bulteni"
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(0, step - 1))}
      onNext={handleNext}
      onCancel={() => navigate(-1)}
      nextDisabled={!canGoNext()}
      isLastStep={step === 3}
      nextLabel={step === 3 ? "Bulten Wizard'a Devam Et" : undefined}
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
    </WizardShell>
  );
}
