class NotesService {
    constructor() {
        this.currentNote = null;
        this.notes = [];
        
        // DOM Elements
        this.notesList = document.getElementById('notes-list');
        this.noteEditor = document.getElementById('note-editor');
        this.noteTitle = document.getElementById('note-title');
        this.noteContent = document.getElementById('note-content');
        this.todosList = document.getElementById('todos-list');
        this.imagesList = document.getElementById('images-list');
        this.searchInput = document.getElementById('search-notes');
        this.newNoteBtn = document.getElementById('new-note-btn');
        this.archiveNoteBtn = document.getElementById('archive-note-btn');
        this.deleteNoteBtn = document.getElementById('delete-note-btn');
        this.addTodoBtn = document.getElementById('add-todo-btn');
        this.imageUpload = document.getElementById('image-upload');

        this.setupEventListeners();
        this.loadNotes();
    }

    setupEventListeners() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.archiveNoteBtn.addEventListener('click', () => this.toggleArchiveNote());
        this.deleteNoteBtn.addEventListener('click', () => this.deleteNote());
        this.addTodoBtn.addEventListener('click', () => this.addTodo());
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        
        // Auto-save on content changes
        this.noteTitle.addEventListener('input', () => this.autoSave());
        this.noteContent.addEventListener('input', () => this.autoSave());
    }

    async loadNotes() {
        try {
            const response = await fetch('/api/notes', {
                headers: window.auth.getHeaders()
            });
            this.notes = await response.json();
            this.renderNotesList();
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    renderNotesList(searchTerm = '') {
        this.notesList.innerHTML = '';
        
        const filteredNotes = searchTerm 
            ? this.notes.filter(note => 
                note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : this.notes;

        filteredNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = `note-item ${note.id === this.currentNote?.id ? 'active' : ''}`;
            noteElement.innerHTML = `
                <h3 class="font-medium">${note.title || 'Sans titre'}</h3>
                <p class="text-sm text-gray-500 truncate">${note.content || ''}</p>
            `;
            noteElement.addEventListener('click', () => this.selectNote(note));
            this.notesList.appendChild(noteElement);
        });
    }

    selectNote(note) {
        this.currentNote = note;
        this.noteTitle.value = note.title;
        this.noteContent.innerHTML = note.content;
        this.renderTodos();
        this.renderImages();
        this.renderNotesList(); // Update active state
    }

    renderTodos() {
        this.todosList.innerHTML = '';
        this.currentNote.todos.forEach((todo, index) => {
            const todoElement = document.createElement('div');
            todoElement.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            todoElement.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span>${todo.text}</span>
                <button class="ml-auto text-gray-400 hover:text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            
            const checkbox = todoElement.querySelector('input');
            checkbox.addEventListener('change', () => this.toggleTodo(index));
            
            const deleteBtn = todoElement.querySelector('button');
            deleteBtn.addEventListener('click', () => this.deleteTodo(index));
            
            this.todosList.appendChild(todoElement);
        });
    }

    renderImages() {
        this.imagesList.innerHTML = '';
        this.currentNote.images.forEach((image, index) => {
            const imageElement = document.createElement('div');
            imageElement.className = 'image-thumbnail';
            imageElement.innerHTML = `
                <img src="/uploads/${image.filename}" alt="Note image">
                <button class="delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            
            const deleteBtn = imageElement.querySelector('button');
            deleteBtn.addEventListener('click', () => this.deleteImage(image.id));
            
            this.imagesList.appendChild(imageElement);
        });
    }

    async createNewNote() {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: window.auth.getHeaders(),
                body: JSON.stringify({
                    title: 'Nouvelle note',
                    content: '',
                    todos: []
                })
            });
            
            const newNote = await response.json();
            this.notes.unshift(newNote);
            this.renderNotesList();
            this.selectNote(newNote);
        } catch (error) {
            console.error('Error creating note:', error);
        }
    }

    async autoSave() {
        if (!this.currentNote) return;
        
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            try {
                await fetch(`/api/notes/${this.currentNote.id}`, {
                    method: 'PUT',
                    headers: window.auth.getHeaders(),
                    body: JSON.stringify({
                        title: this.noteTitle.value,
                        content: this.noteContent.innerHTML,
                        todos: this.currentNote.todos
                    })
                });
                
                // Update local note
                this.currentNote.title = this.noteTitle.value;
                this.currentNote.content = this.noteContent.innerHTML;
                this.renderNotesList();
            } catch (error) {
                console.error('Error saving note:', error);
            }
        }, 1000);
    }

    async toggleArchiveNote() {
        if (!this.currentNote) return;
        
        try {
            await fetch(`/api/notes/${this.currentNote.id}`, {
                method: 'PUT',
                headers: window.auth.getHeaders(),
                body: JSON.stringify({
                    ...this.currentNote,
                    archived: !this.currentNote.archived
                })
            });
            
            this.currentNote.archived = !this.currentNote.archived;
            this.renderNotesList();
        } catch (error) {
            console.error('Error archiving note:', error);
        }
    }

    async deleteNote() {
        if (!this.currentNote || !confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;
        
        try {
            await fetch(`/api/notes/${this.currentNote.id}`, {
                method: 'DELETE',
                headers: window.auth.getHeaders()
            });
            
            const index = this.notes.findIndex(n => n.id === this.currentNote.id);
            this.notes.splice(index, 1);
            this.currentNote = null;
            this.renderNotesList();
            this.noteTitle.value = '';
            this.noteContent.innerHTML = '';
            this.todosList.innerHTML = '';
            this.imagesList.innerHTML = '';
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    }

    async addTodo() {
        if (!this.currentNote) return;
        
        const text = prompt('Nouveau todo:');
        if (!text) return;
        
        this.currentNote.todos.push({ text, completed: false });
        this.renderTodos();
        this.autoSave();
    }

    async toggleTodo(index) {
        if (!this.currentNote) return;
        
        this.currentNote.todos[index].completed = !this.currentNote.todos[index].completed;
        this.renderTodos();
        this.autoSave();
    }

    async deleteTodo(index) {
        if (!this.currentNote) return;
        
        this.currentNote.todos.splice(index, 1);
        this.renderTodos();
        this.autoSave();
    }

    async handleImageUpload(event) {
        if (!this.currentNote || !event.target.files.length) return;
        
        const formData = new FormData();
        formData.append('image', event.target.files[0]);
        
        try {
            const response = await fetch(`/api/notes/${this.currentNote.id}/images`, {
                method: 'POST',
                headers: { 'Authorization': window.auth.getHeaders().Authorization },
                body: formData
            });
            
            const image = await response.json();
            this.currentNote.images.push(image);
            this.renderImages();
        } catch (error) {
            console.error('Error uploading image:', error);
        }
        
        event.target.value = ''; // Reset input
    }

    async deleteImage(imageId) {
        if (!this.currentNote || !confirm('Supprimer cette image ?')) return;
        
        try {
            await fetch(`/api/notes/${this.currentNote.id}/images/${imageId}`, {
                method: 'DELETE',
                headers: window.auth.getHeaders()
            });
            
            const index = this.currentNote.images.findIndex(img => img.id === imageId);
            this.currentNote.images.splice(index, 1);
            this.renderImages();
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    }

    handleSearch(event) {
        this.renderNotesList(event.target.value);
    }
}

// Initialize notes service
window.notes = new NotesService();