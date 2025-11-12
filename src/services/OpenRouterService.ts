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

  /**
   * Send chat message to AI model
   */
  async sendMessage(model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const response = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: {
          ...AuthService.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(error.error || 'Erreur lors de la communication avec l\'IA');
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Pas de réponse';
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }
}

export default new OpenRouterService();
