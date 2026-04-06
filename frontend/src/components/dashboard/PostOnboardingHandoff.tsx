import { useNavigate } from "react-router-dom";

export function PostOnboardingHandoff() {
  const navigate = useNavigate();

  return (
    <div className="bg-neutral-0 border border-border-subtle rounded-xl p-8 max-w-[560px]" data-testid="post-onboarding-handoff">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
        <span className="text-base font-semibold text-success">Sistem Hazir</span>
      </div>

      <h3 className="m-0 mb-2 text-2xl font-bold text-neutral-900">Ilk Iceriginizi Olusturun</h3>
      <p className="m-0 mb-6 text-md text-neutral-700 leading-relaxed">
        Kurulumunuz tamamlandi. Video uretimi ana icerik akisinizdir.
        Haber bulteni ikinci uretim akisinizdir.
        Asagidaki seceneklerle ilk iceriginizi olusturabilir
        veya yonetim paneline giderek kaynak, sablon ve diger ayarlari
        yonetebilirsiniz.
      </p>

      <div className="flex items-center gap-2">
        <button
          className="inline-block px-5 py-2.5 text-md font-semibold text-neutral-0 bg-brand-600 border-none rounded-lg cursor-pointer hover:bg-brand-700 transition-colors duration-fast"
          onClick={() => navigate("/admin/standard-videos/new")}
          data-testid="handoff-create-content"
        >
          Yeni Video Olustur
        </button>
        <button
          className="inline-block px-5 py-2.5 text-md font-medium text-neutral-700 bg-transparent border border-border-subtle rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors duration-fast"
          onClick={() => navigate("/admin")}
          data-testid="handoff-go-admin"
        >
          Yonetim Paneline Git
        </button>
      </div>
    </div>
  );
}
