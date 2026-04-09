/**
 * AdminCalendarPage — Faz 14: Admin global calendar view.
 *
 * Wraps UserCalendarPage with isAdmin=true to show all users' events.
 */

import { UserCalendarPage } from "../user/UserCalendarPage";

export function AdminCalendarPage() {
  return <UserCalendarPage isAdmin />;
}
