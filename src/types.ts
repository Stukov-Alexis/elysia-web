export type UserRole = "user" | "admin";

export type ImageRecord = {
  id: string;
  filename: string;
  url: string;
  storagePath?: string;
  tags: string[];
  uploaded_by: string;
  created_at: string;
};

export type AuthUser = { id: string; email?: string; role: UserRole };
