export interface LoginResponse {
  access: string;
  refresh: string;
  user: any;  // Puedes definir una interfaz User más específica si lo necesitas
}

export interface CSRFResponse {
  csrfToken: string;
  detail?: string;
}
