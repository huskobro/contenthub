/**
 * product_review — 10 scene components.
 *
 * Her sahne `SceneComponentProps` alir (types.ts) ve sahnenin kendi
 * zaman penceresi icin render olur. Backend scenes[] verisini uzunluk +
 * sira bazinda yazar; renderer sadece scene_key'e gore componenti secer.
 *
 * Sahne katalogu:
 *   intro_hook       — acilis "oltasi", urun temasi + hook metni
 *   hero_card        — birincil urunun buyuk gorsel karti
 *   price_reveal     — fiyat reveal, premium animasyon
 *   feature_callout  — tek ozellik vurgusu (rotating features)
 *   spec_grid        — spec tablosu (up to 6 rows)
 *   comparison_row   — iki urunu yan yana karsilastirma satiri
 *   social_proof     — rating yildizlari + kullanici sayisi
 *   pros_cons        — arti / eksi kolonlari
 *   verdict_card     — final not + skor
 *   cta_outro        — CTA butonu + affiliate disclaimer
 */

import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  MOTION,
  TYPOGRAPHY,
  resolvePalette,
  type ProductReviewPalette,
} from "../shared/palette";
import { SceneFrame, formatPrice, kFormat, useSceneEnterProgress } from "../shared/chrome";
import type {
  ProductItem,
  SceneComponentProps,
  ProductReviewSceneKey,
} from "../shared/types";

// ---------- helpers ----------

function pickTextForLang<T extends { tr: string; en: string }>(
  bag: T,
  lang: "tr" | "en",
): string {
  return lang === "tr" ? bag.tr : bag.en;
}

function ImagePlate({
  src,
  palette,
  size,
  rotate = 0,
}: {
  src: string | null | undefined;
  palette: ProductReviewPalette;
  size: number;
  rotate?: number;
}) {
  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.12,
          background: palette.surface,
          border: `1px solid ${palette.surfaceEdge}`,
          boxShadow: palette.shadow,
          transform: `rotate(${rotate}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.textSecondary,
          fontFamily: TYPOGRAPHY.mono,
          fontSize: size * 0.1,
        }}
      >
        IMG
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.12,
        overflow: "hidden",
        boxShadow: palette.shadow,
        transform: `rotate(${rotate}deg)`,
        background: palette.surface,
        border: `1px solid ${palette.surfaceEdge}`,
      }}
    >
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

// ---------- 1. intro_hook ----------

export function IntroHookScene(p: SceneComponentProps): JSX.Element {
  const { language, blueprint, orientation, sceneDurationFrames, primaryProduct } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sub = spring({ frame: frame - fps * 0.35, fps, config: { damping: 14 } });

  const hookTitle = language === "tr" ? "BUNU GORMENIZ GEREK" : "YOU NEED TO SEE THIS";
  const tag = primaryProduct.brand ? primaryProduct.brand.toUpperCase() : "PRODUCT REVIEW";

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="mesh"
      watermark={blueprint.watermarkText || undefined}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 32 }}>
        <div
          style={{
            fontSize: orientation === "vertical" ? 22 : 20,
            letterSpacing: "0.35em",
            color: palette.accent,
            fontFamily: TYPOGRAPHY.mono,
            textTransform: "uppercase",
            opacity: progress,
          }}
        >
          {tag}
        </div>
        <div
          style={{
            fontSize: orientation === "vertical" ? 96 : 112,
            fontWeight: 900,
            fontFamily: TYPOGRAPHY.display,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
            opacity: progress,
            color: palette.textPrimary,
          }}
        >
          {hookTitle}
        </div>
        <div
          style={{
            fontSize: orientation === "vertical" ? 28 : 24,
            color: palette.textSecondary,
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [16, 0])}px)`,
            fontWeight: 500,
          }}
        >
          {primaryProduct.name}
        </div>
      </div>
    </SceneFrame>
  );
}

// ---------- 2. hero_card ----------

