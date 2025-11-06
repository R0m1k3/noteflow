class AdminService {
    constructor() {
        if (!window.auth.user?.is_admin) return;

        this.adminPanel = document.getElementById('admin-panel');
        this.closeAdminBtn = document.getElementById('close-admin-btn');
        this.addUserBtn = document.getElementById('add-user-btn');
        this.usersList = document.getElementById('users-list');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.closeAdminBtn.addEventListener('click', () => this.closePanel());
        this.addUserBtn.addEventListener('click', () => this.showAddUserForm());
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: window.auth.getHeaders()
            });
            const users = await response.json();
            this.renderUsersList(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUsersList(users) {
        this.usersList.innerHTML = '';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div>
                    <span class="font-medium">${user.username}</span>
                    ${user.is_admin ? '<span class="ml-2 text-sm text-blue-600">Admin</span>' : ''}
                </div>
                <div class="actions">
                    ${user.id !== 1 ? `
                        <button class="text-gray-600 hover:text-blue-600" onclick="window.admin.changePassword(${user.id})">
                            <i data-lucide="key"></i>
                        </button>
                        <button class="text-gray-600 hover:text-blue-600" onclick="window.admin.toggleAdmin(${user.id}, ${user.is_admin})">
                            <i data-lucide="shield"></i>
                        </button>
                        <button class="text-gray-600 hover:text-red-600" onclick="window.admin.deleteUser(${user.id})">
                            <i data-lucide="trash-2"></i>
                        </button>
                    ` : ''}
                </div>
            `;
            this.usersList.appendChild(userElement);
        });
        lucide.createIcons();
    }

    showAddUserForm() {
        const username = prompt('Nom d\'utilisateur:');
        if (!username) return;

        const password = prompt('Mot de passe:');
        if (!password) return;

        const isAdmin = confirm('Donner les droits administrateur ?');

        this.createUser(username, password, isAdmin);
    }

    async createUser(username, password, isAdmin) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: window.auth.getHeaders(),
                body: JSON.stringify({ username, password, is_admin: isAdmin })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            this.loadUsers();
        } catch (error) {
            alert(error.message);
        }
    }

    async changePassword(userId) {
        const password = prompt('Nouveau mot de passe:');
        if (!password) return;

        try {
            await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: window.auth.getHeaders(),
                body: JSON.stringify({ password })
            });
            alert('Mot de passe modifié');
        } catch (error) {
            console.error('Error changing password:', error);
        }
    }

    async toggleAdmin(userId, currentStatus) {
        try {
            await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: window.auth.getHeaders(),
                body: JSON.stringify({ is_admin: !currentStatus })
            });
            this.loadUsers();
        } catch (error) {
            console.error('Error toggling admin status:', error);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

        try {
            await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: window.auth.getHeaders()
            });
            this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    closePanel() {
        this.adminPanel.classList.add('hidden');
    }
}

// Initialize admin service
window.admin = new AdminService();