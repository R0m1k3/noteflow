class App {
    constructor() {
        // Initialize app components
        this.auth = window.auth;
        this.notes = window.notes;
        this.admin = window.admin;
    }

    init() {
        // Load initial data if authenticated
        if (this.auth && this.auth.token) {
            if (this.notes && typeof this.notes.loadNotes === 'function') {
                this.notes.loadNotes();
            }
            
            if (this.auth.user && this.auth.user.is_admin && this.admin && typeof this.admin.loadUsers === 'function') {
                this.admin.loadUsers();
            }
        }
    }
}

// Initialize main app
window.app = new App();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && typeof window.app.init === 'function') {
        window.app.init();
    }
});