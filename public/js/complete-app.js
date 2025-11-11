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
  filter: 'all',
  searchQuery: '',
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
    const response = await api.get('/api/notes');
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
  card.className = 'note-card';
  card.onclick = () => openNoteModal(note.id);

  let html = `<div class="note-card-title">${escapeHtml(note.title)}</div>`;

  if (note.content) {
    html += `<div class="note-card-content">${escapeHtml(utils.truncate(note.content))}</div>`;
  }

  if (note.image_filename) {
    html += `<img src="/uploads/${note.image_filename}" class="note-card-image" alt="">`;
  }

  html += `<div class="note-card-meta">`;
  html += `<span>${utils.formatDate(note.updated_at)}</span>`;
  if (note.todos_count > 0) {
    html += `<span class="note-card-badge">${note.todos_count} tasks</span>`;
  }
  html += `</div>`;

  card.innerHTML = html;
  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== MODAL ====================
let saveTimeout;
let currentNoteId = null;

async function openNoteModal(noteId = null) {
  currentNoteId = noteId;
  const modal = document.getElementById('noteModal');
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
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}
        onchange="toggleNoteTodo(${todo.id}, this.checked)">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" onclick="deleteNoteTodo(${todo.id})">✕</button>
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
  if (!confirm('Supprimer ce todo ?')) return;

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
  document.getElementById('noteModal').style.display = 'none';
  currentNoteId = null;
  state.currentNote = null;
}

async function deleteCurrentNote() {
  if (!currentNoteId) return;
  if (!confirm('Supprimer cette note ?')) return;

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
  if (!confirm('Supprimer l\'image ?')) return;

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
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}
        onchange="toggleTodo(${todo.id}, this.checked)">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete" onclick="deleteTodo(${todo.id})">✕</button>
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

// ==================== INIT ====================
async function init() {
  // Vérifier l'authentification
  await initAuth();

  // Charger les données
  await Promise.all([loadNotes(), loadTodos()]);

  // Setup search
  setupSearch();

  // Event listeners
  const newNoteBtn = document.getElementById('newNoteBtn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', () => openNoteModal());
  }

  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', closeNoteModal);
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
    imageInput.addEventListener('change', handleImageUpload);
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

  // Close modal on backdrop click
  const noteModal = document.getElementById('noteModal');
  if (noteModal) {
    noteModal.addEventListener('click', (e) => {
      if (e.target === noteModal) closeNoteModal();
    });
  }

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNoteModal();
      document.getElementById('adminModal').style.display = 'none';
    }
  });
}

// Démarrer l'application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
