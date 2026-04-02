const BASE_URL = "/api/v1/template-style-links";

export interface TemplateStyleLinkResponse {
  id: string;
  template_id: string;
  style_blueprint_id: string;
  link_role: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateStyleLinkCreatePayload {
  template_id: string;
  style_blueprint_id: string;
  link_role?: string | null;
  status?: string;
  notes?: string | null;
}

export interface TemplateStyleLinkUpdatePayload {
  link_role?: string | null;
  status?: string;
  notes?: string | null;
}

export async function fetchTemplateStyleLinks(params?: {
  template_id?: string;
  style_blueprint_id?: string;
  status?: string;
}): Promise<TemplateStyleLinkResponse[]> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params?.template_id) url.searchParams.set("template_id", params.template_id);
  if (params?.style_blueprint_id) url.searchParams.set("style_blueprint_id", params.style_blueprint_id);
  if (params?.status) url.searchParams.set("status", params.status);

  const resp = await fetch(url.pathname + url.search);
  if (!resp.ok) throw new Error(`Failed to fetch template style links: ${resp.status}`);
  return resp.json();
}

export async function fetchTemplateStyleLinkById(
  linkId: string
): Promise<TemplateStyleLinkResponse> {
  const resp = await fetch(`${BASE_URL}/${linkId}`);
  if (!resp.ok) throw new Error(`Failed to fetch template style link ${linkId}: ${resp.status}`);
  return resp.json();
}

export async function createTemplateStyleLink(
  payload: TemplateStyleLinkCreatePayload
): Promise<TemplateStyleLinkResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create template style link: ${resp.status}`);
  return resp.json();
}

export async function updateTemplateStyleLink(
  linkId: string,
  payload: TemplateStyleLinkUpdatePayload
): Promise<TemplateStyleLinkResponse> {
  const resp = await fetch(`${BASE_URL}/${linkId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update template style link ${linkId}: ${resp.status}`);
  return resp.json();
}
