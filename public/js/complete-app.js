// Application NoteFlow - JavaScript complet
// Ce fichier regroupe toute la logique de l'application pour simplifier le déploiement

// ==================== UTILS ====================
const utils = {
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  },

  truncate(text, length = 150) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// ==================== MODAL DE CONFIRMATION ====================
const confirmDialog = {
  show(options = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const icon = document.getElementById('confirmIcon');
      const title = document.getElementById('confirmTitle');
      const message = document.getElementById('confirmMessage');
      const cancelBtn = document.getElementById('confirmCancel');
      const okBtn = document.getElementById('confirmOk');

      // Configurer le contenu
      icon.textContent = options.icon || '⚠️';
      title.textContent = options.title || 'Confirmer l\'action';
      message.textContent = options.message || 'Êtes-vous sûr de vouloir continuer ?';
      cancelBtn.textContent = options.cancelText || 'Annuler';
      okBtn.textContent = options.okText || 'Confirmer';

      // Gérer les clics
      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };

      const cleanup = () => {
        modal.classList.remove('active');
        setTimeout(() => {
          modal.style.display = 'none';
        }, 300);
        cancelBtn.removeEventListener('click', handleCancel);
        okBtn.removeEventListener('click', handleConfirm);
        document.removeEventListener('keydown', handleEscape);
      };

      // Ajouter les écouteurs
      cancelBtn.addEventListener('click', handleCancel);
      okBtn.addEventListener('click', handleConfirm);
      document.addEventListener('keydown', handleEscape);

      // Afficher le modal
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    });
  }
};

// ==================== API ====================
const api = {
  async request(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    const response = await fetch(url, config);

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
      throw new Error('Non authentifié');
    }

    return response;
  },

  async get(url) {
    const response = await this.request(url);
    return response.json();
  },

  async post(url, data) {
    const response = await this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async put(url, data) {
    const response = await this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async delete(url) {
    const response = await this.request(url, {
      method: 'DELETE'
    });
    return response.json();
  },

  async uploadFile(url, formData) {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.status === 401) {
      window.location.href = '/login.html';
      throw new Error('Non authentifié');
    }

    return response.json();
  }
};

// ==================== STATE ====================
const state = {
  notes: [],
  todos: [],
  currentNote: null,
  expandedNoteId: null,
  filter: 'all',
  searchQuery: '',
  view: 'active',
  user: null
};

// ==================== AUTH ====================
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }

  const userStr = localStorage.getItem('user');
  if (userStr) {
    state.user = JSON.parse(userStr);
  }

  return true;
}

async function initAuth() {
  if (!checkAuth()) return;

  // Afficher le nom d'utilisateur
  const userNameEl = document.getElementById('userName');
  if (userNameEl && state.user) {
    userNameEl.textContent = state.user.username;
  }

  // Afficher le bouton admin si nécessaire
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn && state.user && state.user.is_admin) {
    adminBtn.style.display = 'block';
  }

  // Gérer la déconnexion
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api.post('/api/auth/logout', {});
      } catch (e) {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    });
  }

  // Toggle user dropdown
  const userInfo = document.getElementById('userInfo');
  const userDropdown = document.getElementById('userDropdown');
  if (userInfo && userDropdown) {
    userInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }
}

// ==================== NOTES ====================
async function loadNotes() {
  try {
    const archived = state.view === 'archived';
    const response = await api.get(`/api/notes?archived=${archived}`);
    // S'assurer que response est un tableau
    state.notes = Array.isArray(response) ? response : [];
    renderNotes();
  } catch (error) {
    console.error('Erreur chargement notes:', error);
    state.notes = [];
    renderNotes();
  }
}

function renderNotes() {
  const notesGrid = document.getElementById('notesGrid');
  if (!notesGrid) return;

  // S'assurer que state.notes est toujours un tableau
  if (!Array.isArray(state.notes)) {
    state.notes = [];
  }

  let filtered = state.notes;

  // Filtre de recherche
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(query) ||
      (note.content && note.content.toLowerCase().includes(query))
    );
  }

  notesGrid.innerHTML = '';

  if (filtered.length === 0) {
    notesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 40px;">Aucune note trouvée</p>';
    return;
  }

  filtered.forEach(note => {
    const card = createNoteCard(note);
    notesGrid.appendChild(card);
  });
}

