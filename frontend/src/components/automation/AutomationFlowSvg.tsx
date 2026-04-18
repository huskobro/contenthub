/**
 * AutomationFlowSvg — Redesign REV-2 / P2.6.
 *
 * User otomasyon politikasinin checkpoint matrisinden saf SVG bir akis
 * gorseli cizer: Kaynak Tarama -> Taslak -> Render -> Yayin -> Yayin Sonrasi.
 * Her node bir kutu, mode'a gore renk ve durum etiketi tasir:
 *   - automatic      -> success yesil
 *   - manual_review  -> warning sari (insan eli gerekli ipucu)
 *   - disabled       -> neutral gri (akis kesilir, sonraki kutular disabled
 *                       olsa bile ayni sekilde gri gorunur, okunabilirlik icin)
 *
 * Dependency YOK: saf SVG + primitives (CLAUDE.md/MEMORY §5.1 agir dep
 * yasagina uyumlu). Drag-drop / canvas interaction yok — yalniz pasif gorsel
 * onizleme. Matris form her zaman kalir; SVG yan yana/ustunde aciklayici.
 *
 * Feature flag: `user.automation.flow_visual.enabled` (admin-only kill
 * switch; MVP'de `true` default). Bayrak kapali olursa `<UserAutomationPage>`
 * bu bileseni render etmez.
 */

import type { AutomationPolicyResponse, CheckpointMode } from "../../api/automationApi";

interface FlowNodeMeta {
  key: keyof Pick<
    AutomationPolicyResponse,
    | "source_scan_mode"
    | "draft_generation_mode"
    | "render_mode"
    | "publish_mode"
    | "post_publish_mode"
  >;
  label: string;
  short: string;
}

const FLOW_NODES: FlowNodeMeta[] = [
  { key: "source_scan_mode", label: "Kaynak Tarama", short: "Kaynak" },
  { key: "draft_generation_mode", label: "Taslak", short: "Taslak" },
  { key: "render_mode", label: "Render", short: "Render" },
  { key: "publish_mode", label: "Yayin", short: "Yayin" },
  { key: "post_publish_mode", label: "Yayin Sonrasi", short: "Sonrasi" },
];

const MODE_FILL: Record<CheckpointMode, string> = {
  automatic: "var(--color-success-light, #dcfce7)",
  manual_review: "var(--color-warning-light, #fef3c7)",
  disabled: "var(--color-neutral-100, #f3f4f6)",
};

const MODE_STROKE: Record<CheckpointMode, string> = {
  automatic: "var(--color-success, #16a34a)",
  manual_review: "var(--color-warning, #d97706)",
  disabled: "var(--color-neutral-300, #d1d5db)",
};

const MODE_TEXT: Record<CheckpointMode, string> = {
  automatic: "var(--color-success-dark, #166534)",
  manual_review: "var(--color-warning-dark, #92400e)",
  disabled: "var(--color-neutral-500, #6b7280)",
};

const MODE_BADGE: Record<CheckpointMode, string> = {
  automatic: "AUTO",
  manual_review: "ONAY",
  disabled: "KAPALI",
};

/**
 * Kutu boyutlari (SVG user units). Container responsive — viewBox
 * sabitli kalir, parent `max-w-full` ile olceklenir.
 */
const NODE_W = 120;
const NODE_H = 56;
const GAP = 24;
const TOTAL_W = FLOW_NODES.length * NODE_W + (FLOW_NODES.length - 1) * GAP;
const TOTAL_H = NODE_H + 28; // baslik satiri icin ust padding

interface AutomationFlowSvgProps {
  policy: AutomationPolicyResponse;
}

export function AutomationFlowSvg({ policy }: AutomationFlowSvgProps) {
  return (
    <div
      className="bg-white border border-neutral-200 rounded-md p-4"
      data-testid="automation-flow-svg-container"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="m-0 text-md font-semibold text-neutral-800">
          Akis Onizlemesi
        </h3>
        <span className="text-[10px] text-neutral-400">
          Kaynak &rarr; Yayin &rarr; Sonrasi
        </span>
      </div>
      <svg
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        role="img"
        aria-label="Otomasyon akis onizlemesi"
        data-testid="automation-flow-svg"
        className="max-w-full h-auto"
      >
        {/* Oklar (nodlar arasi) */}
        {FLOW_NODES.slice(0, -1).map((_, i) => {
          const x1 = (i + 1) * NODE_W + i * GAP;
          const x2 = x1 + GAP;
          const y = 14 + NODE_H / 2;
          return (
            <g key={`arrow-${i}`} data-testid={`automation-flow-arrow-${i}`}>
              <line
                x1={x1}
                y1={y}
                x2={x2 - 6}
                y2={y}
                stroke="var(--color-neutral-300, #d1d5db)"
                strokeWidth={1.5}
              />
              <polygon
                points={`${x2 - 6},${y - 4} ${x2},${y} ${x2 - 6},${y + 4}`}
                fill="var(--color-neutral-400, #9ca3af)"
              />
            </g>
          );
        })}

        {/* Nodlar */}
        {FLOW_NODES.map((node, i) => {
          const mode = policy[node.key] as CheckpointMode;
          const x = i * (NODE_W + GAP);
          const y = 14;
          return (
            <g
              key={node.key}
              data-testid={`automation-flow-node-${node.key}`}
            >
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                fill={MODE_FILL[mode]}
                stroke={MODE_STROKE[mode]}
                strokeWidth={1.5}
              />
              <text
                x={x + NODE_W / 2}
                y={y + 20}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={MODE_TEXT[mode]}
              >
                {node.label}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 38}
                textAnchor="middle"
                fontSize={9}
                fontWeight={500}
                fill={MODE_TEXT[mode]}
                opacity={0.75}
                data-testid={`automation-flow-badge-${node.key}`}
              >
                {MODE_BADGE[mode]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-3 mt-2 text-[10px] text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-success" />
          AUTO = Otomatik
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-warning" />
          ONAY = Manuel Onay
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-neutral-300" />
          KAPALI = Devre Disi
        </span>
      </div>
    </div>
  );
}
