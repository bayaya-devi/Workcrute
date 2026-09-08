(() => {
  const api = async (path, options = {}) => {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: options.body instanceof FormData ? options.headers : { "content-type": "application/json", ...(options.headers || {}) },
    });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.userMessage || body.error || "REQUEST_FAILED"), { status: response.status, code: body.code });
    return body;
  };
  const applyConfig = (config) => {
    window.WorkcruteConfig = config;
    const name = config.general?.siteName || "Workcrute";
    document.title = document.title.replace(/Workcrute/g, name);
    document.querySelectorAll("img[data-site-logo]").forEach((image) => {
      if (config.brandAssets?.logo?.url) image.src = config.brandAssets.logo.url;
    });
  };
  window.workcrute = { api };
  window.WorkcruteConfigReady = location.hostname.endsWith("github.io")
    ? Promise.resolve(null)
    : api("/api/public/config").then(applyConfig).catch(() => null);
})();
