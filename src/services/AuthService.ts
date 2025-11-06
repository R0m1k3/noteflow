import { showError, showSuccess } from "@/utils/toast";

interface User {
  id: number;
  username: string;
  is_admin: boolean;
}

class AuthService {
  private token: string | null;
  private user: User | null;

  constructor() {
    this.token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    this.user = userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  getHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.token || ""}`,
      "Content-Type": "application/json"
    };
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur de connexion");
      }

      this.token = data.token;
      this.user = data.user;
      localStorage.setItem("token", this.token || "");
      localStorage.setItem("user", JSON.stringify(this.user || {}));
      
      showSuccess("Connexion réussie");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur de connexion");
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    this.token = null;
    this.user = null;
    showSuccess("Déconnexion réussie");
  }

  async checkTokenValidity(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const response = await fetch("/api/auth/me", {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }
}

export default new AuthService();