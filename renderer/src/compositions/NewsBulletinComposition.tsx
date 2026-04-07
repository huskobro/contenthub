/**
 * NewsBulletin composition bileşeni — M31 + M33 kategori stil sistemi.
 *
 * composition_props.json'dan gelen props ile haber bülteni video render eder.
 * Güvenli composition mapping: composition_map.py içindeki "NewsBulletin" ID ile eşleşir.
 *
 * Görsel stil sistemi (M33):
 *   9 kategori stili: breaking, tech, corporate, sport, finance, weather, science, entertainment, dark
 *   bulletinStyle prop ile kontrol edilir (backend composition executor'dan gelir).
 *   Her haber item'ı category field'ına göre otomatik stil alır.
 *
 * Backend props formatı (composition_props.json → props alanı):
 *   bulletinTitle         : string
 *   items                 : BulletinItemProps[]
 *   subtitlesSrt          : string | null
 *   wordTimingPath        : string | null
 *   wordTimings           : Array<{word, start, end, confidence?}>
 *   timingMode            : "cursor" | "whisper_word" | "whisper_segment"
 *   subtitleStyle         : SubtitleStyle
 *   totalDurationSeconds  : number
 *   language              : "tr" | "en"
 *   bulletinStyle         : string | null   (M33)
 *   networkName           : string | null   (M33)
 *   showTicker            : boolean         (M33)
 *   tickerItems           : string[] | null (M33)
 *   lowerThirdStyle       : string | null
 *   renderMode            : string | null
 *   metadata              : { title, description, tags, hashtags? }
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BulletinLowerThird } from "../components/BulletinLowerThird";
import { StudioBackground, BulletinStyle } from "../templates/news-bulletin/components/StudioBackground";
import { BreakingNewsOverlay } from "../templates/news-bulletin/components/BreakingNewsOverlay";
import { HeadlineCard } from "../templates/news-bulletin/components/HeadlineCard";
import { NewsTicker } from "../templates/news-bulletin/components/NewsTicker";
import { CategoryFlash, CATEGORY_FLASH_DUR } from "../templates/news-bulletin/components/CategoryFlash";
import { BULLETIN_ACCENT } from "../templates/news-bulletin/shared/palette";
import { getLabel } from "../templates/news-bulletin/utils/localization";

// ---------------------------------------------------------------------------
// Kategori → görsel stil çözümlemesi
// ---------------------------------------------------------------------------

const CATEGORY_TO_STYLE: Record<string, BulletinStyle> = {
  gundem:         "breaking",
  "son-dakika":   "breaking",
  sondakika:      "breaking",
  breaking:       "breaking",
  teknoloji:      "tech",
  tech:           "tech",
  bilim:          "science",
  science:        "science",
  ekonomi:        "finance",
  finans:         "finance",
  finance:        "finance",
  spor:           "sport",
  sport:          "sport",
  hava:           "weather",
  weather:        "weather",
  magazin:        "entertainment",
  entertainment:  "entertainment",
  eglen:          "entertainment",
  kurumsal:       "corporate",
  corporate:      "corporate",
};

function resolveBulletinStyle(category?: string, fallback: BulletinStyle = "breaking"): BulletinStyle {
  if (!category) return fallback;
  return CATEGORY_TO_STYLE[category.toLowerCase()] ?? fallback;
}

// ---------------------------------------------------------------------------
// Props tipleri (ContentHub composition contract)
// ---------------------------------------------------------------------------

/** M41: Per-item image timeline segmenti */
export interface ImageTimelineSegment {
  url: string;
  startSeconds: number;
  durationSeconds: number;
}

/** Backend composition_props.json → items[] elemanıyla birebir eşleşir. */
export interface BulletinItemProps {
  itemNumber: number;
  headline: string;
  narration: string;
  audioPath: string | null;
  imagePath: string | null;
  /** M41: Zaman bazlı görsel değişim planı */
  imageTimeline?: ImageTimelineSegment[] | null;
  durationSeconds: number;
  category?: string;
  /** M41: Haberin yayın tarihi (ISO string) */
  publishedAt?: string | null;
  /** M41: Kaynak ID */
  sourceId?: string | null;
  /** M41a: Kaynak adı (human-readable) */
  sourceName?: string | null;
}

export interface SubtitleStyle {
  preset_id: string;
  label?: string;
  font_size?: number;
  font_weight?: string;
  text_color?: string;
  active_color?: string;
  background?: string;
  outline_width?: number;
  outline_color?: string;
  line_height?: number;
  preset_fallback_used?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: string;
}

