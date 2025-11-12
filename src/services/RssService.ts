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
    } catch (error) {
      console.error('Error adding RSS feed:', error);
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

  async getArticles(limit: number = 20): Promise<RssArticle[]> {
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
