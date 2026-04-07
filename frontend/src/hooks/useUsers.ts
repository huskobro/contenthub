/**
 * User hooks — M40.
 *
 * React Query hooks for user CRUD and active user context.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
  fetchUserOverrides,
  setUserOverride,
  deleteUserOverride,
  type UserCreatePayload,
  type UserUpdatePayload,
  type UserResponse,
} from "../api/usersApi";
import { useUserStore } from "../stores/userStore";

// ---------------------------------------------------------------------------
// User list + single user
// ---------------------------------------------------------------------------

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Active user convenience
// ---------------------------------------------------------------------------

export function useActiveUser(): {
  activeUserId: string | null;
  activeUser: UserResponse | null;
  users: UserResponse[];
  setActiveUser: (userId: string | null) => void;
} {
  const activeUserId = useUserStore((s) => s.activeUserId);
  const setActiveUser = useUserStore((s) => s.setActiveUser);
  const { data: users } = useUsers();

  const userList = users ?? [];
  const activeUser = userList.find((u) => u.id === activeUserId) ?? null;

  return { activeUserId, activeUser, users: userList, setActiveUser };
}

// ---------------------------------------------------------------------------
// User mutations
// ---------------------------------------------------------------------------

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserUpdatePayload }) =>
      updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// ---------------------------------------------------------------------------
// User setting overrides
// ---------------------------------------------------------------------------

export function useUserOverrides(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "overrides"],
    queryFn: () => fetchUserOverrides(userId),
    enabled: !!userId,
  });
}

export function useSetUserOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      settingKey,
      value,
    }: {
      userId: string;
      settingKey: string;
      value: unknown;
    }) => setUserOverride(userId, settingKey, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "overrides"] });
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
    },
  });
}

export function useDeleteUserOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, settingKey }: { userId: string; settingKey: string }) =>
      deleteUserOverride(userId, settingKey),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "overrides"] });
      queryClient.invalidateQueries({ queryKey: ["effective-settings"] });
    },
  });
}
