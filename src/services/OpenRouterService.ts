import AuthService from './AuthService';

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt?: string;
    completion?: string;
  };
}

class OpenRouterService {
  /**
   * Get available models from OpenRouter API
   */
  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch('/api/openrouter/models', {
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des modèles');
      }

      const models = await response.json();
      return Array.isArray(models) ? models : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles OpenRouter:', error);
      return [];
    }
  }

  /**
   * Refresh models cache
   */
  async refreshModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch('/api/openrouter/refresh-models', {
        method: 'POST',
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rafraîchissement des modèles');
      }

      const data = await response.json();
      return Array.isArray(data.models) ? data.models : [];
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des modèles:', error);
      throw error;
    }
  }
}

export default new OpenRouterService();