export interface NewsBulletinProps {
  bulletinTitle: string;
  items: BulletinItemProps[];
  subtitlesSrt: string | null;
  wordTimingPath?: string | null;
  wordTimings?: Array<{ word: string; start: number; end: number; confidence?: number }>;
  timingMode: "cursor" | "whisper_word" | "whisper_segment";
  subtitleStyle: SubtitleStyle;
  totalDurationSeconds: number;
  language: string;
  /** M33: YTRobot görsel stil — "breaking" | "tech" | "corporate" | ... */
  bulletinStyle?: string | null;
  /** M33: Üst bar kanal adı */
  networkName?: string | null;
  /** M33: Alt ticker göster */
  showTicker?: boolean;
  /** M33: Ticker metin listesi (null → başlıklardan otomatik üret) */
  tickerItems?: string[] | null;
  /** M31: lower-third bant stili */
  lowerThirdStyle?: string | null;
  /** M31: Render modu */
  renderMode?: "combined" | "per_category" | "per_item" | null;
  /** M41: Render formatı — "landscape" (16:9) veya "portrait" (9:16). Varsayılan: landscape. */
  renderFormat?: "landscape" | "portrait";
  /** M41: Haberlerde tarih göster (varsayılan: true) */
  showDate?: boolean;
  /** M41: Haberlerde kaynak göster (varsayılan: false) */
  showSource?: boolean;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags?: string[];
  };
}

// ---------------------------------------------------------------------------
// Varsayılan props (Remotion Studio önizlemesi için)
// ---------------------------------------------------------------------------

