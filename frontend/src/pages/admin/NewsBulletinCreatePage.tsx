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
    <div style={{ padding: "1.5rem" }}>
      <h2
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}
        data-testid="nb-create-heading"
      >
        Yeni Haber Bulteni
      </h2>
      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "0.875rem",
          color: "#64748b",
          lineHeight: 1.6,
          maxWidth: "640px",
        }}
        data-testid="nb-create-subtitle"
      >
        Haber bulteni uretim akisinin baslangic noktasi. Konu ve temel bilgileri
        girerek yeni bir bulten kaydi olusturun. Kaynaklardan gelen haberler
        secilerek bulten taslagi, script ve metadata adimlari ilerleyecektir.
      </p>
      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="nb-create-workflow-chain"
      >
        Uretim zinciri: Kaynak Tarama → Haber Secimi → Bulten Kaydi → Script → Metadata → Uretim.
      </p>
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
