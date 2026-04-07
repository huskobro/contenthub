/**
 * RelatedRulesSection — shows assembly-affecting config settings for a module.
 * Lists settings that start with `{module_scope}.config.*`
 */

import { useEffectiveSettings } from "../../hooks/useEffectiveSettings";

interface RelatedRulesSectionProps {
  moduleScope: string;
}

export function RelatedRulesSection({ moduleScope }: RelatedRulesSectionProps) {
  const { data: settings, isLoading } = useEffectiveSettings({ group: moduleScope });

  // Filter to config settings relevant to this module
  const configSettings = (settings ?? []).filter(
    (s) =>
      s.type !== "prompt" &&
      (s.key.startsWith(`${moduleScope}.config.`) || s.key.startsWith(`${moduleScope}.`))
  );

  if (isLoading) {
    return (
      <p className="text-neutral-500 text-sm" data-testid="related-rules-loading">
        Yükleniyor...
      </p>
    );
  }

  if (configSettings.length === 0) {
    return (
      <p className="text-neutral-400 text-sm italic" data-testid="related-rules-empty">
        Bu modül için yapılandırma ayarı bulunamadı.
      </p>
    );
  }

  return (
    <div data-testid={`related-rules-section-${moduleScope}`}>
      <div className="grid gap-2">
        {configSettings.map((s) => {
          const val =
            s.effective_value !== null && s.effective_value !== undefined
              ? String(s.effective_value)
              : "—";

          const isBool = val === "true" || val === "false";

          return (
            <div
              key={s.key}
              className="flex items-start gap-3 py-2 px-3 bg-surface-inset rounded-md border border-border-subtle"
              data-testid={`related-rule-${s.key}`}
            >
              {/* Bool indicator */}
              {isBool && (
                <span
                  className={
                    val === "true"
                      ? "inline-block w-3.5 h-3.5 rounded-full bg-success shrink-0 mt-0.5"
                      : "inline-block w-3.5 h-3.5 rounded-full bg-error shrink-0 mt-0.5"
                  }
                  title={val}
                />
              )}

              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-neutral-800">{s.label ?? s.key}</span>
                <code className="text-xs font-mono text-neutral-400 ml-2">{s.key}</code>
                {s.help_text && (
                  <p className="text-xs text-neutral-500 mt-0.5 m-0">{s.help_text}</p>
                )}
              </div>

              {!isBool && (
                <code
                  className="text-xs font-mono text-neutral-600 shrink-0 max-w-[180px] truncate"
                  title={val}
                  data-testid={`related-rule-value-${s.key}`}
                >
                  {val}
                </code>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
