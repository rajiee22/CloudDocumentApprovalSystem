import type { User } from "@/types";
import { api } from "./client";

export const login = (email: string, password: string) =>
  api<{ token: string; user: User }>("/auth/login", { body: { email, password } });

export const fetchMe = () => api<{ user: User }>("/auth/me").then(r => r.user);
