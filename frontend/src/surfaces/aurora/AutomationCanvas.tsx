/**
 * Aurora AutomationCanvas — fixed-shape pipeline canvas for Automation Center.
 *
 * Why fixed-shape:
 *  Each content module ships a canonical node sequence (brief → script →
 *  metadata → tts → visuals → render → publish for standard_video). The
 *  user does NOT compose a free DAG; they configure each known node.
 *  This keeps the surface deterministic, auditable, and snapshot-lockable.
 *
 * Visual contract (Aurora Dusk):
 *  - Node card per node, vertical column layout (top-to-bottom).
 *  - Each card shows TWO badges side-by-side: status + operation_mode.
 *    The two answer different questions ("ready to run?" vs "manual or
 *    AI?") and we never collapse them into a single chip.
 *  - Edges are simple connector glyphs between cards (▾) — no SVG bezier.
 *    A real graph engine is over-spec for a fixed pipeline.
 *  - Node card is a button: click selects it (parent renders the
 *    AuroraInspector for editing).
 *
 * Accessibility:
 *  - Each node renders a real <button> so keyboard + screen readers can
 *    navigate the canvas natively. role="listbox" / "option" was tempting
 *    but overkill — the inspector reveals the affordance.
 */
import type { CSSProperties, KeyboardEvent } from "react";
import type {
  AutomationNode,
  AutomationEdge,
  NodeBadge,
  NodeOperationMode,
  NodeStatus,
} from "../../api/automationCenterApi";
import { AuroraStatusChip } from "./primitives";
import type { AuroraStatusTone } from "./primitives";

// ---------------------------------------------------------------------------
// Status / mode → tone mapping (one place, not scattered across pages)
// ---------------------------------------------------------------------------

function statusTone(status: NodeStatus): AuroraStatusTone {
  switch (status) {
    case "ready":
      return "info";
    case "complete":
      return "success";
    case "warning":
      return "warning";
    case "blocked":
      return "danger";
    case "disabled":
    default:
      return "neutral";
  }
}

function statusLabel(status: NodeStatus): string {
  switch (status) {
    case "ready":
      return "Hazır";
    case "complete":
      return "Tamamlandı";
    case "warning":
      return "Uyarı";
    case "blocked":
      return "Engelli";
    case "disabled":
      return "Devre dışı";
  }
}

function modeLabel(mode: NodeOperationMode): string {
  switch (mode) {
    case "manual":
      return "Manuel";
    case "ai_assist":
      return "AI Destekli";
    case "automatic":
      return "Otomatik";
  }
}

function modeTone(mode: NodeOperationMode): AuroraStatusTone {
  switch (mode) {
    case "manual":
      return "neutral";
    case "ai_assist":
      return "info";
    case "automatic":
      return "success";
  }
}

function badgeTone(tone: string): AuroraStatusTone {
  switch (tone) {
    case "ok":
      return "success";
    case "warn":
      return "warning";
    case "bad":
      return "danger";
    case "accent":
    case "info":
      return "info";
    case "neutral":
    default:
      return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AutomationCanvasProps {
  nodes: AutomationNode[];
  edges?: AutomationEdge[];
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string) => void;
  snapshotLocked?: boolean;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

function joinClass(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function AutomationCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  snapshotLocked = false,
  className,
  style,
  ...rest
}: AutomationCanvasProps) {
  if (nodes.length === 0) {
    return (
      <div
        className={joinClass("automation-canvas empty", className)}
        style={style}
        data-testid={rest["data-testid"]}
      >
        <span className="caption">
          Bu modülün otomasyon node şeması bulunamadı.
        </span>
      </div>
    );
  }

  // Map for quick lookup of which node has an outgoing edge.
  const outgoing = new Set<string>();
  if (edges) {
    for (const e of edges) outgoing.add(e.source);
  }

  const handleKey =
    (id: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelectNode(id);
      }
    };

  return (
    <div
      className={joinClass(
        "automation-canvas",
        snapshotLocked && "locked",
        className,
      )}
      style={style}
      data-testid={rest["data-testid"]}
      aria-label="Otomasyon akışı"
    >
      {snapshotLocked && (
        <div className="automation-canvas-lock-banner caption">
          Aktif çalışma var · düzenleme kilitli
        </div>
      )}
      {nodes.map((node, idx) => {
        const isLast = idx === nodes.length - 1;
        const isSelected = selectedNodeId === node.id;
        const showConnector = !isLast && outgoing.has(node.id);
        return (
          <div className="automation-canvas-node-wrap" key={node.id}>
            <button
              type="button"
              className={joinClass(
                "automation-canvas-node",
                isSelected && "selected",
                node.status === "blocked" && "is-blocked",
                node.status === "disabled" && "is-disabled",
                node.status === "complete" && "is-complete",
              )}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={handleKey(node.id)}
              aria-pressed={isSelected}
              aria-label={`${node.title} — ${statusLabel(node.status)}, ${modeLabel(
                node.operation_mode,
              )}`}
              data-node-id={node.id}
              data-status={node.status}
              data-mode={node.operation_mode}
            >
              <header className="automation-canvas-node-head">
                <span className="automation-canvas-node-scope overline">
                  {node.scope}
                </span>
                <h3 className="automation-canvas-node-title">{node.title}</h3>
              </header>

              <div className="automation-canvas-node-badges hstack">
                <AuroraStatusChip tone={statusTone(node.status)}>
                  {statusLabel(node.status)}
                </AuroraStatusChip>
                <AuroraStatusChip tone={modeTone(node.operation_mode)}>
                  {modeLabel(node.operation_mode)}
                </AuroraStatusChip>
              </div>

              {node.description && (
                <p className="automation-canvas-node-desc body-sm">
                  {node.description}
                </p>
              )}

              {node.badges && node.badges.length > 0 && (
                <ul className="automation-canvas-node-extras">
                  {node.badges.map((b: NodeBadge, bi: number) => (
                    <li key={`${b.label}-${bi}`}>
                      <AuroraStatusChip tone={badgeTone(b.tone)}>
                        {b.label}
                      </AuroraStatusChip>
                      {b.detail && (
                        <span className="caption automation-canvas-node-extra-detail">
                          {b.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {node.last_run_at && (
                <footer className="automation-canvas-node-foot caption">
                  Son çalıştırma:{" "}
                  <span className="mono">
                    {new Date(node.last_run_at).toLocaleString("tr-TR")}
                  </span>
                  {node.last_run_outcome && (
                    <span className="automation-canvas-node-outcome">
                      {" · "}
                      {node.last_run_outcome}
                    </span>
                  )}
                </footer>
              )}
            </button>

            {showConnector && (
              <div className="automation-canvas-connector" aria-hidden="true">
                <span className="automation-canvas-connector-line" />
                <span className="automation-canvas-connector-arrow">▾</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