function createNoteCard(note) {
  const card = document.createElement('div');
  const isExpanded = state.expandedNoteId === note.id;
  card.className = `note-card ${isExpanded ? 'expanded' : ''}`;
  card.dataset.noteId = note.id;

  if (isExpanded) {
    // Mode édition inline
    card.innerHTML = `
      <div class="note-card-header">
        <input type="text" class="note-title-input-inline" value="${escapeHtml(note.title)}" placeholder="Titre" data-note-id="${note.id}">
        <div class="note-actions">
          <button class="btn-icon-small btn-archive-note" data-note-id="${note.id}" data-archived="${note.archived}" title="${note.archived ? 'Désarchiver' : 'Archiver'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
            </svg>
          </button>
          <button class="btn-icon-small btn-delete-note-inline" data-note-id="${note.id}" title="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="btn-icon-small btn-collapse-note" title="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <textarea class="note-content-textarea-inline" placeholder="Contenu..." data-note-id="${note.id}">${escapeHtml(note.content || '')}</textarea>
      ${note.image_filename ? `
        <div class="note-image-container-inline">
          <img src="/uploads/${note.image_filename}" class="note-card-image" alt="">
          <button class="btn-remove-image-inline" data-note-id="${note.id}">✕</button>
        </div>
      ` : ''}
      ${note.files && note.files.length > 0 ? `
        <div class="note-files-container-inline">
          <div class="note-files-list" id="files-${note.id}">
            ${renderInlineFiles(note.files || [])}
          </div>
        </div>
      ` : ''}
      <div class="note-todos-inline">
        <h4>Todos</h4>
        <div class="todos-list-inline" id="todos-${note.id}">
          ${renderInlineTodos(note.todos || [])}
        </div>
        <div class="add-todo-inline-container">
          <input type="text" class="add-todo-inline-input" placeholder="Ajouter une tâche..." data-note-id="${note.id}">
          <button class="btn-add-todo-inline" data-note-id="${note.id}">Ajouter</button>
        </div>
      </div>
      <div class="note-footer-inline">
        <button class="btn-add-image-inline" data-note-id="${note.id}" title="Ajouter une image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
        <button class="btn-add-file-inline" data-note-id="${note.id}" title="Ajouter un fichier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
        </button>
        <span class="note-meta-inline">${utils.formatDate(note.updated_at)}</span>
      </div>
    `;

    // Auto-save sur changement
    setTimeout(() => {
      const titleInput = card.querySelector('.note-title-input-inline');
      const contentTextarea = card.querySelector('.note-content-textarea-inline');
      if (titleInput) titleInput.oninput = utils.debounce(() => saveNoteInline(note.id), 1000);
      if (contentTextarea) contentTextarea.oninput = utils.debounce(() => saveNoteInline(note.id), 1000);
    }, 0);
  } else {
    // Mode compact
    let html = `
      <div class="note-card-compact" data-note-id="${note.id}">
        <div class="note-card-title">${escapeHtml(note.title)}</div>
    `;

    if (note.content) {
      html += `<div class="note-card-preview">${escapeHtml(utils.truncate(note.content, 100))}</div>`;
    }

    if (note.image_filename) {
      html += `<img src="/uploads/${note.image_filename}" class="note-card-image" alt="">`;
    }

    // Afficher les todos
    if (note.todos && note.todos.length > 0) {
      const displayTodos = note.todos.slice(0, 3);
      html += `<div class="note-todos-preview">`;
      displayTodos.forEach(todo => {
        html += `<div class="todo-preview ${todo.completed ? 'completed' : ''}">
          <span class="todo-checkbox-preview">${todo.completed ? '☑' : '☐'}</span>
          <span class="todo-text-preview">${escapeHtml(todo.text)}</span>
        </div>`;
      });
      if (note.todos.length > 3) {
        html += `<div class="todo-more">+${note.todos.length - 3} autre(s)</div>`;
      }
      html += `</div>`;
    }

    html += `
        <div class="note-card-meta">
          <span class="note-card-date">${utils.formatDate(note.updated_at)}</span>
          ${note.todos_count > 0 ? `<span class="note-card-todos-count">${note.todos_completed}/${note.todos_count}</span>` : ''}
        </div>
      </div>
    `;

    card.innerHTML = html;
  }

  return card;
}

function renderInlineTodos(todos) {
  if (!todos || todos.length === 0) return '<p class="no-todos">Aucune tâche</p>';
  return todos.map(todo => `
    <div class="todo-item-inline" data-todo-inline-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox-inline" ${todo.completed ? 'checked' : ''} data-todo-inline-id="${todo.id}">
      <span class="todo-text-inline ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</span>
      <button class="todo-delete-inline" data-todo-inline-id="${todo.id}">✕</button>
    </div>
  `).join('');
}

function renderInlineFiles(files) {
  if (!files || files.length === 0) return '';

  return files.map(file => {
    const sizeStr = formatFileSize(file.file_size);
    return `
      <div class="note-file-item" data-file-id="${file.id}">
        <svg class="note-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        <div class="note-file-info">
          <div class="note-file-name">${escapeHtml(file.original_name)}</div>
          <div class="note-file-size">${sizeStr}</div>
        </div>
        <div class="note-file-actions">
          <button class="btn-download-file" data-file-id="${file.id}" title="Télécharger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="btn-delete-file" data-file-id="${file.id}" title="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== INLINE NOTE EXPANSION ====================
function expandNote(noteId) {
  state.expandedNoteId = noteId;
  renderNotes();
}

function collapseNote() {
  state.expandedNoteId = null;
  renderNotes();
}

async function saveNoteInline(noteId) {
  const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
  if (!card) return;

  const titleInput = card.querySelector('.note-title-input-inline');
  const contentTextarea = card.querySelector('.note-content-textarea-inline');

  if (!titleInput) return;

  try {
    await api.put(`/api/notes/${noteId}`, {
      title: titleInput.value,
      content: contentTextarea ? contentTextarea.value : ''
    });

    // Update state without full reload
    const noteIndex = state.notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      state.notes[noteIndex].title = titleInput.value;
      state.notes[noteIndex].content = contentTextarea ? contentTextarea.value : '';
      state.notes[noteIndex].updated_at = new Date().toISOString();
    }
  } catch (error) {
    console.error('Erreur sauvegarde note:', error);
  }
}

async function archiveNote(noteId, archived) {
  try {
    await api.put(`/api/notes/${noteId}/archive`, { archived });
    collapseNote();
    await loadNotes();
  } catch (error) {
    console.error('Erreur archivage note:', error);
    alert('Erreur lors de l\'archivage de la note');
  }
}

async function deleteNoteInline(noteId) {
  const confirmed = await confirmDialog.show({
    icon: '🗑️',
    title: 'Supprimer cette note',
    message: 'Êtes-vous sûr de vouloir supprimer cette note ?\n\nTous les todos associés seront également supprimés.',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/${noteId}`);
    collapseNote();
    await loadNotes();
  } catch (error) {
    console.error('Erreur suppression note:', error);
    alert('Erreur lors de la suppression de la note');
  }
}

async function addNoteTodoInline(noteId, inputElement) {
  const text = inputElement.value.trim();
  if (!text) return;

  try {
    await api.post(`/api/notes/${noteId}/todos`, { text });

    // Recharger seulement cette note
    const note = await api.get(`/api/notes/${noteId}`);
    const noteIndex = state.notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      state.notes[noteIndex] = note;
    }

    // Re-render la liste des todos inline
    const todosList = document.getElementById(`todos-${noteId}`);
    if (todosList) {
      todosList.innerHTML = renderInlineTodos(note.todos || []);
    }

    // Clear input
    inputElement.value = '';
    inputElement.focus();
  } catch (error) {
    console.error('Erreur ajout todo:', error);
    alert('Erreur lors de l\'ajout du todo');
  }
}

