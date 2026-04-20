import { useNavigate } from "react-router-dom";
import { useCreateNewsBulletin } from "../../hooks/useCreateNewsBulletin";
import { NewsBulletinForm } from "../../components/news-bulletin/NewsBulletinForm";
import type { NewsBulletinFormValues } from "../../components/news-bulletin/NewsBulletinForm";
import { useToast } from "../../hooks/useToast";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (admin.news-bulletins.create)
 * varsa onu kullanır; aksi halde legacy yüzeye düşer. (Register.tsx bu PR'da
 * dokunulmaz — Aurora sayfası kayıt aşamasında otomatik devreye girer.)
 */
export function NewsBulletinCreatePage() {
  const Override = useSurfacePageOverride("admin.news-bulletins.create");
  if (Override) return <Override />;
  return <LegacyNewsBulletinCreatePage />;
}

function LegacyNewsBulletinCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useCreateNewsBulletin();

  function handleSubmit(values: NewsBulletinFormValues) {
    const dur = values.target_duration_seconds.trim();
    mutation.mutate(
      {
        topic: values.topic.trim(),
        title: values.title.trim() || undefined,
        brief: values.brief.trim() || undefined,
        target_duration_seconds: dur !== "" ? Number(dur) : null,
        language: values.language || undefined,
        tone: values.tone || undefined,
        bulletin_style: values.bulletin_style || undefined,
        source_mode: values.source_mode || undefined,
        selected_news_ids_json: values.selected_news_ids_json.trim() || null,
        status: values.status,
      },
      {
        onSuccess: (created) => {
          toast.success("Haber bulteni basariyla olusturuldu");
          navigate("/admin/news-bulletins", { state: { selectedId: created.id } });
        },
      }
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2" data-testid="nb-create-heading">
        Yeni Haber Bulteni
      </h2>
      <p className="m-0 mb-2 text-xs text-neutral-400" data-testid="nb-create-subtitle">
        Konu ve temel bilgileri girerek yeni bulten kaydi olusturun.
      </p>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="nb-create-workflow-chain">
        Kaynak Tarama &rarr; Haber Secimi &rarr; Bulten &rarr; Script &rarr; Metadata &rarr; Uretim
      </p>
      {mutation.isError && (
        <p className="text-error">Hata: kayıt oluşturulamadı.</p>
      )}
      <NewsBulletinForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/news-bulletins")}
        isSubmitting={mutation.isPending}
        submitLabel="Oluştur"
      />
    </div>
  );
}
