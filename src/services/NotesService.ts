import AuthService from "./AuthService";
import { showError, showSuccess } from "@/utils/toast";

interface Todo {
  id?: number;
  text: string;
  completed: boolean;
  position?: number;
}

interface Image {
  id?: number;
  filename: string;
  original_name?: string;
}

interface NoteFile {
  id?: number;
  filename: string;
  original_name?: string;
  size?: number;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  todos: Todo[];
  images: Image[];
  files?: NoteFile[];
  tags?: Array<{ id: number; name: string }>;
  priority?: boolean;
}

class NotesService {
  async getNotes(): Promise<Note[]> {
    try {
      const response = await fetch("/api/notes", {
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des notes");
      }

      const notes = await response.json();

      // Ensure todos and images are always arrays
      return notes.map((note: Note) => ({
        ...note,
        todos: note.todos || [],
        images: note.images || []
      }));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return [];
    }
  }

  async createNote(title: string, content: string = ""): Promise<Note | null> {
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ title, content, todos: [] })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création de la note");
      }

      showSuccess("Note créée avec succès");
      const note = await response.json();
      return {
        ...note,
        todos: note.todos || [],
        images: note.images || []
      };
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return null;
    }
  }

  async updateNote(note: Note): Promise<Note | null> {
    if (!note.id) return null;

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({
          ...note,
          todos: note.todos || [],
          images: note.images || []
        })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de la note");
      }

      const result = await response.json();
      // Le backend retourne { message, note } avec la note mise à jour incluant updated_at
      if (result.note) {
        return {
          ...note, // Garder les todos et images de l'état local
          ...result.note // Écraser avec les données du serveur (updated_at, etc.)
        };
      }

      return note; // Fallback si le backend ne retourne pas la note
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return null;
    }
  }

  async deleteNote(noteId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de la note");
      }

      showSuccess("Note supprimée avec succès");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async uploadImage(noteId: number, file: File): Promise<Image | null> {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`/api/notes/${noteId}/images`, {
        method: "POST",
        headers: {
          "Authorization": AuthService.getHeaders().Authorization
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'upload de l'image");
      }

      const result = await response.json();
      return result.image || result;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return null;
    }
  }

  async deleteImage(noteId: number, imageId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/notes/${noteId}/images/${imageId}`, {
        method: "DELETE",
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'image");
      }

      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async togglePriority(noteId: number, priority: boolean): Promise<boolean> {
    try {
      const response = await fetch(`/api/notes/${noteId}/priority`, {
        method: "PATCH",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ priority })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de la priorité");
      }

      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async archiveNote(noteId: number, archived: boolean): Promise<boolean> {
    try {
      const response = await fetch(`/api/notes/${noteId}/archive`, {
        method: "PUT",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ archived })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'archivage de la note");
      }

      showSuccess(archived ? "Note archivée" : "Note désarchivée");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }
}

export default new NotesService();