class AuthService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.loginForm = document.getElementById('login-form');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userInfo = document.getElementById('user-info');
        this.adminPanel = document.getElementById('admin-panel');
        
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erreur de connexion');
            }

            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            this.updateUI();
            if (window.app && typeof window.app.init === 'function') {
                window.app.init(); // Initialize main app after login
            }
        } catch (error) {
            alert(error.message);
        }
    }

    handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        this.updateUI();
        window.location.reload();
    }

    updateUI() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        
        // S'assurer que le panneau d'administration est caché au démarrage
        if (this.adminPanel) {
            this.adminPanel.classList.add('hidden');
        }

        if (this.token && this.user) {
            if (authContainer) authContainer.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
            if (this.userInfo) this.userInfo.textContent = this.user.username;
            
            // Show admin panel button if user is admin
            if (this.user.is_admin) {
                const adminBtnExists = document.querySelector('.admin-btn');
                if (!adminBtnExists && this.userInfo && this.userInfo.parentNode) {
                    const adminBtn = document.createElement('button');
                    adminBtn.className = 'admin-btn ml-4 text-sm text-gray-600 hover:text-gray-900';
                    adminBtn.textContent = 'Admin';
                    adminBtn.onclick = () => {
                        if (this.adminPanel) this.adminPanel.classList.remove('hidden');
                    };
                    this.userInfo.parentNode.insertBefore(adminBtn, this.logoutBtn);
                }
            }
        } else {
            if (authContainer) authContainer.classList.remove('hidden');
            if (appContainer) appContainer.classList.add('hidden');
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token || ''}`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialize auth service
window.auth = new AuthService();