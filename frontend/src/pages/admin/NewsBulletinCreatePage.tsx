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
    <div>
      <h1>Yeni News Bulletin</h1>
      {mutation.isError && (
        <p style={{ color: "red" }}>Hata: kayıt oluşturulamadı.</p>
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
