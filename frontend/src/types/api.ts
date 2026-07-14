export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}
