import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Note,
  Todo,
  GlobalTodo,
  RssFeed,
  RssArticle,
  RssSummary,
  OpenRouterModel,
  Settings,
  NoteFile
} from '../types';

// Configuration Axios
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// === AUTH ===
export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },
  register: async (username: string, password: string) => {
    const { data } = await api.post('/auth/register', { username, password });
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },
};

// === USERS ===
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  create: async (username: string, password: string, is_admin: boolean): Promise<User> => {
    const { data } = await api.post('/users', { username, password, is_admin });
    return data;
  },
  update: async (id: number, password: string): Promise<void> => {
    await api.put(`/users/${id}`, { password });
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// === NOTES ===
export const notesApi = {
  getAll: async (archived: boolean = false): Promise<Note[]> => {
    const { data } = await api.get(`/notes?archived=${archived}`);
    return Array.isArray(data) ? data : [];
  },
  getOne: async (id: number): Promise<Note> => {
    const { data } = await api.get(`/notes/${id}`);
    return data;
  },
  create: async (note: Partial<Note>): Promise<Note> => {
    const { data } = await api.post('/notes', note);
    return data;
  },
  update: async (id: number, note: Partial<Note>): Promise<void> => {
    await api.put(`/notes/${id}`, note);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
  archive: async (id: number, archived: boolean): Promise<void> => {
    await api.put(`/notes/${id}/archive`, { archived });
  },
  uploadImage: async (id: number, file: File): Promise<{ filename: string; url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`/notes/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  deleteImage: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}/image`);
  },
  uploadFile: async (id: number, file: File): Promise<NoteFile> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/notes/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  downloadFile: async (fileId: number): Promise<void> => {
    window.open(`/api/notes/files/${fileId}/download`, '_blank');
  },
  deleteFile: async (fileId: number): Promise<void> => {
    await api.delete(`/api/notes/files/${fileId}`);
  },
};

// === NOTE TODOS ===
export const noteTodosApi = {
  create: async (noteId: number, text: string): Promise<Todo> => {
    const { data } = await api.post(`/notes/${noteId}/todos`, { text });
    return data;
  },
  update: async (id: number, completed: boolean): Promise<void> => {
    await api.put(`/notes/todos/${id}`, { completed });
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/notes/todos/${id}`);
  },
};

// === GLOBAL TODOS ===
export const todosApi = {
  getAll: async (): Promise<GlobalTodo[]> => {
    const { data} = await api.get('/todos');
    return data;
  },
  create: async (text: string): Promise<GlobalTodo> => {
    const { data } = await api.post('/todos', { text });
    return data;
  },
  update: async (id: number, completed: boolean): Promise<void> => {
    await api.put(`/todos/${id}`, { completed });
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/todos/${id}`);
  },
};

// === RSS FEEDS ===
export const rssApi = {
  getFeeds: async (): Promise<RssFeed[]> => {
    const { data } = await api.get('/rss/feeds');
    return data;
  },
  addFeed: async (url: string): Promise<RssFeed> => {
    const { data } = await api.post('/rss/feeds', { url });
    return data;
  },
  updateFeed: async (id: number, enabled: boolean): Promise<void> => {
    await api.put(`/rss/feeds/${id}`, { enabled });
  },
  deleteFeed: async (id: number): Promise<void> => {
    await api.delete(`/rss/feeds/${id}`);
  },
  fetchArticles: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/rss/fetch');
    return data;
  },
  getArticles: async (): Promise<RssArticle[]> => {
    const { data } = await api.get('/rss/articles');
    return data || [];
  },
  getSummaries: async (): Promise<RssSummary[]> => {
    const { data } = await api.get('/rss/summaries');
    return data || [];
  },
  generateSummary: async (): Promise<{ summary: string; model: string; articles_count: number }> => {
    const { data } = await api.post('/rss/summarize');
    return data;
  },
  getModels: async (): Promise<OpenRouterModel[]> => {
    const { data } = await api.get('/rss/models');
    return data;
  },
};

// === SETTINGS ===
export const settingsApi = {
  getAll: async (): Promise<Settings> => {
    const { data } = await api.get('/settings');
    return data;
  },
  getOne: async (key: string): Promise<{ key: string; value: string }> => {
    const { data } = await api.get(`/settings/${key}`);
    return data;
  },
  update: async (key: string, value: string): Promise<void> => {
    await api.put(`/settings/${key}`, { value });
  },
  delete: async (key: string): Promise<void> => {
    await api.delete(`/settings/${key}`);
  },
};

export default api;