export function HeroCardScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = useSceneEnterProgress();

  // floating hover
  const float =
    Math.sin((2 * Math.PI * frame) / MOTION.heroFloatPeriod) * MOTION.heroFloatAmplitude;

  const imageSize = orientation === "vertical" ? 640 : 520;

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="gradient"
      watermark={blueprint.watermarkText || undefined}
    >
      <div
        style={{
          display: "flex",
          flexDirection: orientation === "vertical" ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: orientation === "vertical" ? 48 : 80,
        }}
      >
        <div style={{ transform: `translateY(${float}px) scale(${0.9 + 0.1 * progress})`, opacity: progress }}>
          <ImagePlate src={primaryProduct.image_url} palette={palette} size={imageSize} rotate={-3} />
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: orientation === "vertical" ? "100%" : 640,
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
          }}
        >
          {primaryProduct.brand && (
            <div
              style={{
                fontFamily: TYPOGRAPHY.mono,
                color: palette.accent,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                fontSize: 18,
                marginBottom: 18,
              }}
            >
              {primaryProduct.brand}
            </div>
          )}
          <div
            style={{
              fontSize: orientation === "vertical" ? 72 : 86,
              fontFamily: TYPOGRAPHY.display,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              color: palette.textPrimary,
              textAlign: orientation === "vertical" ? "center" : "left",
            }}
          >
            {primaryProduct.name}
          </div>
          {primaryProduct.rating_value !== null && primaryProduct.rating_value !== undefined && (
            <div
              style={{
                marginTop: 28,
                fontSize: 28,
                color: palette.textSecondary,
                textAlign: orientation === "vertical" ? "center" : "left",
              }}
            >
              {"★".repeat(Math.round(primaryProduct.rating_value))}
              <span style={{ color: palette.textSecondary, opacity: 0.4 }}>
                {"★".repeat(5 - Math.round(primaryProduct.rating_value))}
              </span>
              <span style={{ marginLeft: 14, fontSize: 22, color: palette.textSecondary }}>
                {primaryProduct.rating_value.toFixed(1)}
                {primaryProduct.rating_count ? ` · ${kFormat(primaryProduct.rating_count, language)}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

// ---------- 3. price_reveal ----------

export function PriceRevealScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "scroll-in" digits effect
  const priceProgress = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  const priceText = formatPrice(primaryProduct.price, primaryProduct.currency, language);

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="gradient"
      watermark={blueprint.watermarkText || undefined}
      priceDisclaimer={blueprint.showPriceDisclaimerOverlay ? blueprint.priceDisclaimerText : null}
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.4em",
            color: palette.textSecondary,
            textTransform: "uppercase",
            fontFamily: TYPOGRAPHY.mono,
          }}
        >
          {language === "tr" ? "Fiyat" : "Price"}
        </div>
        <div
          style={{
            fontSize: orientation === "vertical" ? 200 : 220,
            fontFamily: TYPOGRAPHY.display,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: palette.accent,
            transform: `scale(${0.7 + 0.3 * priceProgress})`,
            opacity: priceProgress,
            textShadow: `0 0 40px ${palette.accentSoft}`,
          }}
        >
          {priceText}
        </div>
        {primaryProduct.availability && (
          <div
            style={{
              fontSize: 24,
              color:
                primaryProduct.availability === "in_stock"
                  ? palette.positive
                  : palette.negative,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: TYPOGRAPHY.mono,
              marginTop: 12,
            }}
          >
            {primaryProduct.availability === "in_stock"
              ? language === "tr" ? "Stokta" : "In stock"
              : language === "tr" ? "Stokta yok" : "Out of stock"}
          </div>
        )}
      </div>
    </SceneFrame>
  );
}

// ---------- 4. feature_callout ----------

export function FeatureCalloutScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, scene, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const featureIdx = typeof scene.extras?.feature_index === "number" ? scene.extras.feature_index : 0;
  const features = primaryProduct.features || [];
  const feature = features[featureIdx] || features[0] || (language === "tr" ? "Premium tasarim" : "Premium design");

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="gradient"
      watermark={blueprint.watermarkText || undefined}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.4em",
            color: palette.accent,
            fontFamily: TYPOGRAPHY.mono,
            textTransform: "uppercase",
          }}
        >
          {language === "tr" ? `Ozellik ${featureIdx + 1}` : `Feature ${featureIdx + 1}`}
        </div>
        <div
          style={{
            fontSize: orientation === "vertical" ? 80 : 96,
            fontFamily: TYPOGRAPHY.display,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: "90%",
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [24, 0])}px)`,
          }}
        >
          {feature}
        </div>
      </div>
    </SceneFrame>
  );
}

// ---------- 5. spec_grid ----------

