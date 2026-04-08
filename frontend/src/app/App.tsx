import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuthStore } from "../stores/authStore";

const queryClient = new QueryClient();

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  // Restore auth session from localStorage on app mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
