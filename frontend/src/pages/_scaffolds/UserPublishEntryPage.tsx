/**
 * UserPublishEntryPage — TEST-ONLY SCAFFOLD (Phase Final F4 — relocated).
 *
 * ⚠️  BU SAYFA URETIM ROUTER'INDA MOUNT EDILMEZ. ⚠️
 *
 * Konum: `frontend/src/pages/_scaffolds/` — `_scaffolds/` klasor prefix'i
 * bu dosyanin urun router'inda mount edilmemesi gerektigini fiziksel olarak
 * isaretler. Phase Final F4'ten once `pages/UserPublishEntryPage.tsx`
 * konumundaydi; isim cakismasi + accidental-mount riski yuzunden buraya
 * tasindi.
 *
 * Amac: 13 smoke test dosyasinin (`user-*.smoke.test.tsx`,
 * `admin-continuity-strip.smoke.test.tsx`, `navigation-closure-pack`,
 * `final-ux-release-readiness-pack`, ...) navigation ve layout
 * kontratlarini kontrol edebilmesi icin minimal hedef sayfa olarak durur.
 * Uretim kullanicisinin gordugu `/user/publish` rotasi
 * `pages/user/UserPublishPage` bilesenine gider — bu dosya ile alakasi
 * YOKTUR.
 *
 * Non-negotiable kurallar (CLAUDE.md "no hidden behavior" + "no parallel
 * patterns" maddeleri):
 *   1. Bu dosyayi `router.tsx` veya `App.tsx`'te MOUNT ETMEYIN. `/user/publish`
 *      rotasi tek dogru bilesen (`UserPublishPage`) uzerinden akmalidir.
 *   2. Bu dosyaya admin-panel linki EKLEMEYIN. Faz AD'de admin-leak
 *      kapatildi — cross-role kontamine olmamasi icin koruyun.
 *   3. Bu dosyayi yeniden isimlendirmeyin / silmeyin. 13 test dosyasi bu
 *      bilesenin varligina + data-testid contract'ina bagli. Once testlerin
 *      yeni hedefini belirleyin, SONRA tasiyin.
 *   4. Yeni navigation kartlari veya CTA cesitleri "urun kullanicisi buradan
 *      akmali" varsayimiyla eklenemez — uretim akisi UserPublishPage'te.
 *
 * Faz gecmisi:
 *   - Faz AD: admin-leak kapatma (admin-panel linki kaldirildi)
 *   - Faz Final F2.5: scaffold oldugu denetlendi, router referansi yok
 *   - Faz Final F4: `pages/_scaffolds/` altina tasindi; 13 test import'u guncellendi
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
