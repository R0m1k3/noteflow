class App {
    constructor() {
        // Initialize app components
        this.auth = window.auth;
        this.notes = window.notes;
        this.admin = window.admin;
    }

    init() {
        // Load initial data if authenticated
        if (this.auth.token) {
            this.notes.loadNotes();
            if (this.auth.user.is_admin) {
                this.admin.loadUsers();
            }
        }
    }
}

// Initialize main app
window.app = new App();