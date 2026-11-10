const API_URL = import.meta.env.PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private readonly tokenKey = "chatmod_token";

  private obtenerToken(): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  guardarToken(token: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  obtenerTokenGuardado(): string | null {
    return this.obtenerToken();
  }

  eliminarToken(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.tokenKey);
    }
  }

  tieneSesion(): boolean {
    return !!this.obtenerToken();
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!API_URL) {
      throw new Error("No se configuró PUBLIC_API_URL en el archivo .env");
    }

    const headers = new Headers(options.headers);
    const esFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!esFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = this.obtenerToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type");
    let data: unknown = null;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let message = "Ocurrió un error al comunicarse con el servidor.";

      if (data && typeof data === "object" && "message" in data) {
        const serverMessage = (data as { message: unknown }).message;

        message = Array.isArray(serverMessage)
          ? serverMessage.join(", ")
          : String(serverMessage);
      }

      throw new ApiError(message, response.status, data);
    }

    return data as T;
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiService = new ApiService();