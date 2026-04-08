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
import { NewsItemIntro } from "../templates/news-bulletin/components/NewsItemIntro";
import { BULLETIN_ACCENT, resolveAccent } from "../templates/news-bulletin/shared/palette";
import { getLabel } from "../templates/news-bulletin/utils/localization";
import type { CategoryStyleMapping } from "../templates/news-bulletin/components/StudioBackground";
import type { SubtitleEntry, SubtitleWord } from "../templates/news-bulletin/shared/subtitle-renderer";

// ---------------------------------------------------------------------------
// M41c: SRT → SubtitleEntry[] per-item karaoke builder
// ---------------------------------------------------------------------------

interface RawSrtEntry { startSec: number; endSec: number; text: string; }

function parseSrtToRaw(srt: string): RawSrtEntry[] {
  const entries: RawSrtEntry[] = [];
  const blocks = srt.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const match = lines[1]?.match(
      /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/
    );
    if (!match) continue;
    const startSec = +match[1] * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000;
    const endSec   = +match[5] * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000;
    const text     = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text) entries.push({ startSec, endSec, text });
  }
  return entries;
}

/**
 * Global SRT + wordTimings → per-item SubtitleEntry[] array.
 * contentFromSec / contentToSec: item'ın timeline içindeki zaman dilimi (saniye).
 * Dönen entries'in startFrame/endFrame item'ın kendi Sequence scope'una göre (0-indexed).
 */