async function toggleNoteTodoInline(todoId, completed) {
  try {
    await api.put(`/api/notes/todos/${todoId}`, { completed });
    // Update UI optimistically
    const todoItem = document.querySelector(`.todo-item-inline[data-todo-inline-id="${todoId}"]`);
    if (todoItem) {
      const textSpan = todoItem.querySelector('.todo-text-inline');
      if (textSpan) {
        if (completed) {
          textSpan.classList.add('completed');
        } else {
          textSpan.classList.remove('completed');
        }
      }
    }
  } catch (error) {
    console.error('Erreur toggle todo:', error);
  }
}

async function deleteNoteTodoInline(todoId) {
  const confirmed = await confirmDialog.show({
    icon: '🗑️',
    title: 'Supprimer ce todo',
    message: 'Êtes-vous sûr de vouloir supprimer ce todo ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/todos/${todoId}`);
    // Remove from DOM
    const todoItem = document.querySelector(`.todo-item-inline[data-todo-inline-id="${todoId}"]`);
    if (todoItem) {
      todoItem.remove();
    }
  } catch (error) {
    console.error('Erreur suppression todo:', error);
  }
}

function triggerImageUpload(noteId) {
  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.dataset.noteId = noteId;
    imageInput.click();
  }
}

function triggerFileUpload(noteId) {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.dataset.noteId = noteId;
    fileInput.click();
  }
}

async function removeImageInline(noteId) {
  const confirmed = await confirmDialog.show({
    icon: '🖼️',
    title: 'Supprimer l\'image',
    message: 'Êtes-vous sûr de vouloir supprimer cette image ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/${noteId}/image`);

    // Update state
    const noteIndex = state.notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      state.notes[noteIndex].image_filename = null;
    }

    // Re-render expanded card
    renderNotes();
  } catch (error) {
    console.error('Erreur suppression image:', error);
    alert('Erreur lors de la suppression de l\'image');
  }
}

async function handleImageUploadInline(event) {
  const file = event.target.files[0];
  const noteId = event.target.dataset.noteId;

  if (!file || !noteId) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const result = await api.uploadFile(`/api/notes/${noteId}/image`, formData);

    // Update state
    const noteIndex = state.notes.findIndex(n => n.id === parseInt(noteId));
    if (noteIndex !== -1) {
      state.notes[noteIndex].image_filename = result.filename;
    }

    // Re-render expanded card
    renderNotes();
  } catch (error) {
    console.error('Erreur upload image:', error);
    alert('Erreur lors de l\'upload de l\'image');
  }

  // Reset input
  event.target.value = '';
  event.target.dataset.noteId = '';
}

async function handleFileUploadInline(event) {
  const file = event.target.files[0];
  const noteId = event.target.dataset.noteId;

  if (!file || !noteId) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const result = await api.uploadFile(`/api/notes/${noteId}/files`, formData);

    // Reload notes to get updated files list
    await loadNotes();

    // Keep the note expanded
    state.expandedNoteId = parseInt(noteId);
    renderNotes();
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    alert('Erreur lors de l\'upload du fichier: ' + (error.message || 'Erreur inconnue'));
  }

  // Reset input
  event.target.value = '';
  event.target.dataset.noteId = '';
}

async function downloadFile(fileId) {
  try {
    // Ouvrir le lien de téléchargement dans un nouvel onglet
    window.open(`/api/notes/files/${fileId}/download`, '_blank');
  } catch (error) {
    console.error('Erreur téléchargement fichier:', error);
    alert('Erreur lors du téléchargement du fichier');
  }
}

