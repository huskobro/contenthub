import { useQuery } from "@tanstack/react-query";
import { fetchStyleBlueprints, type StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { StyleBlueprintPreviewCard } from "./StyleBlueprintPreviewCard";

interface StyleBlueprintSelectorProps {
  value: string | null;
  onChange: (blueprintId: string | null) => void;
  moduleScope?: string;
}

export function StyleBlueprintSelector({
  value,
  onChange,
  moduleScope,
}: StyleBlueprintSelectorProps) {
  const { data: blueprints, isLoading, isError } = useQuery({
    queryKey: ["style-blueprints", { status: "active", module_scope: moduleScope }],
    queryFn: () =>
      fetchStyleBlueprints({
        status: "active",
        module_scope: moduleScope || undefined,
      }),
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-400 m-0">Stil sablonlari yukleniyor...</p>;
  }

  if (isError) {
    return <p className="text-sm text-neutral-400 m-0">Stil sablonlari yuklenemedi.</p>;
  }

  const items = Array.isArray(blueprints) ? blueprints : [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500 m-0">
        Aktif stil sablonu bulunamadi. Stil yonetiminden ekleyebilirsiniz.
      </p>
    );
  }

  return (
    <div data-testid="blueprint-selector">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {items.map((b: StyleBlueprintResponse) => (
          <StyleBlueprintPreviewCard
            key={b.id}
            blueprint={b}
            selected={value === b.id}
            onClick={() => onChange(value === b.id ? null : b.id)}
          />
        ))}
      </div>
      <p className="m-0 mt-2 text-[10px] text-neutral-400">
        Preview &mdash; son cikti farkli olabilir. Stil secimi opsiyoneldir.
      </p>
    </div>
  );
}