function buildItemSubtitles(
  srtEntries: RawSrtEntry[],
  wordTimings: Array<{ word: string; start: number; end: number; scene?: number }>,
  contentFromSec: number,
  contentToSec: number,
  fps: number,
): SubtitleEntry[] {
  const result: SubtitleEntry[] = [];
  for (const e of srtEntries) {
    // SRT entry item'ın zaman dilimiyle örtüşüyor mu?
    if (e.endSec <= contentFromSec || e.startSec >= contentToSec) continue;

    // Item-relative zamanlar
    const relStart = Math.max(0, e.startSec - contentFromSec);
    const relEnd   = Math.min(contentToSec - contentFromSec, e.endSec - contentFromSec);
    const startFrame = Math.round(relStart * fps);
    const endFrame   = Math.round(relEnd * fps);

    // Bu zaman dilimine giren kelimeleri bul
    const words: SubtitleWord[] = wordTimings
      .filter(w => w.start < e.endSec && w.end > e.startSec)
      .map(w => ({
        word: w.word,
        startFrame: Math.round(Math.max(0, w.start - contentFromSec) * fps),
        endFrame:   Math.round(Math.max(0, w.end   - contentFromSec) * fps),
      }));

    result.push({ text: e.text, startFrame, endFrame, words: words.length > 0 ? words : undefined });
  }
  return result;
}

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
  // --- M43: Yeni parametreler ---
  /** Ticker hızı (px/frame) */
  tickerSpeed?: number;
  /** Ticker arka plan rengi */
  tickerBgColor?: string;
  /** Ticker yazı rengi */
  tickerTextColor?: string;
  /** CANLI badge göster */
  showLiveBadge?: boolean;
  /** Kategori flash animasyonu göster */
  showCategoryFlash?: boolean;
  /** Kategori flash süresi (saniye) */
  categoryFlashDuration?: number;
  /** Haber giriş paneli göster */
  showItemIntro?: boolean;
  /** Haber giriş süresi (saniye) */
  itemIntroDuration?: number;
  /** Lower third font ailesi */
  lowerThirdFontFamily?: string;
  /** Lower third font boyutu */
  lowerThirdFontSize?: number;
  /** Lower third arka plan rengi */
  lowerThirdBgColor?: string;
  /** Lower third yazı rengi */
  lowerThirdTextColor?: string;
  /** Altyazı font ailesi */
  subtitleFontFamily?: string;
  /** Altyazı font boyutu */
  subtitleFontSize?: number;
  /** Altyazı arka plan rengi */
  subtitleBgColor?: string;
  /** Altyazı yazı rengi */
  subtitleTextColor?: string;
  /** Altyazı stroke rengi */
  subtitleStrokeColor?: string;
  /** Altyazı stroke kalınlığı */
  subtitleStrokeWidth?: number;
  /** Altyazı animasyon tipi */
  subtitleAnimation?: string;
  /** Ken Burns efekti */
  imageKenBurns?: boolean;
  /** Görsel geçiş tipi */
  imageTransition?: string;
  /** Otomatik layout seçimi */
  autoLayoutSelection?: boolean;
  /** Kategori stil eşleme tablosu (admin panelden) */
  categoryStyleMapping?: Record<string, { accent: string; bg: string; grid: string; label_tr?: string; label_en?: string }> | null;
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
    // M43: Yeni parametreler
    tickerSpeed,
    tickerBgColor,
    tickerTextColor,
    showLiveBadge = true,
    showCategoryFlash = true,
    categoryFlashDuration = 1.5,
    showItemIntro = true,
    itemIntroDuration = 2.0,
    lowerThirdFontFamily,
    lowerThirdFontSize,
    lowerThirdBgColor,
    lowerThirdTextColor,
    imageKenBurns = true,
    imageTransition,
    autoLayoutSelection = true,
    categoryStyleMapping,
  } = props;

  const isPortrait = renderFormat === "portrait" || height > width;
  const NETWORK_BAR_HEIGHT = isPortrait ? NETWORK_BAR_HEIGHT_PORTRAIT : NETWORK_BAR_HEIGHT_LANDSCAPE;

  // M43: Dinamik flash/intro frame süreleri (setting'den)
  const FLASH_DUR_FRAMES = showCategoryFlash
    ? Math.round(categoryFlashDuration * fps)
    : 0;
  const INTRO_DUR_FRAMES = showItemIntro
    ? Math.round(itemIntroDuration * fps)
    : 0;

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

  // ── M41c: SRT karaoke — global SRT → per-item subtitle entries ──────────
  const srtRaw = props.subtitlesSrt ? parseSrtToRaw(props.subtitlesSrt) : [];
  const wt     = props.wordTimings ?? [];

  // ── Her item için frame ofseti ──────────────────────────────────────────
  const HEADLINES_START = fps * 2; // ilk 2s başlık kartı

  // Audio timeline cursor — SRT/wordTimings global audio zamanları kullanır.
  // Visual timeline ise HEADLINES_START + FLASH_DUR + INTRO_DUR ekler.
  // Bu iki timeline FARKLIDIR — subtitle filtreleme audio timeline'ı kullanmalı.
  let audioCursor = 0;
  let cumulativeOffset = HEADLINES_START;
  const sequenced = items.map((item, idx) => {
    const durationFrames = Math.max(Math.round(item.durationSeconds * fps), fps);

    // M43: Her item için visual timeline: [flash] → [intro] → [content]
    const flashFrom   = cumulativeOffset;
    const introFrom   = cumulativeOffset + FLASH_DUR_FRAMES;
    const contentFrom = cumulativeOffset + FLASH_DUR_FRAMES + INTRO_DUR_FRAMES;
    cumulativeOffset += FLASH_DUR_FRAMES + INTRO_DUR_FRAMES + durationFrames;

    // Per-item subtitle entries — AUDIO timeline zamanları kullanılmalı
    const audioFromSec = audioCursor / fps;
    const audioToSec   = (audioCursor + durationFrames) / fps;
    audioCursor += durationFrames;
    const itemSubtitles  = srtRaw.length > 0
      ? buildItemSubtitles(srtRaw, wt, audioFromSec, audioToSec, fps)
      : [];

    return { item, flashFrom, introFrom, contentFrom, durationFrames, idx, itemSubtitles };
  });

  // Aktif item stilini dinamik bar rengi için hesapla
  const activeSeq = [...sequenced].reverse().find(s => frame >= s.flashFrom) ?? sequenced[0];
  const activeItemStyle: BulletinStyle = activeSeq
    ? resolveBulletinStyle(activeSeq.item.category, defaultStyle)
    : defaultStyle;
  const activeAccent = resolveAccent(activeItemStyle, categoryStyleMapping);

  // Ticker içeriği
  const tickerData = tickerItems && tickerItems.length > 0
    ? tickerItems.map(t => ({ text: t }))
    : items.map(item => ({ text: item.headline }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* L1: Animasyonlu arka plan — categoryStyleMapping ile dinamik renk */}
      <StudioBackground style={activeItemStyle} categoryStyleMapping={categoryStyleMapping} />

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
        {/* M43: CANLI badge */}
        {showLiveBadge && (
          <div style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: isPortrait ? 10 : 14,
              height: isPortrait ? 10 : 14,
              borderRadius: "50%",
              backgroundColor: "#DC2626",
              boxShadow: "0 0 12px #DC262688",
              animation: "pulse 1.5s ease infinite",
            }} />
            <span style={{
              color: "#FFFFFF",
              fontSize: isPortrait ? 16 : 22,
              fontFamily: '"Bebas Neue", sans-serif',
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}>
              {lang === "tr" ? "CANLI" : "LIVE"}
            </span>
          </div>
        )}
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

      {/* L5: Haberler — [CategoryFlash] → [NewsItemIntro] → HeadlineCard + lower-third */}
      {sequenced.map(({ item, flashFrom, introFrom, contentFrom, durationFrames, idx, itemSubtitles }) => {
        const itemStyle  = resolveBulletinStyle(item.category, defaultStyle);
        const itemAccent = resolveAccent(itemStyle, categoryStyleMapping);
        const itemLabel  = getLabel(itemStyle, lang);

        // M43: Kategori bg rengi (categoryStyleMapping'den)
        const itemBg = categoryStyleMapping?.[itemStyle]?.bg;

        return (
          <React.Fragment key={idx}>
            {/* M43: Kategori flash — showCategoryFlash ise */}
            {showCategoryFlash && FLASH_DUR_FRAMES > 0 && (
              <Sequence from={flashFrom} durationInFrames={FLASH_DUR_FRAMES} name={`Flash ${idx + 1}`}>
                <CategoryFlash
                  label={itemLabel}
                  accent={itemAccent}
                  isPortrait={isPortrait}
                  durationFrames={FLASH_DUR_FRAMES}
                />
              </Sequence>
            )}

            {/* M43: Haber giriş paneli — showItemIntro ise */}
            {showItemIntro && INTRO_DUR_FRAMES > 0 && (
              <Sequence from={introFrom} durationInFrames={INTRO_DUR_FRAMES} name={`Intro ${idx + 1}`}>
                <NewsItemIntro
                  itemNumber={item.itemNumber}
                  headline={item.headline}
                  accent={itemAccent}
                  bgColor={itemBg}
                  networkName={networkName ?? channelName}
                  isPortrait={isPortrait}
                />
              </Sequence>
            )}

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
                  subtitles:    itemSubtitles.length > 0 ? itemSubtitles : undefined,
                }}
                index={idx}
                isPortrait={isPortrait}
                imageKenBurns={imageKenBurns}
                categoryStyleMapping={categoryStyleMapping}
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
                  accent={itemAccent}
                  fontFamily={lowerThirdFontFamily}
                  fontSize={lowerThirdFontSize}
                  bgColor={lowerThirdBgColor}
                  textColor={lowerThirdTextColor}
                />
              )}
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* L6: Alt ticker — frame 30'dan itibaren */}
      {showTicker !== false && tickerData.length > 0 && (
        <Sequence from={30} name="Ticker">
          <NewsTicker
            items={tickerData}
            style={activeItemStyle}
            lang={lang}
            isPortrait={isPortrait}
            tickerSpeed={tickerSpeed}
            tickerBgColor={tickerBgColor}
            tickerTextColor={tickerTextColor}
            categoryStyleMapping={categoryStyleMapping}
          />
        </Sequence>
      )}

    </AbsoluteFill>
  );
};