async function deleteFile(fileId) {
  const confirmed = await confirmDialog.show({
    icon: '📎',
    title: 'Supprimer ce fichier',
    message: 'Êtes-vous sûr de vouloir supprimer ce fichier ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/files/${fileId}`);

    // Reload notes to get updated files list
    await loadNotes();

    // Keep the note expanded
    if (state.expandedNoteId) {
      renderNotes();
    }
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    alert('Erreur lors de la suppression du fichier');
  }
}

async function createNewNote() {
  try {
    const newNote = await api.post('/api/notes', {
      title: 'Nouvelle note',
      content: ''
    });

    // Reload notes
    await loadNotes();

    // Expand the new note
    state.expandedNoteId = newNote.id;
    renderNotes();

    // Focus title input
    setTimeout(() => {
      const titleInput = document.querySelector('.note-title-input-inline');
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 100);
  } catch (error) {
    console.error('Erreur création note:', error);
    alert('Erreur lors de la création de la note');
  }
}

function setNoteView(view) {
  state.view = view;
  document.querySelectorAll('.view-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  loadNotes();
}

// ==================== MODAL (OLD - DEPRECATED) ====================
let saveTimeout;
let currentNoteId = null;

async function openNoteModal(noteId = null) {
  currentNoteId = noteId;
  const modal = document.getElementById('noteEditorBackdrop');
  const titleInput = document.getElementById('noteTitle');
  const contentTextarea = document.getElementById('noteContent');
  const imageContainer = document.getElementById('noteImageContainer');
  const noteImage = document.getElementById('noteImage');
  const noteTodosList = document.getElementById('noteTodosList');
  const metadata = document.getElementById('noteMetadata');

  if (noteId) {
    // Charger la note existante
    try {
      const note = await api.get(`/api/notes/${noteId}`);
      state.currentNote = note;

      titleInput.value = note.title;
      contentTextarea.value = note.content || '';

      if (note.image_filename) {
        noteImage.src = `/uploads/${note.image_filename}`;
        imageContainer.style.display = 'block';
      } else {
        imageContainer.style.display = 'none';
      }

      renderNoteTodos(note.todos || []);
      metadata.textContent = `Créée ${utils.formatDate(note.created_at)} • Modifiée ${utils.formatDate(note.updated_at)}`;
    } catch (error) {
      console.error('Erreur chargement note:', error);
      return;
    }
  } else {
    // Nouvelle note
    try {
      const newNote = await api.post('/api/notes', {
        title: 'Nouvelle note',
        content: ''
      });

      currentNoteId = newNote.id;
      state.currentNote = newNote;

      titleInput.value = newNote.title;
      contentTextarea.value = '';
      imageContainer.style.display = 'none';
      noteTodosList.innerHTML = '';
      metadata.textContent = 'Nouvelle note';

      // Rafraîchir la liste
      await loadNotes();
    } catch (error) {
      console.error('Erreur création note:', error);
      return;
    }
  }

  modal.style.display = 'flex';
  titleInput.focus();
  titleInput.select();

  // Auto-save sur les modifications
  setupAutoSave();
}

function setupAutoSave() {
  const titleInput = document.getElementById('noteTitle');
  const contentTextarea = document.getElementById('noteContent');

  const saveNote = async () => {
    if (!currentNoteId) return;

    try {
      await api.put(`/api/notes/${currentNoteId}`, {
        title: titleInput.value,
        content: contentTextarea.value
      });

      // Rafraîchir la liste
      await loadNotes();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const debouncedSave = utils.debounce(saveNote, 1000);

  titleInput.oninput = debouncedSave;
  contentTextarea.oninput = debouncedSave;
}

function renderNoteTodos(todos) {
  const list = document.getElementById('noteTodosList');
  list.innerHTML = '';

  todos.forEach(todo => {
    const item = document.createElement('div');
    item.className = 'todo-item';
    item.innerHTML = `
      <input type="checkbox" class="todo-checkbox" data-note-todo-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" data-note-todo-id="${todo.id}">✕</button>
    `;
    if (todo.completed) item.classList.add('completed');
    list.appendChild(item);
  });
}

async function addNoteTodo() {
  if (!currentNoteId) return;

  const text = prompt('Texte du todo:');
  if (!text) return;

  try {
    await api.post(`/api/notes/${currentNoteId}/todos`, { text });
    const note = await api.get(`/api/notes/${currentNoteId}`);
    renderNoteTodos(note.todos || []);
    await loadNotes();
  } catch (error) {
    console.error('Erreur ajout todo:', error);
  }
}

async function toggleNoteTodo(todoId, completed) {
  try {
    await api.put(`/api/notes/todos/${todoId}`, { completed });
    const note = await api.get(`/api/notes/${currentNoteId}`);
    renderNoteTodos(note.todos || []);
    await loadNotes();
  } catch (error) {
    console.error('Erreur toggle todo:', error);
  }
}

async function deleteNoteTodo(todoId) {
  const confirmed = await confirmDialog.show({
    icon: '🗑️',
    title: 'Supprimer ce todo',
    message: 'Êtes-vous sûr de vouloir supprimer ce todo ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/todos/${todoId}`);
    const note = await api.get(`/api/notes/${currentNoteId}`);
    renderNoteTodos(note.todos || []);
    await loadNotes();
  } catch (error) {
    console.error('Erreur suppression todo:', error);
  }
}

function closeNoteModal() {
  document.getElementById('noteEditorBackdrop').style.display = 'none';
  currentNoteId = null;
  state.currentNote = null;
}

async function saveCurrentNote() {
  if (!currentNoteId) return;

  const titleInput = document.getElementById('noteTitle');
  const contentTextarea = document.getElementById('noteContent');

  try {
    await api.put(`/api/notes/${currentNoteId}`, {
      title: titleInput.value,
      content: contentTextarea.value
    });

    await loadNotes();
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    throw error;
  }
}

async function deleteCurrentNote() {
  if (!currentNoteId) return;

  const confirmed = await confirmDialog.show({
    icon: '🗑️',
    title: 'Supprimer cette note',
    message: 'Êtes-vous sûr de vouloir supprimer cette note ?\n\nTous les todos associés seront également supprimés.',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/${currentNoteId}`);
    closeNoteModal();
    await loadNotes();
  } catch (error) {
    console.error('Erreur suppression note:', error);
  }
}

async function addNoteImage() {
  document.getElementById('imageInput').click();
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file || !currentNoteId) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const result = await api.uploadFile(`/api/notes/${currentNoteId}/image`, formData);
    document.getElementById('noteImage').src = result.url;
    document.getElementById('noteImageContainer').style.display = 'block';
    await loadNotes();
  } catch (error) {
    console.error('Erreur upload image:', error);
    alert('Erreur lors de l\'upload de l\'image');
  }
}

async function removeNoteImage() {
  if (!currentNoteId) return;

  const confirmed = await confirmDialog.show({
    icon: '🖼️',
    title: 'Supprimer l\'image',
    message: 'Êtes-vous sûr de vouloir supprimer cette image ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/notes/${currentNoteId}/image`);
    document.getElementById('noteImageContainer').style.display = 'none';
    await loadNotes();
  } catch (error) {
    console.error('Erreur suppression image:', error);
  }
}

// ==================== TODOS GLOBAUX ====================
async function loadTodos() {
  try {
    state.todos = await api.get('/api/todos');
    renderTodos();
  } catch (error) {
    console.error('Erreur chargement todos:', error);
  }
}

function renderTodos() {
  const todoList = document.getElementById('todoList');
  if (!todoList) return;

  todoList.innerHTML = '';

  const filtered = state.todos.filter(todo => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  filtered.forEach(todo => {
    const item = document.createElement('div');
    item.className = 'todo-item' + (todo.completed ? ' completed' : '');
    item.innerHTML = `
      <input type="checkbox" class="todo-checkbox" data-todo-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" data-todo-id="${todo.id}">✕</button>
    `;
    todoList.appendChild(item);
  });

  updateTodoCounter();
}

async function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();

  if (!text) return;

  try {
    await api.post('/api/todos', { text });
    input.value = '';
    await loadTodos();
  } catch (error) {
    console.error('Erreur ajout todo:', error);
  }
}

async function toggleTodo(id, completed) {
  try {
    await api.put(`/api/todos/${id}`, { completed });
    await loadTodos();
  } catch (error) {
    console.error('Erreur toggle todo:', error);
  }
}

async function deleteTodo(id) {
  const confirmed = await confirmDialog.show({
    icon: '🗑️',
    title: 'Supprimer cette tâche',
    message: 'Êtes-vous sûr de vouloir supprimer cette tâche ?',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/todos/${id}`);
    await loadTodos();
  } catch (error) {
    console.error('Erreur suppression todo:', error);
  }
}

function setTodoFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTodos();
}

function updateTodoCounter() {
  const counter = document.getElementById('todoCounter');
  if (!counter) return;

  const remaining = state.todos.filter(t => !t.completed).length;
  counter.textContent = `${remaining} tâche${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
}

// ==================== SEARCH ====================
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');

  if (!searchInput) return;

  const performSearch = utils.debounce(() => {
    state.searchQuery = searchInput.value.trim();
    renderNotes();

    if (state.searchQuery) {
      searchClear.style.display = 'block';
    } else {
      searchClear.style.display = 'none';
    }
  }, 300);

  searchInput.addEventListener('input', performSearch);

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClear.style.display = 'none';
      renderNotes();
    });
  }
}

// ==================== ADMIN ====================

// Tab switching
function switchAdminTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.style.display = 'none';
  });

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.style.display = 'block';
  }

  // Load data for the selected tab
  if (tabName === 'users') {
    loadUsers();
  } else if (tabName === 'rss') {
    loadRssFeeds();
  } else if (tabName === 'openrouter') {
    loadOpenRouterSettings();
  }
}

async function loadUsers() {
  try {
    const users = await api.get('/api/users');
    renderUsersTable(users);
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
    alert('Erreur lors du chargement des utilisateurs');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.is_admin ? '✓ Oui' : '✗ Non'}</td>
      <td>${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
      <td>
        <button class="btn-edit-user" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
          🔑 Mot de passe
        </button>
        ${user.id !== state.user.id ? `
          <button class="btn-delete-user" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}">
            🗑️ Supprimer
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (!modal) return;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);

  // Switch to users tab by default
  switchAdminTab('users');
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (!modal) return;

  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

async function createUser() {
  const username = prompt('Nom d\'utilisateur:');
  if (!username || username.trim().length < 3) {
    alert('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    return;
  }

  const password = prompt('Mot de passe:');
  if (!password || password.length < 4) {
    alert('Le mot de passe doit contenir au moins 4 caractères');
    return;
  }

  const isAdmin = await confirmDialog.show({
    icon: '👤',
    title: 'Droits administrateur',
    message: `Créer "${username}" en tant qu'administrateur ?`,
    okText: 'Oui, admin',
    cancelText: 'Non, utilisateur'
  });

  try {
    await api.post('/api/users', {
      username: username.trim(),
      password,
      is_admin: isAdmin
    });
    alert('Utilisateur créé avec succès');
    await loadUsers();
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    alert('Erreur lors de la création de l\'utilisateur. Il existe peut-être déjà.');
  }
}

// Password Change Modal
let currentPasswordChangeUserId = null;
let currentPasswordChangeUsername = null;

function openPasswordChangeModal(userId, username) {
  currentPasswordChangeUserId = userId;
  currentPasswordChangeUsername = username;

  const modal = document.getElementById('changePasswordModal');
  const usernameDisplay = document.getElementById('changePasswordUsername');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  if (usernameDisplay) {
    usernameDisplay.textContent = `Modifier le mot de passe de "${username}"`;
  }

  if (newPasswordInput) newPasswordInput.value = '';
  if (confirmPasswordInput) confirmPasswordInput.value = '';

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);

  if (newPasswordInput) newPasswordInput.focus();
}

