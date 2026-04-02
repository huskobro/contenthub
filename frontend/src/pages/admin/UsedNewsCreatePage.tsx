import { useNavigate } from "react-router-dom";
import { useCreateUsedNews } from "../../hooks/useCreateUsedNews";
import { UsedNewsForm } from "../../components/used-news/UsedNewsForm";
import type { UsedNewsFormValues } from "../../components/used-news/UsedNewsForm";

export function UsedNewsCreatePage() {
  const navigate = useNavigate();
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
        navigate("/admin/used-news", { state: { selectedId: created.id } });
      },
    });
  }

  return (
    <div style={{ maxWidth: "520px" }}>
      <h2 style={{ margin: "0 0 1.25rem" }}>Yeni Used News</h2>
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
