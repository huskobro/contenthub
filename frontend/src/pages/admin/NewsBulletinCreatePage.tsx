import { useNavigate } from "react-router-dom";
import { useCreateNewsBulletin } from "../../hooks/useCreateNewsBulletin";
import { NewsBulletinForm } from "../../components/news-bulletin/NewsBulletinForm";
import type { NewsBulletinFormValues } from "../../components/news-bulletin/NewsBulletinForm";

export function NewsBulletinCreatePage() {
  const navigate = useNavigate();
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
      <p className="m-0 mb-5 text-md text-neutral-600 leading-relaxed max-w-[640px]" data-testid="nb-create-subtitle">
        Haber bulteni uretim akisinin baslangic noktasi. Konu ve temel bilgileri
        girerek yeni bir bulten kaydi olusturun. Kaynaklardan gelen haberler
        secilerek bulten taslagi, script ve metadata adimlari ilerleyecektir.
      </p>
      <p className="m-0 mb-5 text-base text-neutral-500 leading-normal max-w-[640px]" data-testid="nb-create-workflow-chain">
        Uretim zinciri: Kaynak Tarama &rarr; Haber Secimi &rarr; Bulten Kaydi &rarr; Script &rarr; Metadata &rarr; Uretim.
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
