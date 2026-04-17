/**
 * UserPublishEntryPage — PHASE AD / Phase Final F2.5.
 *
 * ⚠️  TEST-ONLY SCAFFOLD — NOT MOUNTED IN PRODUCTION ROUTER.
 *
 * Bu sayfa router.tsx'te mount EDILMEZ. `/user/publish` rotasi dogrudan
 * `pages/user/UserPublishPage` bilesenine gider. Bu dosya 12 smoke test
 * dosyasinin navigation/layout kontratlarini test etmek icin minimal bir
 * hedef sayfa olarak KORUNUR.
 *
 * Phase Final F2.5 denetimi:
 *   - Uretim router'inda referans yok (grep: router.tsx, App.tsx).
 *   - Icerik yalnizca 3 navigasyon karti (projects/content/publish) —
 *     admin-panel linki ICERMEZ (Faz AD'de admin-leak kapatildi).
 *   - Silinirse 12 smoke test dosyasi (user-*.smoke.test.tsx,
 *     admin-continuity-strip, navigation-closure-pack, etc.) bozulur —
 *     test kontrati yuzunden bu faza dahil edilmedi.
 *
 * Kural: Bu dosyayi router.tsx'te mount ETMEYIN. Kullanici yayin
 * akisini geliştirmek icin `pages/user/UserPublishPage` uzerinde
 * calisin.
 */
import { useNavigate } from "react-router-dom";

const PUBLISH_ENTRIES = [
  {
    icon: "P",
    iconBgClass: "bg-success-dark",
    title: "Projelerim",
    desc: "Uretim projelerini ve yayin hazirligini takip edin. Tamamlanan projeler yayin adimina hazirlanan iceriklerdir.",
    cta: "Projeleri Goruntule",
    to: "/user/projects",
    testId: "publish-entry-jobs",
  },
  {
    icon: "V",
    iconBgClass: "bg-brand-600",
    title: "Yeni Video",
    desc: "Yeni bir standart video veya haber bulteni baslatmak icin icerik ekranini kullanin. Uretim tamamlandiginda yayin adimi acilir.",
    cta: "Icerik Olustur",
    to: "/user/content",
    testId: "publish-entry-standard-videos",
  },
  {
    icon: "Y",
    iconBgClass: "bg-brand-700",
    title: "Yayin Kayitlari",
    desc: "Mevcut yayin kayitlarinizi (draft, pending, published) buradan yonetebilirsiniz.",
    cta: "Yayinlari Goruntule",
    to: "/user/publish",
    testId: "publish-entry-news-bulletins",
  },
];

export function UserPublishEntryPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 data-testid="publish-heading">Yayin</h2>
      <p className="m-0 mb-2 text-sm text-neutral-500" data-testid="publish-section-subtitle">
        Icerik yayin durumunu takip edin. Tamamlanan isler yonetim panelinden yayinlanabilir.
      </p>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="publish-workflow-chain">
        Uretim &rarr; Readiness &rarr; Metadata &rarr; YouTube Yayini &rarr; Sonuc Takibi
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-w-[720px]">
        {PUBLISH_ENTRIES.map((entry) => (
          <div
            key={entry.to}
            className="py-3 px-4 bg-surface-card border border-border rounded-lg cursor-pointer transition-colors duration-fast hover:border-brand-300"
            onClick={() => navigate(entry.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(entry.to)}
            data-testid={entry.testId}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold text-neutral-0 mb-3 ${entry.iconBgClass}`}>{entry.icon}</div>
            <p className="m-0 mb-1 text-lg font-semibold text-neutral-950">{entry.title}</p>
            <p className="m-0 text-base text-neutral-600 leading-normal">{entry.desc}</p>
            <span className="inline-block mt-3 text-base font-semibold text-brand-600">{entry.cta} &rarr;</span>
          </div>
        ))}
      </div>

      <div className="mt-4 py-2 px-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500 max-w-[720px]" data-testid="publish-first-use-note">
        Yayin sureci baslamadiysa once Icerik ekranindan icerik olusturun.
      </div>

      <div className="mt-4 text-base text-neutral-600 max-w-[720px]" data-testid="publish-crosslink-area">
        Hen&uuml;z icerik uretmediseniz once{" "}
        <button
          className="cursor-pointer text-brand-600 font-semibold bg-transparent border-none p-0 text-[inherit]"
          onClick={() => navigate("/user/content")}
          data-testid="publish-to-content-crosslink"
        >
          Icerik ekraninden baslayabilirsiniz
        </button>
        .
      </div>
    </div>
  );
}
