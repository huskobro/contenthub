import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

const queryClient = new QueryClient();

/**
 * Root application shell.
 *
 * Auth bootstrap note: `useAuthStore` hydrates synchronously from
 * localStorage inside its lazy Zustand initializer (see
 * `stores/authStore.ts` → `readAuthSnapshot`). There is therefore NO
 * useEffect here to load the session — by the time this component
 * renders, `isAuthenticated` / `user` already reflect persisted state.
 * That removed the F5-logout race.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
