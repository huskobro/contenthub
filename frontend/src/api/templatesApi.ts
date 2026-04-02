const BASE_URL = "/api/v1/templates";

export interface TemplateResponse {
  id: string;
  name: string;
  template_type: string;
  owner_scope: string;
  module_scope: string | null;
  description: string | null;
  style_profile_json: string | null;
  content_rules_json: string | null;
  publish_profile_json: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  style_link_count?: number;
  primary_link_role?: string | null;
}

export async function fetchTemplates(params?: {
  template_type?: string;
  owner_scope?: string;
  module_scope?: string;
  status?: string;
}): Promise<TemplateResponse[]> {
  const url = new URL(BASE_URL, window.location.origin);
  if (params?.template_type) url.searchParams.set("template_type", params.template_type);
  if (params?.owner_scope) url.searchParams.set("owner_scope", params.owner_scope);
  if (params?.module_scope) url.searchParams.set("module_scope", params.module_scope);
  if (params?.status) url.searchParams.set("status", params.status);

  const resp = await fetch(url.pathname + url.search);
  if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
  return resp.json();
}

export async function fetchTemplateById(templateId: string): Promise<TemplateResponse> {
  const resp = await fetch(`${BASE_URL}/${templateId}`);
  if (!resp.ok) throw new Error(`Failed to fetch template ${templateId}: ${resp.status}`);
  return resp.json();
}

export interface TemplateCreatePayload {
  name: string;
  template_type: string;
  owner_scope: string;
  module_scope?: string | null;
  description?: string | null;
  style_profile_json?: string | null;
  content_rules_json?: string | null;
  publish_profile_json?: string | null;
  status?: string;
  version?: number;
}

export interface TemplateUpdatePayload {
  name?: string;
  template_type?: string;
  owner_scope?: string;
  module_scope?: string | null;
  description?: string | null;
  style_profile_json?: string | null;
  content_rules_json?: string | null;
  publish_profile_json?: string | null;
  status?: string;
  version?: number;
}

export async function createTemplate(payload: TemplateCreatePayload): Promise<TemplateResponse> {
  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to create template: ${resp.status}`);
  return resp.json();
}

export async function updateTemplate(templateId: string, payload: TemplateUpdatePayload): Promise<TemplateResponse> {
  const resp = await fetch(`${BASE_URL}/${templateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Failed to update template ${templateId}: ${resp.status}`);
  return resp.json();
}
