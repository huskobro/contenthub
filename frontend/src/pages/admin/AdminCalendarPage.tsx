/**
 * AdminCalendarPage — Faz 14: Admin global calendar view.
 *
 * Aurora override (admin.calendar) tanımlıysa Aurora yüzeyi devreye girer;
 * aksi halde legacy davranış korunur (UserCalendarPage isAdmin sarmalayıcısı).
 */

import { UserCalendarPage } from "../user/UserCalendarPage";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

export function AdminCalendarPage() {
  const Override = useSurfacePageOverride("admin.calendar");
  if (Override) return <Override />;
  return <UserCalendarPage isAdmin />;
}
