/**
 * WizardLauncherPage — `/admin/wizard` (Faz 6 P0-9 trampoline).
 *
 * Aurora surface override gate: aktif surface Aurora ise generic
 * AuroraWizardPage render edilir. Diğer surface'ler için bu sayfa,
 * mevcut modül-spesifik wizard rotalarına yönlendiren bir launcher
 * sunar (yeni iş akışı icat etmez — yalnızca seçim ekranıdır).
 */
import { useNavigate } from "react-router-dom";
import { useSurfacePageOverride } from "../../surfaces";
import { PageShell, ActionButton } from "../../components/design-system/primitives";

const MODULES: Array<{ id: string; name: string; route: string }> = [
  { id: "news_bulletin", name: "Haber Bülteni", route: "/admin/news-bulletins/wizard" },
  { id: "standard_video", name: "Standart Video", route: "/admin/standard-videos/wizard" },
];

export function WizardLauncherPage() {
  const Override = useSurfacePageOverride("admin.wizard");
  if (Override) return <Override />;
  return <LegacyWizardLauncherPage />;
}

function LegacyWizardLauncherPage() {
  const navigate = useNavigate();
  return (
    <PageShell title="Yeni içerik" testId="wizard-launcher">
      <p className="text-neutral-600 text-md">
        Hangi modülde yeni içerik oluşturmak istiyorsunuz?
      </p>
      <div className="grid gap-3 mt-4 max-w-md">
        {MODULES.map((m) => (
          <ActionButton
            key={m.id}
            variant="primary"
            onClick={() => navigate(m.route)}
            data-testid={`wizard-pick-${m.id}`}
          >
            {m.name}
          </ActionButton>
        ))}
      </div>
    </PageShell>
  );
}
