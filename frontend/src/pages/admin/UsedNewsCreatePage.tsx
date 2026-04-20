import { useNavigate } from "react-router-dom";
import { useCreateUsedNews } from "../../hooks/useCreateUsedNews";
import { UsedNewsForm } from "../../components/used-news/UsedNewsForm";
import type { UsedNewsFormValues } from "../../components/used-news/UsedNewsForm";
import { useToast } from "../../hooks/useToast";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (admin.used-news.create)
 * geçerliyse onu kullanır; aksi halde legacy yüzeye düşer. Override map
 * kaydı (register.tsx) ayrı bir iş kaleminde yapılacağı için bu hook
 * şimdilik null dönebilir; trampoline bu durumda legacy formu render eder.
 */
export function UsedNewsCreatePage() {
  const Override = useSurfacePageOverride("admin.used-news.create");
  if (Override) return <Override />;
  return <LegacyUsedNewsCreatePage />;
}

function LegacyUsedNewsCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateUsedNews();

  function handleSubmit(values: UsedNewsFormValues) {
    const payload = {
      news_item_id: values.news_item_id.trim(),
      usage_type: values.usage_type.trim(),
      target_module: values.target_module.trim(),
      usage_context: values.usage_context.trim() || null,
      target_entity_id: values.target_entity_id.trim() || null,
      notes: values.notes.trim() || null,
    };
    mutate(payload, {
      onSuccess: (created) => {
        toast.success("Kullanilmis haber kaydi basariyla olusturuldu");
        navigate("/admin/used-news", { state: { selectedId: created.id } });
      },
    });
  }

  return (
    <div className="max-w-[520px]">
      <h2 className="m-0 mb-5">Yeni Used News</h2>
      <UsedNewsForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : error ? String(error) : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/used-news")}
      />
    </div>
  );
}
