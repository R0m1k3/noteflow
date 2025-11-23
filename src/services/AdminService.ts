import AuthService from "./AuthService";
import { showError, showSuccess } from "@/utils/toast";

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at?: string;
}

class AdminService {
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch("/api/users", {
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des utilisateurs");
      }

      const users = await response.json();

      // Vérifier que les données sont un tableau
      if (!Array.isArray(users)) {
        return [];
      }

      return users;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return [];
    }
  }

  async createUser(username: string, password: string, isAdmin: boolean): Promise<User | null> {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ username, password, is_admin: isAdmin })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création de l'utilisateur");
      }

      showSuccess("Utilisateur créé avec succès");
      return await response.json();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return null;
    }
  }

  async updateUserPassword(userId: number, password: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification du mot de passe");
      }

      showSuccess("Mot de passe modifié avec succès");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async toggleAdminStatus(userId: number, currentStatus: boolean): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: AuthService.getHeaders(),
        body: JSON.stringify({ is_admin: !currentStatus })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification des droits");
      }

      showSuccess("Droits modifiés avec succès");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: AuthService.getHeaders()
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'utilisateur");
      }

      showSuccess("Utilisateur supprimé avec succès");
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erreur serveur");
      return false;
    }
  }

  async runInProgressMigration(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/api/admin/migrate/in-progress", {
        method: "POST",
        headers: AuthService.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la migration");
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur"
      };
    }
  }
}

// Créer une instance unique
const adminServiceInstance = new AdminService();
export default adminServiceInstance;