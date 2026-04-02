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
