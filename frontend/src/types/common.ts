export type Crop = "corn" | "soybeans";
export type State = "IA" | "IL" | "IN";
export type Season = string; // e.g. "2026"

export interface ApiResponse<T> {
  data: T;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
