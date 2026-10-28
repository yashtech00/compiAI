const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('companion_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Sends and receives HTTP-only cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Request failed';
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    const details = data?.error?.details;
    throw new ApiError(message, response.status, code, details);
  }

  return data?.data !== undefined ? data.data : data;
}
