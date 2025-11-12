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
}

export default new CalendarService();
