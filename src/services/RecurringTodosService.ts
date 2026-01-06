import axios from 'axios';

export interface RecurringTodo {
    id?: number;
    text: string;
    recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    recurrence_interval: number;
    day_of_week?: number;
    day_of_month?: number;
    priority: boolean;
    next_occurrence: string;
    last_generated?: string;
    enabled: boolean;
    created_at?: string;
}

class RecurringTodosService {
    private baseURL = '/api/recurring-todos';

    private getAuthHeader() {
        const token = localStorage.getItem('token');
        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
    }

    async getAll(): Promise<RecurringTodo[]> {
        try {
            const response = await axios.get(this.baseURL, this.getAuthHeader());
            return response.data;
        } catch (error) {
            console.error('Error fetching recurring todos:', error);
            throw error;
        }
    }

    async create(data: Partial<RecurringTodo>): Promise<RecurringTodo> {
        try {
            const response = await axios.post(this.baseURL, data, this.getAuthHeader());
            return response.data;
        } catch (error) {
            console.error('Error creating recurring todo:', error);
            throw error;
        }
    }

    async update(id: number, data: Partial<RecurringTodo>): Promise<RecurringTodo> {
        try {
            const response = await axios.put(`${this.baseURL}/${id}`, data, this.getAuthHeader());
            return response.data;
        } catch (error) {
            console.error('Error updating recurring todo:', error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            await axios.delete(`${this.baseURL}/${id}`, this.getAuthHeader());
            return true;
        } catch (error) {
            console.error('Error deleting recurring todo:', error);
            throw error;
        }
    }

    async generateNow(): Promise<{ generated: number }> {
        try {
            const response = await axios.post(`${this.baseURL}/generate`, {}, this.getAuthHeader());
            return response.data;
        } catch (error) {
            console.error('Error generating recurring todos:', error);
            throw error;
        }
    }
}

export default new RecurringTodosService();
