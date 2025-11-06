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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                        </button>
                        <button class="text-gray-600 hover:text-blue-600" onclick="window.admin.toggleAdmin(${user.id}, ${user.is_admin})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </button>
                        <button class="text-gray-600 hover:text-red-600" onclick="window.admin.deleteUser(${user.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    ` : ''}
                </div>
            `;
            this.usersList.appendChild(userElement);
        });
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