import axios from "axios";
import AuthService from "./AuthService";

export interface CalendarEvent {
  id: number;
  google_event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  html_link?: string;
  synced_at?: string;
  all_day?: boolean;
}

class CalendarService {
  private baseURL = "/api/calendar";

  private getAuthHeader() {
    return {
      headers: {
        Authorization: `Bearer ${AuthService.getToken()}`,
      },
    };
  }

  /**
   * Récupérer les événements du calendrier
   */
  async getEvents(limit: number = 10): Promise<CalendarEvent[]> {
    try {
      const response = await axios.get(`${this.baseURL}/events?limit=${limit}`, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des événements:", error);
      return [];
    }
  }

  /**
   * Obtenir l'URL d'authentification OAuth Google
   */
  async getAuthUrl(): Promise<string> {
    const response = await axios.get(`${this.baseURL}/auth-url`, this.getAuthHeader());
    return response.data.authUrl;
  }

  /**
   * Vérifier le statut d'authentification Google
   */
  async getAuthStatus(): Promise<{ isAuthenticated: boolean; isExpired: boolean; needsReauth: boolean }> {
    try {
      const response = await axios.get(`${this.baseURL}/auth-status`, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la vérification du statut OAuth:", error);
      return { isAuthenticated: false, isExpired: false, needsReauth: true };
    }
  }

  /**
   * Déconnecter Google Calendar
   */
  async disconnect(): Promise<boolean> {
    try {
      await axios.post(`${this.baseURL}/disconnect`, {}, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      return false;
    }
  }

  /**
   * Synchroniser avec Google Calendar
   */
  async sync(): Promise<{ syncedCount: number; events: number }> {
    const response = await axios.post(`${this.baseURL}/sync`, {}, this.getAuthHeader());
    return response.data;
  }

  /**
   * Supprimer un événement local
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/events/${eventId}`, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
      return false;
    }
  }

  /**
   * Créer un événement dans Google Calendar
   */
  async createEvent(eventData: {
    title: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
    attendees?: string[];
    reminders?: Array<{ method: string; minutes: number }>;
    recurrence?: string[];
    visibility?: string;
    colorId?: string;
  }): Promise<{ eventId: string; htmlLink: string }> {
    const response = await axios.post(`${this.baseURL}/events`, eventData, this.getAuthHeader());
    return response.data;
  }

  /**
   * Mettre à jour un événement dans Google Calendar
   */
  async updateEvent(eventId: number, eventData: {
    title: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
    attendees?: string[];
    reminders?: Array<{ method: string; minutes: number }>;
    recurrence?: string[];
    visibility?: string;
    colorId?: string;
  }): Promise<{ eventId: string; htmlLink: string }> {
    const response = await axios.put(`${this.baseURL}/events/${eventId}`, eventData, this.getAuthHeader());
    return response.data;
  }
}

export default new CalendarService();
