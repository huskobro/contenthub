/**
 * AuroraWorkspaceSwitchPage — panel seçim sayfası (/workspace-switch).
 *
 * Oturum açmış kullanıcı burada yönetim veya kullanıcı panelini
 * seçer. Rol (admin / operator / viewer / user) tabanlı olarak
 * varsayılan (önerilen) hedef vurgulanır ama her iki hedef de
 * erişilebilir — bu sayede admin role'ü ile giriş yapan biri
 * kullanıcı panelini test etmek için yine de oraya gidebilir.
 *
 * Ekstra aksiyon: "Farklı kullanıcı ile giriş" — oturumu kapatıp
 * login ekranına döner (useAuthStore.logout + /login).
 */
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";
import { Icon } from "./icons";

export function AuroraWorkspaceSwitchPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const role = user?.role ?? null;

  function handleSwitchUser() {
    logout();
    navigate("/login", { replace: true });
  }

  const targets: Array<{
    id: string;
    label: string;
    desc: string;
    href: string;
    suggested?: boolean;
  }> = [
    {
      id: "admin",
      label: "Yönetim Paneli",
      desc: "Operasyon, ayarlar, görünürlük, denetim.",
      href: "/admin",
      suggested: role === "admin",
    },
    {
      id: "user",
      label: "Kullanıcı Paneli",
      desc: "İçerik üretimi, kanallar, projeler.",
      href: "/user",
      suggested: role !== "admin",
    },
  ];

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-workspace-switch-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top, rgba(176,122,216,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(59,200,184,0.16), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: 16,
              letterSpacing: "-0.01em",
            }}
          >
            ContentHub
          </div>
          <div style={{ marginTop: 4 }}>
            <AuroraStatusChip tone="info">workspace seçimi</AuroraStatusChip>
          </div>
        </div>
        <AuroraCard pad="default">
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "var(--font-display, var(--font-sans))",
              letterSpacing: "-0.01em",
              textAlign: "center",
            }}
          >
            Hangi panele girmek istersiniz?
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.55,
              textAlign: "center",
            }}
          >
            {user?.display_name
              ? `${user.display_name} olarak giriş yaptınız.`
              : "Aktif oturumla devam ediyorsunuz."}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(t.href)}
                data-testid={`aurora-workspace-target-${t.id}`}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  border: t.suggested
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-default)",
                  borderRadius: 10,
                  background: t.suggested
                    ? "var(--accent-primary-muted)"
                    : "var(--bg-elevated)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {t.label}
                    {t.suggested && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          color: "var(--accent-primary-hover)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        önerilen
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {t.desc}
                  </div>
                </div>
                <Icon name="chevron-right" size={14} />
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
            }}
          >
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={handleSwitchUser}
              data-testid="aurora-workspace-logout"
            >
              Farklı kullanıcı ile giriş
            </AuroraButton>
          </div>
        </AuroraCard>
      </div>
    </div>
  );
}