export function SpecGridScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const specs = (primaryProduct.specs || []).slice(0, 6);

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="solid"
      watermark={blueprint.watermarkText || undefined}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.4em",
          color: palette.accent,
          fontFamily: TYPOGRAPHY.mono,
          textTransform: "uppercase",
          marginBottom: 30,
          textAlign: "center",
        }}
      >
        {language === "tr" ? "Teknik Ozellikler" : "Specifications"}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: orientation === "vertical" ? "1fr" : "1fr 1fr",
          gap: 14,
          maxWidth: orientation === "vertical" ? 680 : 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {specs.length === 0
          ? (
            <div style={{ color: palette.textSecondary, textAlign: "center" }}>
              {language === "tr" ? "Spec verisi yok" : "No spec data"}
            </div>
          )
          : specs.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.surfaceEdge}`,
                  borderRadius: 16,
                  padding: "18px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: progress,
                  transform: `translateY(${interpolate(progress, [0, 1], [12 + i * 4, 0])}px)`,
                }}
              >
                <div style={{ color: palette.textSecondary, fontSize: 22 }}>{s.label}</div>
                <div style={{ color: palette.textPrimary, fontWeight: 700, fontSize: 24 }}>{s.value}</div>
              </div>
            ))}
      </div>
    </SceneFrame>
  );
}

// ---------- 6. comparison_row ----------

export function ComparisonRowScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, secondaryProducts, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();
  const compareTo = secondaryProducts[0];

  const Col = ({ item, accent }: { item: ProductItem; accent: boolean }) => (
    <div
      style={{
        background: palette.surface,
        border: `1px solid ${accent ? palette.accent : palette.surfaceEdge}`,
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: accent ? `0 20px 60px ${palette.accentSoft}` : palette.shadow,
        opacity: progress,
      }}
    >
      <ImagePlate src={item.image_url} palette={palette} size={orientation === "vertical" ? 260 : 220} />
      <div style={{ fontFamily: TYPOGRAPHY.mono, color: palette.textSecondary, letterSpacing: "0.25em", fontSize: 14 }}>
        {item.brand?.toUpperCase() || ""}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{item.name}</div>
      <div style={{ fontSize: 32, color: palette.accent, fontFamily: TYPOGRAPHY.display, fontWeight: 800 }}>
        {formatPrice(item.price, item.currency, language)}
      </div>
    </div>
  );

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="gradient"
      watermark={blueprint.watermarkText || undefined}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.4em",
          color: palette.accent,
          fontFamily: TYPOGRAPHY.mono,
          textTransform: "uppercase",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        {language === "tr" ? "Karsilastirma" : "Comparison"}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: orientation === "vertical" ? 18 : 40,
          alignItems: "stretch",
        }}
      >
        <Col item={primaryProduct} accent />
        {compareTo
          ? <Col item={compareTo} accent={false} />
          : (
            <div
              style={{
                background: palette.surface,
                border: `1px dashed ${palette.surfaceEdge}`,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: palette.textSecondary,
                minHeight: 260,
              }}
            >
              {language === "tr" ? "Karsilastirma urunu yok" : "No comparison product"}
            </div>
          )}
      </div>
    </SceneFrame>
  );
}

// ---------- 7. social_proof ----------

export function SocialProofScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const rating = primaryProduct.rating_value ?? null;
  const count = primaryProduct.rating_count ?? null;
  const stars = rating !== null ? Math.round(rating) : 0;

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="mesh"
      watermark={blueprint.watermarkText || undefined}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.4em",
            color: palette.accent,
            fontFamily: TYPOGRAPHY.mono,
            textTransform: "uppercase",
          }}
        >
          {language === "tr" ? "Kullanici Yorumu" : "Social Proof"}
        </div>
        {rating !== null ? (
          <>
            <div style={{ fontSize: orientation === "vertical" ? 140 : 160, lineHeight: 1, opacity: progress }}>
              <span style={{ color: palette.accent }}>{"★".repeat(stars)}</span>
              <span style={{ color: palette.textSecondary, opacity: 0.35 }}>{"★".repeat(5 - stars)}</span>
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, fontFamily: TYPOGRAPHY.display }}>
              {rating.toFixed(1)} / 5
            </div>
            {count !== null && (
              <div style={{ fontSize: 28, color: palette.textSecondary }}>
                {kFormat(count, language)}{" "}
                {language === "tr" ? "degerlendirme" : "ratings"}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 40, color: palette.textSecondary }}>
            {language === "tr" ? "Henuz yorum yok" : "No reviews yet"}
          </div>
        )}
      </div>
    </SceneFrame>
  );
}

// ---------- 8. pros_cons ----------

export function ProsConsScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const pros = (primaryProduct.pros || []).slice(0, 4);
  const cons = (primaryProduct.cons || []).slice(0, 3);

  const Column = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
    <div
      style={{
        background: palette.surface,
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: progress,
      }}
    >
      <div
        style={{
          color,
          fontFamily: TYPOGRAPHY.mono,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontSize: 18,
        }}
      >
        {title}
      </div>
      {items.length === 0 && (
        <div style={{ color: palette.textSecondary, fontSize: 20, opacity: 0.6 }}>—</div>
      )}
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 24, lineHeight: 1.3 }}>
          <span style={{ color, marginTop: 2 }}>●</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="solid"
      watermark={blueprint.watermarkText || undefined}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: orientation === "vertical" ? "1fr" : "1fr 1fr",
          gap: 18,
        }}
      >
        <Column
          title={language === "tr" ? "Artilari" : "Pros"}
          items={pros}
          color={palette.positive}
        />
        <Column
          title={language === "tr" ? "Eksileri" : "Cons"}
          items={cons}
          color={palette.negative}
        />
      </div>
    </SceneFrame>
  );
}

// ---------- 9. verdict_card ----------

export function VerdictCardScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const score = typeof primaryProduct.score === "number"
    ? Math.max(0, Math.min(100, primaryProduct.score))
    : null;
  const verdict = primaryProduct.verdict || (language === "tr" ? "Onerilir." : "Recommended.");

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="gradient"
      watermark={blueprint.watermarkText || undefined}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.4em",
            color: palette.accent,
            fontFamily: TYPOGRAPHY.mono,
            textTransform: "uppercase",
          }}
        >
          {language === "tr" ? "Son Karar" : "Verdict"}
        </div>
        {score !== null && (
          <div
            style={{
              fontSize: orientation === "vertical" ? 180 : 200,
              fontFamily: TYPOGRAPHY.display,
              fontWeight: 900,
              lineHeight: 1,
              color: palette.accent,
              textShadow: `0 0 60px ${palette.accentSoft}`,
              transform: `scale(${0.85 + 0.15 * progress})`,
              opacity: progress,
            }}
          >
            {score}
            <span style={{ fontSize: "0.35em", color: palette.textSecondary, marginLeft: 8 }}>/100</span>
          </div>
        )}
        <div
          style={{
            fontSize: orientation === "vertical" ? 44 : 52,
            fontWeight: 700,
            fontFamily: TYPOGRAPHY.display,
            lineHeight: 1.2,
            maxWidth: "85%",
            opacity: progress,
          }}
        >
          {verdict}
        </div>
      </div>
    </SceneFrame>
  );
}

// ---------- 10. cta_outro ----------

export function CtaOutroScene(p: SceneComponentProps): JSX.Element {
  const { primaryProduct, metadata, blueprint, orientation, sceneDurationFrames, language } = p;
  const palette = resolvePalette(blueprint.tone);
  const progress = useSceneEnterProgress();

  const hasAffiliate = metadata.legal?.affiliate_enabled && !!primaryProduct.affiliate_url;
  const ctaLabel =
    language === "tr"
      ? hasAffiliate ? "Aciklamadaki Linkten Al" : "Detaylar Aciklamada"
      : hasAffiliate ? "Link in description" : "See description";

  return (
    <SceneFrame
      palette={palette}
      orientation={orientation}
      sceneDurationFrames={sceneDurationFrames}
      background="mesh"
      watermark={blueprint.watermarkText || undefined}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
        <div
          style={{
            fontSize: orientation === "vertical" ? 80 : 96,
            fontFamily: TYPOGRAPHY.display,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [16, 0])}px)`,
          }}
        >
          {language === "tr" ? "Begen, Takip Et" : "Like & Follow"}
        </div>
        <div
          style={{
            padding: "22px 44px",
            borderRadius: 999,
            background: palette.accent,
            color: palette.bg,
            fontSize: 32,
            fontWeight: 800,
            fontFamily: TYPOGRAPHY.display,
            boxShadow: `0 20px 60px ${palette.accentSoft}`,
            transform: `scale(${0.9 + 0.1 * progress})`,
            opacity: progress,
          }}
        >
          {ctaLabel}
        </div>
        {metadata.legal?.disclosure_applied && (
          <div
            style={{
              fontSize: 16,
              color: palette.textSecondary,
              opacity: 0.65,
              maxWidth: "80%",
              lineHeight: 1.4,
              marginTop: 16,
              fontStyle: "italic",
            }}
          >
            {language === "tr"
              ? "Bu videoda affiliate baglanti bulunmaktadir."
              : "This video contains affiliate links."}
          </div>
        )}
      </div>
    </SceneFrame>
  );
}

// ---------- scene picker ----------

export const SCENE_COMPONENTS: Record<ProductReviewSceneKey, (p: SceneComponentProps) => JSX.Element> = {
  intro_hook: IntroHookScene,
  hero_card: HeroCardScene,
  price_reveal: PriceRevealScene,
  feature_callout: FeatureCalloutScene,
  spec_grid: SpecGridScene,
  comparison_row: ComparisonRowScene,
  social_proof: SocialProofScene,
  pros_cons: ProsConsScene,
  verdict_card: VerdictCardScene,
  cta_outro: CtaOutroScene,
};

export function renderScene(key: ProductReviewSceneKey, props: SceneComponentProps): JSX.Element {
  const C = SCENE_COMPONENTS[key];
  if (!C) {
    return (
      <SceneFrame
        palette={resolvePalette(props.blueprint.tone)}
        orientation={props.orientation}
        sceneDurationFrames={props.sceneDurationFrames}
        background="solid"
      >
        <div style={{ textAlign: "center", fontFamily: TYPOGRAPHY.mono, color: "#f87171", fontSize: 32 }}>
          Unknown scene: {key}
        </div>
      </SceneFrame>
    );
  }
  return <C {...props} />;
}
