import axios from 'axios';

export interface Settings {
  openrouter_api_key?: string;
  ai_model?: string;
  rss_refresh_interval?: number;
  theme?: 'light' | 'dark' | 'auto';
  google_client_id?: string;
  google_client_secret?: string;
  google_auth_type?: 'oauth2' | 'service_account';
  google_service_account_key?: string;
  google_calendar_email?: string;
  // Legacy fields (kept for backward compatibility)
  google_calendar_api_key?: string;
  google_calendar_id?: string;
}

class SettingsService {
  private baseURL = '/api/settings';

  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  async getSettings(): Promise<Settings> {
    try {
      const response = await axios.get(this.baseURL, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: Settings): Promise<boolean> {
    try {
      await axios.put(this.baseURL, settings, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async testOpenRouterConnection(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}/test-openrouter`, {}, this.getAuthHeader());
      return response.data.success;
    } catch (error) {
      console.error('Error testing OpenRouter connection:', error);
      throw error;
    }
  }
}

export default new SettingsService();
