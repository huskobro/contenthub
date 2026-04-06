/**
 * ThemePreviewPanel — Extracted from ThemeRegistryPage.
 *
 * Renders an inline visual preview of a ThemeManifest showing:
 * - Header bar with sidebar color
 * - Typography samples (heading, body, mono)
 * - Status badges (success, warning, error, info)
 * - Button samples (primary, secondary)
 * - Table sample
 * - Mono/code sample
 */

import type { ThemeManifest } from "../design-system/themeContract";

export function ThemePreviewPanel({ theme }: { theme: ThemeManifest }) {
  const t = theme;
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${t.colors.border.default}`,
        background: t.colors.surface.page,
      }}
      data-testid="theme-preview-panel"
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 py-3 px-4"
        style={{ background: t.colors.surface.sidebar }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white"
          style={{
            background: t.colors.brand[600],
            fontSize: t.typography.size.xs,
            fontWeight: t.typography.weight.bold,
            fontFamily: t.typography.body.stack,
          }}
        >
          CH
        </div>
        <span
          style={{
            color: t.colors.neutral[0],
            fontSize: t.typography.size.sm,
            fontWeight: t.typography.weight.semibold,
            fontFamily: t.typography.body.stack,
          }}
        >
          Preview
        </span>
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* Text samples */}
        <h4
          className="m-0 mb-2"
          style={{
            fontSize: t.typography.size.lg,
            fontWeight: t.typography.weight.semibold,
            color: t.colors.neutral[900],
            fontFamily: t.typography.heading.stack,
          }}
        >
          Baslik Ornegi
        </h4>
        <p
          className="m-0 mb-3"
          style={{
            fontSize: t.typography.size.base,
            color: t.colors.neutral[600],
            fontFamily: t.typography.body.stack,
            lineHeight: t.typography.lineHeight.normal,
          }}
        >
          Bu bir onizleme metnidir. Temanin tipografi ve renk tonlarini gosterir.
        </p>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { label: "Basarili", bg: t.colors.success.light, fg: t.colors.success.text },
            { label: "Uyari", bg: t.colors.warning.light, fg: t.colors.warning.text },
            { label: "Hata", bg: t.colors.error.light, fg: t.colors.error.text },
            { label: "Bilgi", bg: t.colors.info.light, fg: t.colors.info.text },
          ].map((b) => (
            <span
              key={b.label}
              className="inline-block py-1 px-2"
              style={{
                borderRadius: t.radius.full,
                fontSize: t.typography.size.xs,
                fontWeight: t.typography.weight.semibold,
                background: b.bg,
                color: b.fg,
                fontFamily: t.typography.body.stack,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Button samples */}
        <div className="flex gap-2 mb-3">
          <span
            className="inline-block py-2 px-4 text-white"
            style={{
              borderRadius: t.radius.md,
              background: t.colors.brand[600],
              fontSize: t.typography.size.base,
              fontWeight: t.typography.weight.medium,
              fontFamily: t.typography.body.stack,
            }}
          >
            Birincil
          </span>
          <span
            className="inline-block py-2 px-4"
            style={{
              borderRadius: t.radius.md,
              background: t.colors.surface.card,
              color: t.colors.neutral[700],
              fontSize: t.typography.size.base,
              fontWeight: t.typography.weight.medium,
              border: `1px solid ${t.colors.border.default}`,
              fontFamily: t.typography.body.stack,
            }}
          >
            Ikincil
          </span>
        </div>

        {/* Table sample */}
        <div
          className="overflow-hidden"
          style={{
            border: `1px solid ${t.colors.border.subtle}`,
            borderRadius: t.radius.md,
          }}
        >
          <table className="w-full border-collapse" style={{ fontFamily: t.typography.body.stack }}>
            <thead>
              <tr style={{ background: t.colors.neutral[100] }}>
                <th className="py-2 px-3 text-left" style={{ fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600] }}>Kolon</th>
                <th className="py-2 px-3 text-left" style={{ fontSize: t.typography.size.xs, fontWeight: t.typography.weight.semibold, color: t.colors.neutral[600] }}>Deger</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3" style={{ fontSize: t.typography.size.sm, color: t.colors.neutral[900], borderTop: `1px solid ${t.colors.border.subtle}` }}>Ornek satir</td>
                <td className="py-2 px-3" style={{ fontSize: t.typography.size.sm, color: t.colors.neutral[600], borderTop: `1px solid ${t.colors.border.subtle}`, fontFamily: t.typography.mono.stack }}>42</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mono sample */}
        <div
          className="mt-3 p-3"
          style={{
            background: t.colors.neutral[50],
            borderRadius: t.radius.md,
            fontFamily: t.typography.mono.stack,
            fontSize: t.typography.size.sm,
            color: t.colors.neutral[700],
          }}
        >
          <code>font: {t.typography.body.family} | mono: {t.typography.mono.family}</code>
        </div>
      </div>
    </div>
  );
}
