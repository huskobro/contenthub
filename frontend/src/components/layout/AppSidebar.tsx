import { NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";
import { useUIStore } from "../../stores/uiStore";
import { UserSwitcher } from "./UserSwitcher";

interface NavItem {
  label: string;
  to?: string;
  section?: boolean;
}

interface AppSidebarProps {
  items: NavItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <nav
      className={cn(
        "shrink-0 flex flex-col z-sidebar min-h-screen bg-surface-sidebar overflow-hidden transition-[width] duration-normal",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar"
      )}
      style={{
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--ch-brand-500) 6%, transparent) 0%, transparent 30%), radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--ch-brand-400) 4%, transparent) 0%, transparent 50%), linear-gradient(180deg, transparent 85%, color-mix(in srgb, var(--ch-brand-500) 2%, transparent) 100%)`,
      }}
    >
      {/* Brand area */}
      <div
        className={cn(
          "border-b border-surface-sidebar-border flex items-center gap-3 transition-[padding] duration-normal",
          collapsed ? "px-3 py-5 justify-center" : "px-4 py-5 justify-between"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold font-body tracking-[0.02em] shrink-0"
            style={{ boxShadow: "0 0 12px color-mix(in srgb, var(--ch-brand-500) 30%, transparent)" }}
          >
            CH
          </div>
          {!collapsed && (
            <span className="text-surface-sidebar-text text-md font-semibold font-heading tracking-[-0.025em] whitespace-nowrap">
              ContentHub
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            aria-label="Kenar çubuğunu daralt"
            data-testid="sidebar-collapse-toggle"
            className="bg-transparent border-none cursor-pointer p-1 rounded-sm text-surface-sidebar-text-muted text-sm leading-none shrink-0 flex items-center justify-center transition-colors duration-fast hover:text-surface-sidebar-text hover:bg-surface-sidebar-hover"
          >
            &#x2039;
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleSidebar}
          aria-label="Kenar çubuğunu genişlet"
          data-testid="sidebar-expand-toggle"
          className="bg-transparent border-none cursor-pointer py-2 rounded-sm text-neutral-500 text-sm leading-none flex items-center justify-center transition-colors duration-fast hover:text-neutral-200 hover:bg-surface-sidebar-hover"
        >
          &#x203a;
        </button>
      )}

      {/* Navigation */}
      <ul className="list-none m-0 px-1 py-2 flex-1 overflow-y-auto overflow-x-hidden">
        {items.map((item, idx) => (
          <li key={item.to ?? `section-${idx}`}>
            {item.section ? (
              !collapsed && (
                <div className="px-3 pt-4 pb-1 text-xs font-semibold font-body text-surface-sidebar-section uppercase tracking-[0.08em] whitespace-nowrap">
                  {item.label}
                </div>
              )
            ) : item.to ? (
              <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "block my-px no-underline font-body rounded-sm border-l-[3px] cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-fast",
                    collapsed
                      ? "px-2 py-2 text-xs text-center"
                      : "px-3 py-2 text-base text-left",
                    isActive
                      ? "font-medium text-surface-sidebar-text-active bg-surface-sidebar-active border-l-brand-400"
                      : "font-normal text-surface-sidebar-text-muted bg-transparent border-l-transparent hover:bg-surface-sidebar-hover hover:text-surface-sidebar-text"
                  )
                }
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </NavLink>
            ) : (
              <span
                className={cn(
                  "block px-3 py-2 text-surface-sidebar-text-muted text-base font-body cursor-default whitespace-nowrap rounded-sm"
                )}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* User switcher — M40 */}
      <div className="border-t border-surface-sidebar-border px-2 py-2">
        <UserSwitcher />
      </div>
    </nav>
  );
}
