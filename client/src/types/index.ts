// Types pour l'application NoteFlow

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image_filename?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  todos?: Todo[];
  files?: NoteFile[];
  todos_count?: number;
  todos_completed?: number;
}

export interface Todo {
  id: number;
  note_id: number;
  text: string;
  completed: boolean;
  position: number;
}

export interface GlobalTodo {
  id: number;
  user_id: number;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface NoteFile {
  id: number;
  note_id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface RssFeed {
  id: number;
  url: string;
  title: string;
  description: string;
  enabled: boolean;
  created_at: string;
  last_fetched_at?: string;
}

export interface RssArticle {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  description?: string;
  pub_date: string;
  content?: string;
  feed_title: string;
  feed_url: string;
}

export interface RssSummary {
  id: number;
  summary: string;
  model: string;
  articles_count: number;
  created_at: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface Settings {
  [key: string]: string;
  openrouter_api_key?: string;
  openrouter_model?: string;
  rss_summary_enabled?: string;
  rss_summary_prompt?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface ApiError {
  error: string;
  details?: any;
}

export type NoteView = 'active' | 'archived';
export type TodoFilter = 'all' | 'active' | 'completed';
