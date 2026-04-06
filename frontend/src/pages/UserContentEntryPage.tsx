import { useNavigate } from "react-router-dom";

const CONTENT_TYPES = [
  {
    icon: "V",
    iconBgClass: "bg-brand-600",
    title: "Standart Video",
    desc: "Ana uretim akisi: konu, baslik ve icerik bilgilerini girerek standart video uretimini baslatin. Uretim hattinda otomatik olarak islenir.",
    cta: "Yeni Video Olustur",
    to: "/admin/standard-videos/new",
    testId: "content-entry-standard-video",
  },
  {
    icon: "H",
    iconBgClass: "bg-brand-700",
    title: "Haber Bulteni",
    desc: "Ikinci uretim akisi: haber kaynaklarinizdan sectiginiz haberlerle bulten olusturun. Kaynak tarama, haber secimi, script ve metadata adimlari ilerleyecektir.",
    cta: "Yeni Bulten Olustur",
    to: "/admin/news-bulletins/new",
    testId: "content-entry-news-bulletin",
  },
];

export function UserContentEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 data-testid="content-heading">Icerik</h2>
      <p className="m-0 mb-6 text-lg text-neutral-700 leading-relaxed max-w-[720px]" data-testid="content-section-subtitle">
        Icerik uretim merkezi. Gorev zincirinizin ikinci adimi: bir tur
        secerek yeni icerik olusturma akisina baslayabilirsiniz. Tamamlanan
        icerikler Yayin ekraninda takip edilebilir.
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-w-[720px]">
        {CONTENT_TYPES.map((ct) => (
          <div
            key={ct.to}
            className="py-5 px-6 bg-neutral-0 border border-border-subtle rounded-[10px] cursor-pointer transition-colors duration-fast hover:border-brand-300"
            onClick={() => navigate(ct.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(ct.to)}
            data-testid={ct.testId}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-0 mb-3 ${ct.iconBgClass}`}>{ct.icon}</div>
            <p className="m-0 mb-1 text-lg font-semibold text-neutral-900">{ct.title}</p>
            <p className="m-0 text-base text-neutral-600 leading-normal">{ct.desc}</p>
            <span className="inline-block mt-3 text-base font-semibold text-brand-600">{ct.cta} &rarr;</span>
          </div>
        ))}
      </div>

      <div className="mt-6 py-3 px-4 bg-neutral-50 border border-border-subtle rounded-md text-base text-neutral-600 leading-normal max-w-[720px]" data-testid="content-first-use-note">
        Hen&uuml;z icerik olusturmadiyseniz, yukaridaki turlerden birini secerek
        ilk iceriginizi baslatabilirsiniz. Icerik olusturma akislari yonetim
        panelinde calismaktadir ve sectiginiz tur sizi ilgili olusturma
        ekranina yonlendirecektir.
      </div>

      <div className="mt-4 text-base text-neutral-600 max-w-[720px]" data-testid="content-crosslink-area">
        Iceriklerin yayin durumunu takip etmek icin{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/user/publish")}
          data-testid="content-to-publish-crosslink"
        >
          Yayin ekranina gecebilirsiniz
        </button>
        . Mevcut iceriklerinizi goruntulemek icin{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/admin/library")}
          data-testid="content-to-library-crosslink"
        >
          Icerik Kutuphanesine gidin
        </button>
        .
      </div>
    </div>
  );
}
