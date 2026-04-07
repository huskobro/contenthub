/**
 * Users API — M40.
 *
 * CRUD for user management and per-user setting overrides.
 */

import { api } from "./client";

const BASE = "/api/v1/users";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  slug: string;
  role: string;
  status: string;
  override_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  email: string;
  display_name: string;
  role?: string;
}

export interface UserUpdatePayload {
  display_name?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface UserOverrideResponse {
  id: string;
  user_id: string;
  setting_key: string;
  value_json: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// User CRUD
// ---------------------------------------------------------------------------

export function fetchUsers(): Promise<UserResponse[]> {
  return api.get<UserResponse[]>(BASE);
}

export function fetchUser(userId: string): Promise<UserResponse> {
  return api.get<UserResponse>(`${BASE}/${userId}`);
}

export function createUser(payload: UserCreatePayload): Promise<UserResponse> {
  return api.post<UserResponse>(BASE, payload);
}

export function updateUser(
  userId: string,
  payload: UserUpdatePayload,
): Promise<UserResponse> {
  return api.patch<UserResponse>(`${BASE}/${userId}`, payload);
}

export function deleteUser(userId: string): Promise<UserResponse> {
  return api.delete<UserResponse>(`${BASE}/${userId}`);
}

// ---------------------------------------------------------------------------
// User Setting Overrides
// ---------------------------------------------------------------------------

export function fetchUserOverrides(
  userId: string,
): Promise<UserOverrideResponse[]> {
  return api.get<UserOverrideResponse[]>(`${BASE}/${userId}/overrides`);
}

export function setUserOverride(
  userId: string,
  settingKey: string,
  value: unknown,
): Promise<UserOverrideResponse> {
  return api.put<UserOverrideResponse>(
    `${BASE}/${userId}/settings/${encodeURIComponent(settingKey)}`,
    { value },
  );
}

export function deleteUserOverride(
  userId: string,
  settingKey: string,
): Promise<void> {
  return api.delete<void>(
    `${BASE}/${userId}/settings/${encodeURIComponent(settingKey)}`,
  );
}
