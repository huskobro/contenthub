import { api } from "./client";

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

export function fetchTemplateStyleLinks(params?: {
  template_id?: string;
  style_blueprint_id?: string;
  status?: string;
}): Promise<TemplateStyleLinkResponse[]> {
  return api.get<TemplateStyleLinkResponse[]>(BASE_URL, params);
}

export function fetchTemplateStyleLinkById(
  linkId: string
): Promise<TemplateStyleLinkResponse> {
  return api.get<TemplateStyleLinkResponse>(`${BASE_URL}/${linkId}`);
}

export function createTemplateStyleLink(
  payload: TemplateStyleLinkCreatePayload
): Promise<TemplateStyleLinkResponse> {
  return api.post<TemplateStyleLinkResponse>(BASE_URL, payload);
}

export function updateTemplateStyleLink(
  linkId: string,
  payload: TemplateStyleLinkUpdatePayload
): Promise<TemplateStyleLinkResponse> {
  return api.patch<TemplateStyleLinkResponse>(`${BASE_URL}/${linkId}`, payload);
}
