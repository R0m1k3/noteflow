import axios from 'axios';

export interface RssFeed {
  id?: number;
  title: string;
  url: string;
  category?: string;
  created_at?: string;
}

export interface RssArticle {
  id?: number;
  feed_id: number;
  title: string;
  link: string;
  description?: string;
  pub_date?: string;
  read: boolean;
}

class RssService {
  private baseURL = '/api/rss';

  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  async getFeeds(): Promise<RssFeed[]> {
    try {
      const response = await axios.get(`${this.baseURL}/feeds`, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching RSS feeds:', error);
      throw error;
    }
  }

  async addFeed(url: string, title?: string): Promise<RssFeed> {
    try {
      const response = await axios.post(`${this.baseURL}/feeds`, { url, title }, this.getAuthHeader());
      return response.data;
    } catch (error: any) {
      console.error('Error adding RSS feed:', error);
      if (error.response) {
        console.error('Backend Response Status:', error.response.status);
        console.error('Backend Response Data:', error.response.data);

        const data = error.response.data;
        if (data) {
          const errorMessage = data.error || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
          if (errorMessage) {
            throw new Error(errorMessage);
          }
        }
      }
      throw error;
    }
  }

  async deleteFeed(feedId: number): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/feeds/${feedId}`, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error deleting RSS feed:', error);
      throw error;
    }
  }

  async getArticles(limit: number = 50): Promise<RssArticle[]> {
    try {
      const response = await axios.get(`${this.baseURL}/articles?limit=${limit}`, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching RSS articles:', error);
      throw error;
    }
  }

  async markAsRead(articleId: number): Promise<boolean> {
    try {
      await axios.patch(`${this.baseURL}/articles/${articleId}/read`, {}, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error marking article as read:', error);
      throw error;
    }
  }

  async refreshFeeds(): Promise<boolean> {
    try {
      await axios.post(`${this.baseURL}/refresh`, {}, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error refreshing RSS feeds:', error);
      throw error;
    }
  }
}

export default new RssService();
