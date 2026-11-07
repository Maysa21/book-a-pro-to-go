import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";

import "../src/styles.css";
import { routeTree } from "../src/routeTree.gen";

// The phone build has no server: the same routes run as a single-page app and
// every read/write still goes straight to the hosted backend over HTTPS.
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <RouterProvider router={router}>
      <HeadContent />
    </RouterProvider>,
  );
}
