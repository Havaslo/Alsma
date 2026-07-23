const PROJECT_PREVIEW_ROUTE_MESSAGE_TYPE = "amazi:preview-route/v1";
const PROJECT_PREVIEW_NAVIGATION_MESSAGE_TYPE = "amazi:preview-navigate/v1";

const readNavigationPath = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const message = data as { path?: unknown; type?: unknown };
  if (
    message.type !== PROJECT_PREVIEW_NAVIGATION_MESSAGE_TYPE ||
    typeof message.path !== "string" ||
    !message.path.startsWith("/") ||
    message.path.startsWith("//")
  ) {
    return null;
  }

  try {
    const targetUrl = new URL(message.path, window.location.origin);
    return targetUrl.origin === window.location.origin
      ? `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
      : null;
  } catch {
    return null;
  }
};

let initialized = false;

export const initializePreviewRouteSync = () => {
  if (initialized || window.parent === window) return;
  initialized = true;

  const reportRoute = () => {
    window.parent.postMessage(
      {
        path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        type: PROJECT_PREVIEW_ROUTE_MESSAGE_TYPE,
      },
      "*",
    );
  };
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...arguments_) => {
    originalPushState(...arguments_);
    reportRoute();
  };
  window.history.replaceState = (...arguments_) => {
    originalReplaceState(...arguments_);
    reportRoute();
  };
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const path = readNavigationPath(event.data);
    if (!path) return;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (path === currentPath) return;
    originalPushState(null, "", path);
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: window.history.state }),
    );
  });
  window.addEventListener("hashchange", reportRoute);
  window.addEventListener("popstate", reportRoute);
  reportRoute();
};
