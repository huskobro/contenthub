/**
 * PromptBlockList — renders grouped list of PromptBlockCard components.
 * Groups blocks by group_name: Core, Behavior, Context, Output.
 */

import { useState } from "react";
import { usePromptBlocksList } from "../../hooks/usePromptBlocks";
import { PromptBlockCard } from "./PromptBlockCard";
import { PromptBlockDetailPanel } from "./PromptBlockDetailPanel";
import type { PromptBlockResponse } from "../../api/promptAssemblyApi";
import { Skeleton } from "../design-system/Skeleton";

const GROUP_ORDER = ["core", "behavior", "context", "output"];

function groupLabel(group: string): string {
  const labels: Record<string, string> = {
    core: "Core",
    behavior: "Behavior",
    context: "Context",
    output: "Output",
  };
  return labels[group.toLowerCase()] ?? group;
}

interface PromptBlockListProps {
  moduleScope?: string;
}

export function PromptBlockList({ moduleScope }: PromptBlockListProps) {
  const { data: blocks, isLoading, isError } = usePromptBlocksList(moduleScope);
  const [selectedBlock, setSelectedBlock] = useState<PromptBlockResponse | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-2" data-testid="prompt-block-list-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="80px" rounded="md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-error text-sm" data-testid="prompt-block-list-error">
        Bloklar yüklenemedi.
      </p>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <p className="text-neutral-500 text-sm py-4 text-center" data-testid="prompt-block-list-empty">
        Bu kapsam için prompt bloğu bulunamadı.
      </p>
    );
  }

  // Group blocks
  const grouped: Record<string, PromptBlockResponse[]> = {};
  for (const block of blocks) {
    const g = block.group_name?.toLowerCase() ?? "other";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(block);
  }

  // Sort each group by order_index
  for (const g of Object.keys(grouped)) {
    grouped[g].sort((a, b) => a.order_index - b.order_index);
  }

  // Ordered group keys
  const allGroups = [
    ...GROUP_ORDER.filter((g) => g in grouped),
    ...Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g)),
  ];

  return (
    <>
      <div className="grid gap-5" data-testid="prompt-block-list">
        {allGroups.map((group) => (
          <div key={group}>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              {groupLabel(group)}{" "}
              <span className="text-neutral-400 font-normal normal-case">
                ({grouped[group].length})
              </span>
            </h4>
            <div className="grid gap-2">
              {grouped[group].map((block) => (
                <PromptBlockCard
                  key={block.id}
                  block={block}
                  onClick={setSelectedBlock}
                  selected={selectedBlock?.id === block.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedBlock && (
        <PromptBlockDetailPanel
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onUpdate={(updated) => setSelectedBlock(updated)}
        />
      )}
    </>
  );
}
