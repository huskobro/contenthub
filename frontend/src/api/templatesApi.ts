import { api } from "./client";

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

export function fetchTemplates(params?: {
  template_type?: string;
  owner_scope?: string;
  module_scope?: string;
  status?: string;
}): Promise<TemplateResponse[]> {
  return api.get<TemplateResponse[]>(BASE_URL, params);
}

export function fetchTemplateById(templateId: string): Promise<TemplateResponse> {
  return api.get<TemplateResponse>(`${BASE_URL}/${templateId}`);
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

export function createTemplate(payload: TemplateCreatePayload): Promise<TemplateResponse> {
  return api.post<TemplateResponse>(BASE_URL, payload);
}

export function updateTemplate(templateId: string, payload: TemplateUpdatePayload): Promise<TemplateResponse> {
  return api.patch<TemplateResponse>(`${BASE_URL}/${templateId}`, payload);
}
