const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (import.meta.env.DEV) {
    return "";
  }

  return "";
};

export const getApiUnreachableMessage = (serviceName = "Backend") => {
  if (import.meta.env.DEV) {
    return `${serviceName} is not reachable. Start the backend server and keep API requests on the same Vite origin, or set VITE_API_BASE_URL.`;
  }

  return `${serviceName} is not reachable right now.`;
};

export const getApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
};
