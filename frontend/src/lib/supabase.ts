import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info.tsx";

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabaseConfigured = true;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

export type WatchedMovie = {
  id: string;
  user_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  liked: boolean | null;
  rating: number | null;
  review: string | null;
  watched_date: string | null;
  genres: string[] | null;
  created_at: string;
};
