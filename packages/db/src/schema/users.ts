import { authUsers } from "drizzle-orm/supabase";

// Supabase-managed `auth.users`; RLS is owned by Supabase, do not enable here.
export const users = authUsers;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
