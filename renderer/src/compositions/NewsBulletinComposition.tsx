/**
 * NewsBulletin composition bileseni — M28.
 *
 * composition_props.json'dan gelen props ile haber bulteni video render eder.
 * Guvenli composition mapping: composition_map.py icindeki "NewsBulletin" ID ile eslesir.
 *
 * Props kaynagi:
 *   backend/app/modules/news_bulletin/executors/composition.py -> composition_props.json
 *   backend RenderStepExecutor -> word_timing.json okunur -> wordTimings inline gecirilir
 *
 * V1 Combined Render:
 *   Tum haberler tek video icinde sirayla render edilir.
 *   Her haber arasinda basit cut gecis.
 *   Haber basligi overlay olarak gosterilir.
 *   Narration ses olarak calar, altyazi senkron gosterilir.
 *
 * M29+ genisletme alanlari:
 *   - Per-category render mode
 *   - Lower-third, ticker, live badge
 *   - Gorseller (imagePath per item)
 */

import {
  AbsoluteFill,
  Audio,
  Sequence,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Props tipi — composition_props.json -> props alaniyla uyumlu
// ---------------------------------------------------------------------------

export interface BulletinItemProps {
  itemNumber: number;
  headline: string;
  narration: string;
  audioPath: string | null;
  imagePath: string | null;
  durationSeconds: number;
  category?: string;
}

export interface SubtitleStyle {
  preset_id: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  position: string;
}

export interface NewsBulletinProps {
  bulletinTitle: string;
  items: BulletinItemProps[];
  subtitlesSrt: string | null;
  wordTimingPath?: string | null;
  /** Kelime zamanlama verisi — backend word_timing.json'dan okuyup inline gecirir. */
  wordTimings?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  timingMode: "cursor" | "whisper_word" | "whisper_segment";
  subtitleStyle: SubtitleStyle;
  totalDurationSeconds: number;
  language: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags?: string[];
  };
}

// ---------------------------------------------------------------------------
// Varsayilan props (Remotion Studio icin)
// ---------------------------------------------------------------------------

export const defaultNewsBulletinProps: NewsBulletinProps = {
  bulletinTitle: "Haber Bulteni",
  items: [
    {
      itemNumber: 1,
      headline: "Ornek Haber Basligi",
      narration: "Bu bir ornek narration metnidir.",
      audioPath: null,
      imagePath: null,
      durationSeconds: 10,
      category: "genel",
    },
  ],
  subtitlesSrt: null,
  wordTimings: [],
  timingMode: "cursor",
  subtitleStyle: {
    preset_id: "default",
    fontSize: 36,
    fontColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.7)",
    position: "bottom",
  },
  totalDurationSeconds: 10,
  language: "tr",
  metadata: {
    title: "Ornek Bulten",
    description: "Ornek bulten aciklamasi",
    tags: ["haber", "gundem"],
    hashtags: ["#haber"],
  },
};

// ---------------------------------------------------------------------------
// Composition bileseni
// ---------------------------------------------------------------------------

export const NewsBulletinComposition: React.FC<NewsBulletinProps> = (props) => {
  const { fps } = useVideoConfig();
  const { items, bulletinTitle, subtitleStyle } = props;

  // Her item icin frame offset hesapla
  let currentFrame = 0;
  const itemSequences = items.map((item, index) => {
    const durationFrames = Math.max(
      Math.round(item.durationSeconds * fps),
      fps, // Minimum 1 saniye
    );
    const startFrame = currentFrame;
    currentFrame += durationFrames;

    return (
      <Sequence
        key={`item-${item.itemNumber}`}
        from={startFrame}
        durationInFrames={durationFrames}
        name={`Haber ${item.itemNumber}`}
      >
        <AbsoluteFill
          style={{
            backgroundColor: "#1a1a2e",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: 60,
          }}
        >
          {/* Haber numarasi badge */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              backgroundColor: "#e94560",
              color: "#FFFFFF",
              padding: "8px 20px",
              borderRadius: 4,
              fontSize: 18,
              fontWeight: "bold",
              fontFamily: "sans-serif",
            }}
          >
            {index + 1} / {items.length}
          </div>

          {/* Baslik */}
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: 48,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              textAlign: "center",
              lineHeight: 1.3,
              maxWidth: "80%",
              margin: 0,
            }}
          >
            {item.headline}
          </h2>

          {/* Narration metni (altyazi olarak) */}
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 40,
              right: 40,
              backgroundColor: subtitleStyle.backgroundColor,
              color: subtitleStyle.fontColor,
              fontSize: subtitleStyle.fontSize,
              fontFamily: "sans-serif",
              padding: "16px 24px",
              borderRadius: 8,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {item.narration}
          </div>

          {/* Kategori etiketi */}
          {item.category && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 40,
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#FFFFFF",
                padding: "6px 16px",
                borderRadius: 4,
                fontSize: 14,
                fontFamily: "sans-serif",
                textTransform: "uppercase",
              }}
            >
              {item.category}
            </div>
          )}

          {/* Audio */}
          {item.audioPath && (
            <Audio src={item.audioPath} />
          )}
        </AbsoluteFill>
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f23" }}>
      {/* Bulten basligi (ilk 2 saniye) */}
      <Sequence from={0} durationInFrames={fps * 2} name="Bulten Basligi">
        <AbsoluteFill
          style={{
            backgroundColor: "#16213e",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            {bulletinTitle}
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* Haber item'lari — title'dan sonra baslar */}
      <Sequence from={fps * 2} name="Haberler">
        <AbsoluteFill>
          {itemSequences}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
