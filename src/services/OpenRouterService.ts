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
      console.log(`[OpenRouter] Envoi requête - model: ${model}, messages: ${messages.length}`);

      const response = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: {
          ...AuthService.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages })
      });

      console.log(`[OpenRouter] Réponse reçue - status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        const errorMessage = errorData.error || `Erreur HTTP ${response.status}`;

        console.error('[OpenRouter] Erreur:', errorMessage);

        // Messages d'erreur plus clairs selon le code HTTP
        if (response.status === 400) {
          throw new Error(errorMessage);
        } else if (response.status === 401) {
          throw new Error('Clé API invalide. Vérifiez la configuration dans Paramètres.');
        } else if (response.status === 402) {
          throw new Error('Crédits OpenRouter épuisés. Rechargez votre compte.');
        } else if (response.status === 429) {
          throw new Error('Trop de requêtes. Attendez quelques instants.');
        } else if (response.status === 502 || response.status === 503) {
          throw new Error('Service OpenRouter temporairement indisponible. Réessayez dans quelques instants.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('[OpenRouter] Réponse vide:', data);
        throw new Error('Aucune réponse générée par le modèle');
      }

      console.log(`[OpenRouter] Succès - ${content.length} caractères`);
      return content;
    } catch (error: any) {
      console.error('[OpenRouter] Erreur exception:', error);
      throw error;
    }
  }
}

export default new OpenRouterService();
