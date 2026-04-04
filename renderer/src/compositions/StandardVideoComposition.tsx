/**
 * StandardVideo composition bileşeni — M6-C2.
 *
 * composition_props.json'dan gelen props ile video render eder.
 * Güvenli composition mapping: composition_map.py içindeki "StandardVideo" ID ile eşleşir.
 *
 * Props kaynağı (tek ve resmi render sözleşmesi):
 *   backend/app/modules/standard_video/executors/composition.py → composition_props.json
 *   backend RenderStepExecutor → word_timing.json okunur → wordTimings inline geçirilir
 *
 * word_timing yükleme mimarisi (M6-C2):
 *   word_timing.json backend tarafında okunur (RenderStepExecutor.execute).
 *   Renderer'a fs okuma yaptırılmaz — props olarak WordTiming[] array'i geçirilir.
 *   Bu sayede renderer saf React bileşeni kalır.
 *
 * Sahne sırası:
 *   Her sahne, audio_path + image_path + duration_seconds içerir.
 *   duration_seconds → frame sayısına çevrilir (fps ile, calculateMetadata tarafından).
 *
 * Altyazı rendering (M6-C2):
 *   timing_mode + subtitle_style + wordTimings → KaraokeSubtitle.
 *   wordTimings boşsa cursor (degrade) mod — KaraokeSubtitle bu durumu bilir.
 *
 * M4-C3 preview ayrımı KORUNUR:
 *   Bu composition final render içindir.
 *   M4-C3 CSS preview ayrı bir yüzeydir ve bu dosyayla çakışmaz.
 *   renderStill preview: PreviewFrameComposition ayrı composition ID ile kayıtlıdır.
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useVideoConfig,
} from "remotion";
import type {
  SubtitleStylePreset,
  TimingMode,
  WordTiming,
} from "../shared/subtitle-contracts";
import { KaraokeSubtitle } from "./KaraokeSubtitle";

// ---------------------------------------------------------------------------
// Props tipi — composition_props.json → props alanıyla 1:1 uyumlu
// ---------------------------------------------------------------------------

export interface SceneProps {
  scene_number: number;
  narration: string;
  visual_cue: string;
  audio_path: string | null;
  image_path: string | null;
  duration_seconds: number;
}

/**
 * StandardVideoProps — render sözleşmesinin tek tipi.
 *
 * word_timing_path M6-C1'de string prop olarak tanımlanmıştı.
 * M6-C2'den itibaren backend bu dosyayı okur ve wordTimings olarak inline geçirir.
 * word_timing_path bu tipten kaldırıldı — renderer fs okuma yapmaz.
 *
 * Backend sözleşmesi (composition_props.json → props):
 *   word_timing_path  → backend okur, wordTimings prop'una dönüştürür
 *   wordTimings       → bu tip — render-time kullanılan array
 */
export interface StandardVideoProps {
  title: string;
  scenes: SceneProps[];
  subtitles_srt: string | null;
  /** Kelime zamanlama verisi — backend word_timing.json'dan okuyup inline geçirir. */
  wordTimings: WordTiming[];
  timing_mode: TimingMode;
  subtitle_style: SubtitleStylePreset;
  total_duration_seconds: number;
  language: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  };
}

// ---------------------------------------------------------------------------
// Tek sahne bileşeni
// ---------------------------------------------------------------------------

interface SceneComponentProps {
  scene: SceneProps;
  subtitleProps: {
    wordTimings: WordTiming[];
    style: SubtitleStylePreset;
    timingMode: TimingMode;
    totalDurationSeconds: number;
  };
}

function SceneComponent({ scene, subtitleProps }: SceneComponentProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Arka plan görseli */}
      {scene.image_path && (
        <Img
          src={scene.image_path}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Sahne sesi */}
      {scene.audio_path && (
        <Audio src={scene.audio_path} />
      )}

      {/* Altyazı katmanı — wordTimings boşsa cursor degrade mod */}
      <KaraokeSubtitle
        wordTimings={subtitleProps.wordTimings}
        style={subtitleProps.style}
        timingMode={subtitleProps.timingMode}
        totalDurationSeconds={subtitleProps.totalDurationSeconds}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Ana composition bileşeni
// ---------------------------------------------------------------------------

export function StandardVideoComposition(props: StandardVideoProps) {
  const { fps } = useVideoConfig();
  const {
    scenes,
    wordTimings,
    subtitle_style,
    timing_mode,
    total_duration_seconds,
  } = props;

  // Sahne frame offsetlerini hesapla
  const sceneOffsets: number[] = [];
  let offset = 0;
  for (const scene of scenes) {
    sceneOffsets.push(offset);
    offset += Math.round(scene.duration_seconds * fps);
  }

  const subtitleProps = {
    wordTimings,
    style: subtitle_style,
    timingMode: timing_mode,
    totalDurationSeconds: total_duration_seconds,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {scenes.map((scene, index) => {
        const durationFrames = Math.round(scene.duration_seconds * fps);
        if (durationFrames <= 0) return null;

        return (
          <Sequence
            key={scene.scene_number}
            from={sceneOffsets[index]}
            durationInFrames={durationFrames}
          >
            <SceneComponent scene={scene} subtitleProps={subtitleProps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
