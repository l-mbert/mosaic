import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { RouterContext } from "../router-context.ts";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="isolate min-h-dvh bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <Outlet />
    </main>
  );
}