export const defaultNewsBulletinProps: NewsBulletinProps = {
  bulletinTitle:    "Haber Bülteni",
  bulletinStyle:    "breaking",
  networkName:      "ContentHub Haber",
  showTicker:       true,
  tickerItems:      null,
  items: [
    {
      itemNumber: 1,
      headline: "SON DAKİKA: Önemli Gelişme",
      narration: "Bu bir örnek narration metnidir. Sistemin testi yapılıyor.",
      audioPath: null,
      imagePath: null,
      durationSeconds: 10,
      category: "gundem",
    },
    {
      itemNumber: 2,
      headline: "EKONOMİDE YENİ ADIMLAR",
      narration: "Merkez Bankası kararını açıkladı, piyasalar hareketlendi.",
      audioPath: null,
      imagePath: null,
      durationSeconds: 8,
      category: "ekonomi",
    },
  ],
  subtitlesSrt:          null,
  wordTimings:           [],
  timingMode:            "cursor",
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
  totalDurationSeconds: 20,
  language:             "tr",
  lowerThirdStyle:      null,
  renderMode:           null,
  metadata: {
    title:       "Örnek Bülten",
    description: "Örnek bülten açıklaması",
    tags:        ["haber", "gundem"],
    hashtags:    ["#haber"],
  },
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const NETWORK_BAR_HEIGHT_LANDSCAPE = 96;
const NETWORK_BAR_HEIGHT_PORTRAIT = 64;

export const NewsBulletinComposition: React.FC<NewsBulletinProps> = (props) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const {
    items,
    bulletinTitle,
    bulletinStyle: rawBulletinStyle,
    networkName,
    showTicker = true,
    tickerItems,
    language = "tr",
    lowerThirdStyle,
    showDate = true,
    showSource = false,
    renderFormat,
  } = props;

  const isPortrait = renderFormat === "portrait" || height > width;
  const NETWORK_BAR_HEIGHT = isPortrait ? NETWORK_BAR_HEIGHT_PORTRAIT : NETWORK_BAR_HEIGHT_LANDSCAPE;

  // Genel bülten stili
  const defaultStyle: BulletinStyle =
    rawBulletinStyle && (rawBulletinStyle in BULLETIN_ACCENT)
      ? (rawBulletinStyle as BulletinStyle)
      : "breaking";

  const channelName = networkName || bulletinTitle || "ContentHub Haber";
  const lang = language === "en" ? "en" : "tr";

  // ── Network bar giriş animasyonu ──────────────────────────────────────────
  const barProgress = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const barY       = interpolate(barProgress, [0, 1], [-NETWORK_BAR_HEIGHT, 0]);
  const barOpacity = interpolate(barProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Logo nefes alma
  const breathe = interpolate(Math.sin((frame / 120) * Math.PI * 2), [-1, 1], [0.97, 1.03]);

  // ── Her item için frame ofseti ──────────────────────────────────────────
  const HEADLINES_START = fps * 2; // ilk 2s başlık kartı

  let cumulativeOffset = HEADLINES_START;
  const sequenced = items.map((item, idx) => {
    const durationFrames = Math.max(Math.round(item.durationSeconds * fps), fps);
    const flashFrom   = cumulativeOffset;
    const contentFrom = cumulativeOffset + CATEGORY_FLASH_DUR;
    cumulativeOffset += CATEGORY_FLASH_DUR + durationFrames;
    return { item, flashFrom, contentFrom, durationFrames, idx };
  });

  // Aktif item stilini dinamik bar rengi için hesapla
  const activeSeq = [...sequenced].reverse().find(s => frame >= s.flashFrom) ?? sequenced[0];
  const activeItemStyle: BulletinStyle = activeSeq
    ? resolveBulletinStyle(activeSeq.item.category, defaultStyle)
    : defaultStyle;
  const activeAccent = BULLETIN_ACCENT[activeItemStyle];

  // Ticker içeriği
  const tickerData = tickerItems && tickerItems.length > 0
    ? tickerItems.map(t => ({ text: t }))
    : items.map(item => ({ text: item.headline }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* L1: Animasyonlu arka plan */}
      <StudioBackground style={activeItemStyle} />

      {/* L2: Network üst bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: NETWORK_BAR_HEIGHT,
        background: `linear-gradient(to right, ${activeAccent} 0%, rgba(10,10,10,0.95) 60%, rgba(10,10,10,0.85) 100%)`,
        display: "flex", alignItems: "center", paddingLeft: 40, paddingRight: 40,
        transform: `translateY(${barY}px)`, opacity: barOpacity, zIndex: 10,
        borderBottom: `2px solid ${activeAccent}`,
        boxShadow: `0 4px 32px ${activeAccent}44`,
      }}>
        <span style={{
          color: "#FFFFFF", fontSize: isPortrait ? 28 : 44,
          fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
          letterSpacing: "0.14em", fontWeight: 900,
          transform: `scale(${breathe})`, display: "inline-block",
        }}>
          {channelName.toUpperCase()}
        </span>
      </div>

      {/* L3: Breaking overlay — yalnızca breaking stilinde, başlık kartı süresince
           M41 fix: overlay HEADLINES_START'ta sona erer (frame 60-80 çift gösterim giderildi) */}
      {defaultStyle === "breaking" && (
        <Sequence from={20} durationInFrames={Math.max(1, HEADLINES_START - 20)}>
          <BreakingNewsOverlay networkName={channelName} style={defaultStyle} lang={lang} isPortrait={isPortrait} />
        </Sequence>
      )}

      {/* L4: Bülten başlık kartı (ilk 2 saniye) */}
      <Sequence from={0} durationInFrames={HEADLINES_START} name="Bülten Başlığı">
        <AbsoluteFill style={{ backgroundColor: "transparent", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <h1 style={{
            color: "#FFFFFF", fontSize: isPortrait ? 52 : 80,
            fontFamily: '"Bebas Neue", "Oswald", Impact, sans-serif',
            fontWeight: 900, letterSpacing: "0.08em",
            textAlign: "center", textShadow: `0 0 60px ${activeAccent}88`,
            marginTop: isPortrait ? 48 : 96,
            padding: isPortrait ? "0 40px" : 0,
          }}>
            {bulletinTitle.toUpperCase()}
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* L5: Haberler — CategoryFlash + HeadlineCard + lower-third */}
      {sequenced.map(({ item, flashFrom, contentFrom, durationFrames, idx }) => {
        const itemStyle  = resolveBulletinStyle(item.category, defaultStyle);
        const itemAccent = BULLETIN_ACCENT[itemStyle];
        const itemLabel  = getLabel(itemStyle, lang);

        return (
          <React.Fragment key={idx}>
            {/* Kategori flash (1.5s) */}
            <Sequence from={flashFrom} durationInFrames={CATEGORY_FLASH_DUR} name={`Flash ${idx + 1}`}>
              <CategoryFlash label={itemLabel} accent={itemAccent} isPortrait={isPortrait} />
            </Sequence>

            {/* Haber içerik kartı */}
            <Sequence from={contentFrom} durationInFrames={durationFrames} name={`Haber ${idx + 1}`}>
              <HeadlineCard
                item={{
                  headline:     item.headline,
                  narration:    item.narration,
                  audioUrl:     item.audioPath,
                  bulletinStyle: itemStyle,
                  imagePath:    item.imagePath,
                  imageTimeline: item.imageTimeline,
                }}
                index={idx}
                isPortrait={isPortrait}
              />
              {/* Lower-third: lowerThirdStyle atanmışsa tüm haberlerde göster */}
              {lowerThirdStyle != null && lowerThirdStyle !== "" && (
                <BulletinLowerThird
                  headline={item.headline}
                  category={item.category}
                  itemNumber={item.itemNumber}
                  totalItems={items.length}
                  style={lowerThirdStyle}
                  publishedAt={item.publishedAt}
                  sourceName={item.sourceName}
                  showDate={showDate}
                  showSource={showSource}
                  isPortrait={isPortrait}
                />
              )}
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* L6: Alt ticker — frame 30'dan itibaren */}
      {showTicker !== false && tickerData.length > 0 && (
        <Sequence from={30} name="Ticker">
          <NewsTicker items={tickerData} style={activeItemStyle} lang={lang} isPortrait={isPortrait} />
        </Sequence>
      )}

    </AbsoluteFill>
  );
};
