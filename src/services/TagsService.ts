import AuthService from './AuthService';

export interface Tag {
  id: number;
  tag: string;
}

class TagsService {
  /**
   * Get all tags for a note
   */
  async getTags(noteId: number): Promise<Tag[]> {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags`, {
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des tags');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des tags:', error);
      throw error;
    }
  }

  /**
   * Add a tag to a note
   */
  async addTag(noteId: number, tag: string): Promise<Tag> {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags`, {
        method: 'POST',
        headers: {
          ...AuthService.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'ajout du tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du tag:', error);
      throw error;
    }
  }

  /**
   * Delete a tag from a note
   */
  async deleteTag(noteId: number, tagId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du tag');
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du tag:', error);
      throw error;
    }
  }
}

export default new TagsService();