function closePasswordChangeModal() {
  const modal = document.getElementById('changePasswordModal');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);

  currentPasswordChangeUserId = null;
  currentPasswordChangeUsername = null;
}

async function confirmPasswordChange() {
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!newPassword || newPassword.length < 6) {
    alert('Le mot de passe doit contenir au moins 6 caractères');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('Les mots de passe ne correspondent pas');
    return;
  }

  try {
    await api.put(`/api/users/${currentPasswordChangeUserId}`, { password: newPassword });
    alert('Mot de passe modifié avec succès');
    closePasswordChangeModal();
  } catch (error) {
    console.error('Erreur modification mot de passe:', error);
    alert('Erreur lors de la modification du mot de passe');
  }
}

async function changeUserPassword(id, username) {
  openPasswordChangeModal(id, username);
}

async function deleteUser(id, username) {
  const confirmed = await confirmDialog.show({
    icon: '⚠️',
    title: 'Supprimer cet utilisateur',
    message: `Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?\n\nToutes ses notes et todos seront également supprimés définitivement.`,
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/users/${id}`);
    alert('Utilisateur supprimé avec succès');
    await loadUsers();
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    alert('Erreur lors de la suppression de l\'utilisateur');
  }
}

// ==================== RSS FEEDS ====================
async function loadRssFeeds() {
  try {
    const feeds = await api.get('/api/rss/feeds');
    renderRssFeeds(feeds);
  } catch (error) {
    console.error('Erreur chargement flux RSS:', error);
    alert('Erreur lors du chargement des flux RSS');
  }
}

function renderRssFeeds(feeds) {
  const container = document.getElementById('rssFeedsList');
  if (!container) return;

  if (feeds.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Aucun flux RSS configuré</p>';
    return;
  }

  container.innerHTML = feeds.map(feed => `
    <div class="rss-feed-item">
      <div class="rss-feed-info">
        <div class="rss-feed-title">${escapeHtml(feed.title || feed.url)}</div>
        <div class="rss-feed-url">${escapeHtml(feed.url)}</div>
        ${feed.last_fetched_at ? `<div class="rss-feed-meta">Dernière maj: ${new Date(feed.last_fetched_at).toLocaleString('fr-FR')}</div>` : ''}
      </div>
      <div class="rss-feed-actions">
        <label class="rss-feed-toggle">
          <input type="checkbox" ${feed.enabled ? 'checked' : ''} data-feed-id="${feed.id}">
          <span class="rss-toggle-slider"></span>
        </label>
        <button class="btn-delete-feed" data-feed-id="${feed.id}" title="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

async function addRssFeed() {
  const input = document.getElementById('rssUrlInput');
  const url = input.value.trim();

  if (!url) {
    alert('Veuillez entrer une URL de flux RSS');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    alert('L\'URL doit commencer par http:// ou https://');
    return;
  }

  try {
    await api.post('/api/rss/feeds', { url });
    input.value = '';
    alert('Flux RSS ajouté avec succès');
    await loadRssFeeds();
  } catch (error) {
    console.error('Erreur ajout flux RSS:', error);
    alert('Erreur lors de l\'ajout du flux RSS. Vérifiez l\'URL.');
  }
}

async function toggleRssFeed(feedId, enabled) {
  try {
    await api.put(`/api/rss/feeds/${feedId}`, { enabled });
  } catch (error) {
    console.error('Erreur toggle flux RSS:', error);
    alert('Erreur lors de la modification du flux RSS');
  }
}

async function deleteRssFeed(feedId) {
  const confirmed = await confirmDialog.show({
    icon: '📰',
    title: 'Supprimer ce flux RSS',
    message: 'Êtes-vous sûr de vouloir supprimer ce flux RSS ?\n\nTous les articles associés seront également supprimés.',
    okText: 'Supprimer'
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/rss/feeds/${feedId}`);
    alert('Flux RSS supprimé avec succès');
    await loadRssFeeds();
  } catch (error) {
    console.error('Erreur suppression flux RSS:', error);
    alert('Erreur lors de la suppression du flux RSS');
  }
}

async function fetchRssArticles() {
  const btn = document.getElementById('fetchRssBtn');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔄 Récupération en cours...';

  try {
    const result = await api.post('/api/rss/fetch', {});
    alert(result.message || 'Articles récupérés avec succès');
    await loadRssArticles();
  } catch (error) {
    console.error('Erreur fetch articles RSS:', error);
    alert('Erreur lors de la récupération des articles RSS');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function loadRssArticles() {
  try {
    const articles = await api.get('/api/rss/articles');
    renderRssArticles(articles);
  } catch (error) {
    console.error('Erreur chargement articles RSS:', error);
  }
}

function renderRssArticles(articles) {
  const container = document.getElementById('rssArticlesList');
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = '<p class="rss-empty">Aucun article pour le moment</p>';
    return;
  }

  container.innerHTML = articles.map(article => `
    <div class="rss-article" data-link="${escapeHtml(article.link)}">
      <div class="rss-article-title">${escapeHtml(article.title)}</div>
      <div class="rss-article-meta">
        <span class="rss-article-source">${escapeHtml(article.feed_title)}</span>
        <span>${new Date(article.pub_date).toLocaleDateString('fr-FR')}</span>
      </div>
      ${article.description ? `<div class="rss-article-description">${escapeHtml(article.description)}</div>` : ''}
    </div>
  `).join('');
}

async function summarizeRss() {
  const btn = document.getElementById('summarizeRssBtn');
  if (!btn) return;

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/></svg>';

  try {
    const result = await api.post('/api/rss/summarize', {});

    // Create a new note with the summary
    const newNote = await api.post('/api/notes', {
      title: `📰 Résumé RSS - ${new Date().toLocaleDateString('fr-FR')}`,
      content: result.summary
    });

    alert('Résumé généré et sauvegardé dans une nouvelle note !');
    await loadNotes();

    // Expand the new note
    state.expandedNoteId = newNote.id;
    renderNotes();
  } catch (error) {
    console.error('Erreur génération résumé RSS:', error);
    if (error.message && error.message.includes('400')) {
      alert('Veuillez configurer votre clé API OpenRouter dans l\'administration');
    } else {
      alert('Erreur lors de la génération du résumé RSS');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ==================== OPENROUTER ====================
let allModels = [];

async function loadOpenRouterSettings() {
  try {
    const settings = await api.get('/api/settings');
    const models = await api.get('/api/rss/models');

    allModels = models;

    // Populate form
    const apiKeyInput = document.getElementById('openrouterApiKey');
    const modelSelect = document.getElementById('openrouterModel');
    const summaryEnabled = document.getElementById('rssSummaryEnabled');
    const summaryPrompt = document.getElementById('rssSummaryPrompt');

    if (apiKeyInput) {
      apiKeyInput.value = settings.openrouter_api_key || '';
    }

    if (summaryEnabled) {
      summaryEnabled.checked = settings.rss_summary_enabled === 'true' || settings.rss_summary_enabled === '1';
    }

    if (summaryPrompt) {
      summaryPrompt.value = settings.rss_summary_prompt || `Tu es un assistant spécialisé dans la synthèse d'actualités. Analyse les articles suivants et crée un résumé structuré et informatif.

Pour chaque article, identifie:
- Le sujet principal
- Les points clés
- L'importance de l'information

Ensuite, génère un résumé global qui:
1. Regroupe les thèmes communs
2. Hiérarchise les informations par importance
3. Présente une vue d'ensemble claire et concise
4. Utilise un style professionnel mais accessible

Format de sortie en Markdown avec des sections claires.`;
    }

    // Populate model selector
    renderModelSelect(models, settings.openrouter_model);

  } catch (error) {
    console.error('Erreur chargement paramètres OpenRouter:', error);
  }
}

function renderModelSelect(models, selectedModel) {
  const select = document.getElementById('openrouterModel');
  if (!select) return;

  select.innerHTML = models.map(model => `
    <option value="${escapeHtml(model.id)}" ${model.id === selectedModel ? 'selected' : ''}>
      ${escapeHtml(model.name)} (${escapeHtml(model.provider)})
    </option>
  `).join('');
}

function filterModels() {
  const searchInput = document.getElementById('modelSearch');
  const select = document.getElementById('openrouterModel');

  if (!searchInput || !select) return;

  const query = searchInput.value.toLowerCase();

  if (!query) {
    renderModelSelect(allModels, select.value);
    return;
  }

  const filtered = allModels.filter(model =>
    model.name.toLowerCase().includes(query) ||
    model.provider.toLowerCase().includes(query) ||
    model.id.toLowerCase().includes(query)
  );

  renderModelSelect(filtered, select.value);
}

async function saveOpenRouterSettings() {
  const apiKeyInput = document.getElementById('openrouterApiKey');
  const modelSelect = document.getElementById('openrouterModel');
  const summaryEnabled = document.getElementById('rssSummaryEnabled');
  const summaryPrompt = document.getElementById('rssSummaryPrompt');

  try {
    // Save all settings
    await api.put('/api/settings/openrouter_api_key', { value: apiKeyInput.value });
    await api.put('/api/settings/openrouter_model', { value: modelSelect.value });
    await api.put('/api/settings/rss_summary_enabled', { value: summaryEnabled.checked ? '1' : '0' });
    await api.put('/api/settings/rss_summary_prompt', { value: summaryPrompt.value });

    alert('Paramètres OpenRouter sauvegardés avec succès');
  } catch (error) {
    console.error('Erreur sauvegarde paramètres OpenRouter:', error);
    alert('Erreur lors de la sauvegarde des paramètres');
  }
}

// ==================== INIT ====================
async function init() {
  // Vérifier l'authentification
  await initAuth();

  // Charger les données
  await Promise.all([loadNotes(), loadTodos(), loadRssArticles()]);

  // Setup search
  setupSearch();

  // Event listeners
  const newNoteBtn = document.getElementById('newNoteBtn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', createNewNote);
  }

  // View filters (Active/Archived)
  document.querySelectorAll('.view-filter').forEach(btn => {
    btn.addEventListener('click', () => setNoteView(btn.dataset.view));
  });

  // Admin button
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) {
    adminBtn.addEventListener('click', openAdminModal);
  }

  const closeAdminModalBtn = document.getElementById('closeAdminModal');
  if (closeAdminModalBtn) {
    closeAdminModalBtn.addEventListener('click', closeAdminModal);
  }

  const createUserBtn = document.getElementById('createUserBtn');
  if (createUserBtn) {
    createUserBtn.addEventListener('click', createUser);
  }

  const adminModalBackdrop = document.getElementById('adminModal');
  if (adminModalBackdrop) {
    adminModalBackdrop.addEventListener('click', (e) => {
      if (e.target === adminModalBackdrop) closeAdminModal();
    });
  }

  const closeEditor = document.getElementById('closeEditor');
  if (closeEditor) {
    closeEditor.addEventListener('click', closeNoteModal);
  }

  const saveNoteBtn = document.getElementById('saveNote');
  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', async () => {
      if (currentNoteId) {
        await saveCurrentNote();
        alert('Note enregistrée !');
      }
    });
  }

  const deleteNote = document.getElementById('deleteNote');
  if (deleteNote) {
    deleteNote.addEventListener('click', deleteCurrentNote);
  }

  const addImageBtn = document.getElementById('addImageBtn');
  if (addImageBtn) {
    addImageBtn.addEventListener('click', addNoteImage);
  }

  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUploadInline);
  }

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUploadInline);
  }

  const removeImage = document.getElementById('removeImage');
  if (removeImage) {
    removeImage.addEventListener('click', removeNoteImage);
  }

  const addNoteTodoBtn = document.getElementById('addNoteTodo');
  if (addNoteTodoBtn) {
    addNoteTodoBtn.addEventListener('click', addNoteTodo);
  }

  const addTodoBtn = document.getElementById('addTodoBtn');
  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', addTodo);
  }

  const todoInput = document.getElementById('todoInput');
  if (todoInput) {
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
  }

  // Todo filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setTodoFilter(btn.dataset.filter));
  });

  // Event delegation pour les todos de la sidebar
  const todoList = document.getElementById('todoList');
  if (todoList) {
    todoList.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-checkbox')) {
        const todoId = parseInt(e.target.dataset.todoId);
        toggleTodo(todoId, e.target.checked);
      }
    });

    todoList.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-delete')) {
        const todoId = parseInt(e.target.dataset.todoId);
        deleteTodo(todoId);
      }
    });
  }

  // Event delegation pour les todos des notes
  const noteTodosList = document.getElementById('noteTodosList');
  if (noteTodosList) {
    noteTodosList.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-checkbox')) {
        const todoId = parseInt(e.target.dataset.noteTodoId);
        toggleNoteTodo(todoId, e.target.checked);
      }
    });

    noteTodosList.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-delete')) {
        const todoId = parseInt(e.target.dataset.noteTodoId);
        deleteNoteTodo(todoId);
      }
    });
  }

  // Event delegation pour les boutons d'administration des utilisateurs
  const usersTableBody = document.getElementById('usersTableBody');
  if (usersTableBody) {
    usersTableBody.addEventListener('click', (e) => {
      // Bouton changer mot de passe
      if (e.target.classList.contains('btn-edit-user') || e.target.closest('.btn-edit-user')) {
        const btn = e.target.classList.contains('btn-edit-user') ? e.target : e.target.closest('.btn-edit-user');
        const userId = parseInt(btn.dataset.userId);
        const username = btn.dataset.username;
        changeUserPassword(userId, username);
      }
      // Bouton supprimer utilisateur
      else if (e.target.classList.contains('btn-delete-user') || e.target.closest('.btn-delete-user')) {
        const btn = e.target.classList.contains('btn-delete-user') ? e.target : e.target.closest('.btn-delete-user');
        const userId = parseInt(btn.dataset.userId);
        const username = btn.dataset.username;
        deleteUser(userId, username);
      }
    });
  }

  // Close editor on backdrop click
  const noteEditorBackdrop = document.getElementById('noteEditorBackdrop');
  if (noteEditorBackdrop) {
    noteEditorBackdrop.addEventListener('click', (e) => {
      if (e.target === noteEditorBackdrop) closeNoteModal();
    });
  }

  // Event delegation for notes grid
  const notesGrid = document.getElementById('notesGrid');
  if (notesGrid) {
    // Click on compact note to expand
    notesGrid.addEventListener('click', (e) => {
      const compactNote = e.target.closest('.note-card-compact');
      if (compactNote) {
        const noteId = parseInt(compactNote.dataset.noteId);
        expandNote(noteId);
        return;
      }

      // Collapse note button
      if (e.target.closest('.btn-collapse-note')) {
        collapseNote();
        return;
      }

      // Archive note button
      const archiveBtn = e.target.closest('.btn-archive-note');
      if (archiveBtn) {
        const noteId = parseInt(archiveBtn.dataset.noteId);
        const archived = archiveBtn.dataset.archived === 'true';
        archiveNote(noteId, !archived);
        return;
      }

      // Delete note button
      const deleteBtn = e.target.closest('.btn-delete-note-inline');
      if (deleteBtn) {
        const noteId = parseInt(deleteBtn.dataset.noteId);
        deleteNoteInline(noteId);
        return;
      }

      // Add image button
      const addImageBtn = e.target.closest('.btn-add-image-inline');
      if (addImageBtn) {
        const noteId = parseInt(addImageBtn.dataset.noteId);
        triggerImageUpload(noteId);
        return;
      }

      // Remove image button
      const removeImageBtn = e.target.closest('.btn-remove-image-inline');
      if (removeImageBtn) {
        const noteId = parseInt(removeImageBtn.dataset.noteId);
        removeImageInline(noteId);
        return;
      }

      // Add todo button
      const addTodoBtn = e.target.closest('.btn-add-todo-inline');
      if (addTodoBtn) {
        const noteId = parseInt(addTodoBtn.dataset.noteId);
        const inputElement = document.querySelector(`.add-todo-inline-input[data-note-id="${noteId}"]`);
        if (inputElement) {
          addNoteTodoInline(noteId, inputElement);
        }
        return;
      }

      // Add file button
      const addFileBtn = e.target.closest('.btn-add-file-inline');
      if (addFileBtn) {
        const noteId = parseInt(addFileBtn.dataset.noteId);
        triggerFileUpload(noteId);
        return;
      }

      // Delete todo inline button
      if (e.target.classList.contains('todo-delete-inline')) {
        const todoId = parseInt(e.target.dataset.todoInlineId);
        deleteNoteTodoInline(todoId);
        return;
      }

      // Download file button
      const downloadBtn = e.target.closest('.btn-download-file');
      if (downloadBtn) {
        const fileId = parseInt(downloadBtn.dataset.fileId);
        downloadFile(fileId);
        return;
      }

      // Delete file button
      const deleteFileBtn = e.target.closest('.btn-delete-file');
      if (deleteFileBtn) {
        const fileId = parseInt(deleteFileBtn.dataset.fileId);
        deleteFile(fileId);
        return;
      }
    });

    // Checkbox change for inline todos
    notesGrid.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-checkbox-inline')) {
        const todoId = parseInt(e.target.dataset.todoInlineId);
        toggleNoteTodoInline(todoId, e.target.checked);
      }
    });

    // Enter key on add todo input
    notesGrid.addEventListener('keypress', (e) => {
      if (e.target.classList.contains('add-todo-inline-input') && e.key === 'Enter') {
        const noteId = parseInt(e.target.dataset.noteId);
        addNoteTodoInline(noteId, e.target);
      }
    });
  }

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.expandedNoteId) {
        collapseNote();
      } else {
        closeNoteModal();
        closeAdminModal();
        closePasswordChangeModal();
      }
    }
  });

  // ==================== ADMIN TAB SWITCHING ====================
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchAdminTab(tab.dataset.tab);
    });
  });

  // ==================== PASSWORD CHANGE MODAL ====================
  const closePasswordModal = document.getElementById('closeChangePasswordModal');
  if (closePasswordModal) {
    closePasswordModal.addEventListener('click', closePasswordChangeModal);
  }

  const cancelPasswordChange = document.getElementById('cancelChangePassword');
  if (cancelPasswordChange) {
    cancelPasswordChange.addEventListener('click', closePasswordChangeModal);
  }

  const confirmPasswordBtn = document.getElementById('confirmChangePassword');
  if (confirmPasswordBtn) {
    confirmPasswordBtn.addEventListener('click', confirmPasswordChange);
  }

  // Enter key to confirm password change
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  if (newPasswordInput && confirmPasswordInput) {
    [newPasswordInput, confirmPasswordInput].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmPasswordChange();
      });
    });
  }

  // ==================== RSS FEEDS ====================
  const addRssFeedBtn = document.getElementById('addRssFeedBtn');
  if (addRssFeedBtn) {
    addRssFeedBtn.addEventListener('click', addRssFeed);
  }

  const rssUrlInput = document.getElementById('rssUrlInput');
  if (rssUrlInput) {
    rssUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addRssFeed();
    });
  }

  const fetchRssBtn = document.getElementById('fetchRssBtn');
  if (fetchRssBtn) {
    fetchRssBtn.addEventListener('click', fetchRssArticles);
  }

  // Event delegation for RSS feeds list
  const rssFeedsList = document.getElementById('rssFeedsList');
  if (rssFeedsList) {
    rssFeedsList.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.dataset.feedId) {
        const feedId = parseInt(e.target.dataset.feedId);
        toggleRssFeed(feedId, e.target.checked);
      }
    });

    rssFeedsList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete-feed');
      if (deleteBtn) {
        const feedId = parseInt(deleteBtn.dataset.feedId);
        deleteRssFeed(feedId);
      }
    });
  }

  // RSS articles click to open in new tab
  const rssArticlesList = document.getElementById('rssArticlesList');
  if (rssArticlesList) {
    rssArticlesList.addEventListener('click', (e) => {
      const article = e.target.closest('.rss-article');
      if (article && article.dataset.link) {
        window.open(article.dataset.link, '_blank');
      }
    });
  }

  // RSS summarize button
  const summarizeRssBtn = document.getElementById('summarizeRssBtn');
  if (summarizeRssBtn) {
    summarizeRssBtn.addEventListener('click', summarizeRss);
  }

  // ==================== OPENROUTER ====================
  const modelSearch = document.getElementById('modelSearch');
  if (modelSearch) {
    modelSearch.addEventListener('input', utils.debounce(filterModels, 300));
  }

  const saveOpenRouterBtn = document.getElementById('saveOpenRouterSettings');
  if (saveOpenRouterBtn) {
    saveOpenRouterBtn.addEventListener('click', saveOpenRouterSettings);
  }
}

// Démarrer l'application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
