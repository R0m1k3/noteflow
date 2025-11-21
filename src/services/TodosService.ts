import axios from 'axios';

export interface Todo {
  id?: number;
  text: string;
  completed: boolean;
  priority?: boolean;
  due_date?: string;
  created_at?: string;
}

class TodosService {
  private baseURL = '/api/todos';

  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  async getTodos(): Promise<Todo[]> {
    try {
      const response = await axios.get(this.baseURL, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  async createTodo(text: string, priority?: boolean): Promise<Todo> {
    try {
      const response = await axios.post(this.baseURL, { text, priority: priority || false, completed: false }, this.getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  async updateTodo(todo: Todo): Promise<boolean> {
    try {
      await axios.put(`${this.baseURL}/${todo.id}`, todo, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async deleteTodo(todoId: number): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/${todoId}`, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  async toggleComplete(todoId: number): Promise<boolean> {
    try {
      await axios.patch(`${this.baseURL}/${todoId}/toggle`, {}, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error toggling todo:', error);
      throw error;
    }
  }

  async togglePriority(todoId: number): Promise<boolean> {
    try {
      await axios.patch(`${this.baseURL}/${todoId}/priority`, {}, this.getAuthHeader());
      return true;
    } catch (error) {
      console.error('Error toggling priority:', error);
      throw error;
    }
  }
}

export default new TodosService();
