class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details;
  }
}

let accessToken = null;
let csrfToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  // Only set Content-Type to application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    headers['x-csrf-token'] = csrfToken;
  }

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network connection error. Please check your internet connection.');
  }

  // Handle CSRF token update from response headers
  const newCsrf = response.headers.get('x-csrf-token');
  if (newCsrf) {
    csrfToken = newCsrf;
  }

  // Handle Token Refresh on 401
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refHeaders = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          };
          if (csrfToken) refHeaders['x-csrf-token'] = csrfToken;
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: refHeaders,
            credentials: 'include',
          });

          if (!refreshRes.ok) {
            accessToken = null;
            return null;
          }

          const refreshData = await refreshRes.json();
          const newToken = refreshData.data?.accessToken;
          accessToken = newToken || null;

          const refNewCsrf = refreshRes.headers.get('x-csrf-token');
          if (refNewCsrf) csrfToken = refNewCsrf;

          return accessToken;
        } catch (_err) {
          accessToken = null;
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const refreshedToken = await refreshPromise;
    if (refreshedToken) {
      // Retry original request with new token
      headers.Authorization = `Bearer ${refreshedToken}`;
      const retryResponse = await fetch(url, { ...config, headers });
      return handleResponse(retryResponse);
    }
  }

  return handleResponse(response);
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const errorPayload = data?.error || {};
    throw new ApiError(
      response.status,
      errorPayload.code || `HTTP_${response.status}`,
      errorPayload.message || response.statusText,
      errorPayload.details || null
    );
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export { ApiError };
