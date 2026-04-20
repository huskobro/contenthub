/**
 * AuroraCreateBulletinWizardPage — kullanıcı tarafı haber bülteni wizard'ı.
 *
 * Legacy `pages/user/CreateBulletinWizardPage.tsx` ile birebir aynı akış:
 *   - 4 step: channel → project → style → continue
 *   - Son adımda `/user/news-picker` query string ile yönlendirir.
 *   - `?channelProfileId=` / `?contentProjectId=` deep-link desteği aynı.
 *
 * Sadece kabuk Aurora: AuroraPageShell + AuroraCard + AuroraInspector.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AuroraPageShell,
  AuroraCard,
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { Icon } from "./icons";
import { ChannelProfileStep } from "../../components/wizard/ChannelProfileStep";
import { ContentProjectStep } from "../../components/wizard/ContentProjectStep";
import { StyleBlueprintSelector } from "../../components/preview/StyleBlueprintSelector";
import { LowerThirdStylePreview } from "../../components/preview/LowerThirdStylePreview";

const STEPS = [
  { id: "channel", label: "Kanal" },
  { id: "project", label: "Proje" },
  { id: "style", label: "Stil" },
  { id: "continue", label: "Devam" },
] as const;

const FIELD_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 6,
};

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? `…${id.slice(-8)}` : id;
}

export function AuroraCreateBulletinWizardPage() {
  const navigate = useNavigate();
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

  // Launcher deep-link: kanal + proje doluysa style adımına atla.
  useEffect(() => {
    if (presetChannelProfileId && presetContentProjectId) setStep(2);
    else if (presetChannelProfileId) setStep(1);
  }, [presetChannelProfileId, presetContentProjectId]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return !!channelProfileId;
      case 1:
        return !!contentProjectId;
      case 2:
      case 3:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const params = new URLSearchParams();
    if (channelProfileId) params.set("channelProfileId", channelProfileId);
    if (contentProjectId) params.set("contentProjectId", contentProjectId);
    if (lowerThirdStyle) params.set("lowerThirdStyle", lowerThirdStyle);
    if (styleBlueprintId) params.set("styleBlueprintId", styleBlueprintId);
    navigate(`/user/news-picker?${params.toString()}`);
  }

  function handleBack() {
    if (isFirst) {
      navigate("/user/projects");
      return;
    }
    setStep(step - 1);
  }

  let stepContent: ReactNode = null;
  if (step === 0) {
    stepContent = (
      <ChannelProfileStep
        selectedId={channelProfileId}
        onSelect={(id) => setChannelProfileId(id)}
      />
    );
  } else if (step === 1 && channelProfileId) {
    stepContent = (
      <ContentProjectStep
        channelProfileId={channelProfileId}
        moduleType="news_bulletin"
        existingProjectId={contentProjectId}
        onProjectReady={(id) => {
          setContentProjectId(id);
          setStep(2);
        }}
      />
    );
  } else if (step === 2) {
    stepContent = (
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <span style={FIELD_LABEL}>Stil Şablonu</span>
          <StyleBlueprintSelector
            value={styleBlueprintId}
            onChange={(id) => setStyleBlueprintId(id)}
            moduleScope="news_bulletin"
          />
        </div>
        <div>
          <span style={FIELD_LABEL}>Alt Bant</span>
          <LowerThirdStylePreview
            selected={lowerThirdStyle || undefined}
            onSelect={(s) => setLowerThirdStyle(s)}
          />
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
          Stil seçimi opsiyoneldir — haber seçim adımında değiştirilebilir.
        </p>
      </div>
    );
  } else if (step === 3) {
    stepContent = (
      <div style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Hazır — haber seçimine geç
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          Kanal ve proje hazır. Devam butonu sizi haber seçimi ekranına götürür;
          oradan üretim akışını başlatabilirsiniz.
        </p>
        <AuroraCard pad="default">
          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <KeyValue k="Kanal" v={shortId(channelProfileId)} mono />
            <KeyValue k="Proje" v={shortId(contentProjectId)} mono />
            <KeyValue k="Alt bant" v={lowerThirdStyle || "—"} />
            <KeyValue k="Stil" v={shortId(styleBlueprintId)} mono />
          </div>
        </AuroraCard>
      </div>
    );
  }

  const inspector = (
    <AuroraInspector title="Plan özeti">
      <AuroraInspectorSection title="Adım">
        <AuroraInspectorRow
          label="mevcut"
          value={`${step + 1} / ${STEPS.length} — ${STEPS[step].label}`}
        />
        <AuroraInspectorRow
          label="modül"
          value={<AuroraStatusChip tone="info">news_bulletin</AuroraStatusChip>}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Bağlam">
        <AuroraInspectorRow label="kanal" value={shortId(channelProfileId)} />
        <AuroraInspectorRow label="proje" value={shortId(contentProjectId)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Stil">
        <AuroraInspectorRow label="alt bant" value={lowerThirdStyle || "—"} />
        <AuroraInspectorRow label="blueprint" value={shortId(styleBlueprintId)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-create-bulletin-wizard">
      <AuroraPageShell
        title="Yeni Haber Bülteni"
        description="Kanal → proje → stil → haber seçimine geç"
        breadcrumbs={[
          { label: "Projelerim", href: "/user/projects" },
          { label: "Yeni Bülten" },
        ]}
        actions={
          <AuroraButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
            İptal
          </AuroraButton>
        }
      >
        <Stepper steps={STEPS} current={step} />

        <AuroraCard pad="default" data-testid={`aurora-bulletin-step-${STEPS[step].id}`}>
          {stepContent}
        </AuroraCard>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            iconLeft={<Icon name="chevron-left" size={12} />}
          >
            Geri
          </AuroraButton>
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext()}
            iconRight={!isLast ? <Icon name="arrow-right" size={12} /> : undefined}
            data-testid="aurora-bulletin-next"
          >
            {isLast ? "Haber Seçimine Geç" : "Devam et"}
          </AuroraButton>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

interface KeyValueProps {
  k: string;
  v: string;
  mono?: boolean;
}

function KeyValue({ k, v, mono }: KeyValueProps) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ width: 100, color: "var(--text-muted)", flexShrink: 0 }}>{k}</span>
      <span
        style={{
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono, ui-monospace, monospace)" : "inherit",
          fontSize: mono ? 11 : 12,
        }}
      >
        {v}
      </span>
    </div>
  );
}

interface StepperProps {
  steps: readonly { id: string; label: string }[];
  current: number;
}

function Stepper({ steps, current }: StepperProps) {
  return (
    <ol
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        margin: "0 0 16px",
        padding: 0,
        listStyle: "none",
      }}
      data-testid="aurora-bulletin-stepper"
    >
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              border: "1px solid var(--border-default)",
              background: active
                ? "var(--accent-bg, var(--bg-elevated))"
                : done
                  ? "var(--bg-elevated)"
                  : "transparent",
              color: active
                ? "var(--accent-primary, var(--text-primary))"
                : done
                  ? "var(--text-secondary)"
                  : "var(--text-muted)",
            }}
            aria-current={active ? "step" : undefined}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: active
                  ? "var(--accent-primary, var(--bg-elevated))"
                  : done
                    ? "var(--state-success-bg, var(--bg-elevated))"
                    : "var(--bg-surface)",
                color:
                  active || done ? "var(--text-inverse, white)" : "var(--text-muted)",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-default)",
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
