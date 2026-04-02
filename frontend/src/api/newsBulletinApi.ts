const BASE_URL = "/api/v1/modules/news-bulletin";

export interface NewsBulletinResponse {
  id: string;
  title: string | null;
  topic: string;
  brief: string | null;
  target_duration_seconds: number | null;
  language: string | null;
  tone: string | null;
  bulletin_style: string | null;
  source_mode: string | null;
  selected_news_ids_json: string | null;
  status: string;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsBulletinCreatePayload {
  topic: string;
  title?: string;
  brief?: string;
  target_duration_seconds?: number | null;
  language?: string;
  tone?: string;
  bulletin_style?: string;
  source_mode?: string;
  selected_news_ids_json?: string | null;
  status?: string;
}

export interface NewsBulletinUpdatePayload {
  topic?: string;
  title?: string | null;
  brief?: string | null;
  target_duration_seconds?: number | null;
  language?: string | null;
  tone?: string | null;
  bulletin_style?: string | null;
  source_mode?: string | null;
  selected_news_ids_json?: string | null;
  status?: string;
}

export async function createNewsBulletin(
  payload: NewsBulletinCreatePayload
): Promise<NewsBulletinResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create news bulletin: ${resp.status}`);
  return resp.json();
}

export async function updateNewsBulletin(
  id: string,
  payload: NewsBulletinUpdatePayload
): Promise<NewsBulletinResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update news bulletin ${id}: ${resp.status}`);
  return resp.json();
}

export async function fetchNewsBulletins(): Promise<NewsBulletinResponse[]> {
  const resp = await fetch(BASE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch news bulletins: ${resp.status}`);
  return resp.json();
}

export async function fetchNewsBulletinById(id: string): Promise<NewsBulletinResponse> {
  const resp = await fetch(`${BASE_URL}/${id}`);
  if (!resp.ok) throw new Error(`Failed to fetch news bulletin ${id}: ${resp.status}`);
  return resp.json();
}
