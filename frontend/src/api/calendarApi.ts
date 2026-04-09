import { api } from "./client";

const BASE = "/api/v1/calendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  event_type: "content_project" | "publish_record" | "platform_post";
  title: string;
  channel_profile_id: string | null;
  owner_user_id: string | null;
  related_project_id: string | null;
  related_publish_record_id: string | null;
  related_post_id: string | null;
  start_at: string;
  end_at: string | null;
  status: string;
  platform: string | null;
  module_type: string | null;
  action_url: string | null;
  meta_summary: string | null;
  is_overdue: boolean;
}

export interface CalendarEventsParams {
  start_date: string;
  end_date: string;
  owner_user_id?: string;
  channel_profile_id?: string;
  platform?: string;
  event_type?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function fetchCalendarEvents(
  params: CalendarEventsParams,
): Promise<CalendarEvent[]> {
  return api.get<CalendarEvent[]>(`${BASE}/events`, params);
}
