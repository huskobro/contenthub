import { useNavigate } from "react-router-dom";
import { useCreateNewsItem } from "../../hooks/useCreateNewsItem";
import { NewsItemForm } from "../../components/news-items/NewsItemForm";
import type { NewsItemFormValues } from "../../components/news-items/NewsItemForm";
import { useToast } from "../../hooks/useToast";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (admin.news-items.create) varsa
 * onu kullanır; aksi halde legacy yüzeye düşer. (Register.tsx bu PR'da
 * dokunulmadığı için override şu an boş döner — sonraki kayıt aşamasında
 * AuroraNewsItemCreatePage otomatik devreye girer.)
 */
export function NewsItemCreatePage() {
  const Override = useSurfacePageOverride("admin.news-items.create");
  if (Override) return <Override />;
  return <LegacyNewsItemCreatePage />;
}

function LegacyNewsItemCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateNewsItem();

  function handleSubmit(values: NewsItemFormValues) {
    mutate(
      {
        title: values.title.trim(),
        url: values.url.trim(),
        status: values.status,
        source_id: values.source_id.trim() || null,
        summary: values.summary.trim() || null,
        language: values.language.trim() || null,
        category: values.category.trim() || null,
        published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
        dedupe_key: values.dedupe_key.trim() || null,
      },
      {
        onSuccess: (created) => {
          toast.success("Haber kaydi basariyla olusturuldu");
          navigate("/admin/news-items", { state: { selectedId: created.id } });
        },
      }
    );
  }

  return (
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-1">Yeni News Item</h2>
      <p className="m-0 mb-3 text-xs text-neutral-400">
        Yeni bir haber kaydi olusturun.
      </p>
      <NewsItemForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/news-items")}
        submitLabel="Oluştur"
      />
    </div>
  );
}
