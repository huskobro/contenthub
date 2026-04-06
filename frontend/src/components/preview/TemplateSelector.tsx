import { useQuery } from "@tanstack/react-query";
import { fetchTemplates, type TemplateResponse } from "../../api/templatesApi";
import { TemplatePreviewCard } from "./TemplatePreviewCard";

interface TemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null) => void;
  moduleScope?: string;
  templateType?: string;
}

export function TemplateSelector({
  value,
  onChange,
  moduleScope,
  templateType,
}: TemplateSelectorProps) {
  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ["templates", { status: "active", module_scope: moduleScope, template_type: templateType }],
    queryFn: () =>
      fetchTemplates({
        status: "active",
        module_scope: moduleScope || undefined,
        template_type: templateType || undefined,
      }),
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-400 m-0">Sablonlar yukleniyor...</p>;
  }

  if (isError) {
    return <p className="text-sm text-neutral-400 m-0">Sablonlar yuklenemedi.</p>;
  }

  const items = Array.isArray(templates) ? templates : [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500 m-0">
        Aktif sablon bulunamadi. Sablon yonetiminden ekleyebilirsiniz.
      </p>
    );
  }

  return (
    <div data-testid="template-selector">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {items.map((t: TemplateResponse) => (
          <TemplatePreviewCard
            key={t.id}
            template={t}
            selected={value === t.id}
            onClick={() => onChange(value === t.id ? null : t.id)}
          />
        ))}
      </div>
      <p className="m-0 mt-2 text-[10px] text-neutral-400">
        Preview &mdash; son cikti farkli olabilir. Sablon secimi opsiyoneldir.
      </p>
    </div>
  );
}
