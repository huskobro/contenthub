/**
 * NewsBulletinStyleTest — 9 bulletin stili için test composition'ları.
 *
 * Remotion Studio'da her stil ayrı bir composition olarak görünür:
 *   NewsBulletin_Test_breaking
 *   NewsBulletin_Test_tech
 *   NewsBulletin_Test_corporate
 *   NewsBulletin_Test_sport
 *   NewsBulletin_Test_finance
 *   NewsBulletin_Test_weather
 *   NewsBulletin_Test_science
 *   NewsBulletin_Test_entertainment
 *   NewsBulletin_Test_dark
 *
 * SADECE geliştirme/test için — production build'e dahil edilmez.
 * Root.tsx'te DEV_MODE guard ile kayıt edilir.
 */

import { NewsBulletinComposition, type NewsBulletinProps } from "./NewsBulletinComposition";
import type { BulletinStyle } from "../templates/news-bulletin/components/StudioBackground";

// ---------------------------------------------------------------------------
// Test içeriği
// ---------------------------------------------------------------------------

const TEST_ITEMS_FOR_STYLE = (style: BulletinStyle): NewsBulletinProps["items"] => [
  {
    itemNumber: 1,
    headline: styleHeadline(style, 1),
    narration: styleNarration(style, 1),
    audioPath: null,
    imagePath: null,
    durationSeconds: 6,
    category: styleCategory(style),
  },
  {
    itemNumber: 2,
    headline: styleHeadline(style, 2),
    narration: styleNarration(style, 2),
    audioPath: null,
    imagePath: null,
    durationSeconds: 5,
    category: styleCategory(style),
  },
  {
    itemNumber: 3,
    headline: styleHeadline(style, 3),
    narration: styleNarration(style, 3),
    audioPath: null,
    imagePath: null,
    durationSeconds: 5,
    category: styleCategory(style),
  },
];

function styleHeadline(style: BulletinStyle, n: number): string {
  const headlines: Record<BulletinStyle, string[]> = {
    breaking:      ["SON DAKİKA: Kritik Gelişme Yaşandı", "Acil Açıklama Yapıldı", "Olağanüstü Toplantı Kararlaştırıldı"],
    tech:          ["Yapay Zeka Yeni Rekoru Kırdı", "Büyük Teknoloji Şirketi Satın Alındı", "Kuantum Bilgisayar Lansmanı Yapıldı"],
    corporate:     ["Merkez Bankası Faiz Kararını Açıkladı", "Yıllık Rapor Kamuoyuyla Paylaşıldı", "Yönetim Kurulu Seçimleri Tamamlandı"],
    sport:         ["Milli Takım Finalde!", "Dünya Rekoru Kırıldı", "Şampiyonluk Kupası Törenle Teslim Edildi"],
    finance:       ["Borsa Tarihi Zirvede", "Döviz Kurunda Sert Hareket", "Merkez Bankası Rezervleri Açıklandı"],
    weather:       ["Büyük Fırtına Yaklaşıyor", "Kar Yağışı Tüm Yurdu Etkisi Altına Aldı", "Sıcaklıklar 10 Derece Düşecek"],
    science:       ["Mars'ta Su İzine Ulaşıldı", "Yeni Aşı Geliştirme Süreci Başladı", "Uzay Teleskobu İlk Görüntüleri Gönderdi"],
    entertainment: ["Yılın En Çok İzlenen Filmi Belli Oldu", "Ödül Töreni Coşkuyla Gerçekleşti", "Yeni Albüm Müzik Tarihine Geçti"],
    dark:          ["Günün Öne Çıkan Haberleri", "Haftanın Manşetleri", "Gündeme Damga Vuran Gelişmeler"],
  };
  return headlines[style][n - 1] ?? `Haber ${n}`;
}

function styleNarration(style: BulletinStyle, n: number): string {
  const base: Record<BulletinStyle, string> = {
    breaking:      "Gelişmeler an be an takip ediliyor. Yetkililer açıklama yapmaya hazırlanıyor.",
    tech:          "Sektör uzmanları bu gelişmenin teknoloji dünyasında derin izler bırakacağını vurguluyor.",
    corporate:     "Karar, piyasalarda olumlu karşılandı. Uzmanlar beklentilerin üzerinde bir performans olduğunu belirtiyor.",
    sport:         "Taraftarlar büyük bir coşkuyla kutlama yapıyor. Teknik direktör başarıyı takım çalışmasına bağladı.",
    finance:       "Analistler bu hareketin kısa vadeli etkisinin sınırlı kalacağını öngörüyor.",
    weather:       "Vatandaşlar önlemlerini alarak gereksiz yolculuklardan kaçınmalı.",
    science:       "Araştırmacılar bulgular hakkında uluslararası bilim camiasının yoğun ilgisiyle karşılaştı.",
    entertainment: "Organizatörler bu yılın katılımının tüm zamanların rekoru kırdığını açıkladı.",
    dark:          "Ayrıntılı bilgi için haber akışını takip etmeye devam edin.",
  };
  return `${base[style]} (Haber ${n})`;
}

function styleCategory(style: BulletinStyle): string {
  const categories: Record<BulletinStyle, string> = {
    breaking:      "gundem",
    tech:          "teknoloji",
    corporate:     "kurumsal",
    sport:         "spor",
    finance:       "ekonomi",
    weather:       "hava",
    science:       "bilim",
    entertainment: "magazin",
    dark:          "gundem",
  };
  return categories[style];
}

// ---------------------------------------------------------------------------
// Her stil için props üretici
// ---------------------------------------------------------------------------

export function makeTestProps(style: BulletinStyle, networkName?: string): NewsBulletinProps {
  const items = TEST_ITEMS_FOR_STYLE(style);
  const totalDurationSeconds = items.reduce((s, i) => s + i.durationSeconds, 0);

  return {
    bulletinTitle:        networkName ?? "ContentHub Test",
    bulletinStyle:        style,
    networkName:          networkName ?? "ContentHub Haber",
    showTicker:           true,
    tickerItems:          null,
    items,
    subtitlesSrt:         null,
    wordTimings:          [],
    timingMode:           "cursor",
    subtitleStyle: {
      preset_id:     "clean_white",
      font_size:     36,
      font_weight:   "600",
      text_color:    "#FFFFFF",
      active_color:  "#FFD700",
      background:    "rgba(0,0,0,0.35)",
      outline_width: 2,
      outline_color: "#000000",
      line_height:   1.4,
    },
    totalDurationSeconds,
    language:             "tr",
    lowerThirdStyle:      "broadcast",
    renderMode:           "combined",
    metadata: {
      title:       `${style} stil testi`,
      description: `${style} stilinin görsel testi`,
      tags:        ["test", style],
      hashtags:    [],
    },
  };
}

// Dışa aktarılan test prop setleri — Root.tsx'te Composition.defaultProps için
export const TEST_PROPS: Record<BulletinStyle, NewsBulletinProps> = {
  breaking:      makeTestProps("breaking"),
  tech:          makeTestProps("tech"),
  corporate:     makeTestProps("corporate"),
  sport:         makeTestProps("sport"),
  finance:       makeTestProps("finance"),
  weather:       makeTestProps("weather"),
  science:       makeTestProps("science"),
  entertainment: makeTestProps("entertainment"),
  dark:          makeTestProps("dark"),
};

// Re-export component for Root.tsx registration
export { NewsBulletinComposition as NewsBulletinStyleTestComposition };
