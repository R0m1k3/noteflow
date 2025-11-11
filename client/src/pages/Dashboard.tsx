import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notesApi, todosApi, rssApi, settingsApi } from '../services/api';
import type { Note, GlobalTodo, RssArticle, RssSummary } from '../types';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<GlobalTodo[]>([]);
  const [rssContent, setRssContent] = useState<RssArticle[] | RssSummary[]>([]);
  const [showSummaries, setShowSummaries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();

    // Auto-refresh toutes les 30 secondes pour afficher les nouveaux articles RSS
    const interval = setInterval(() => {
      loadRssData();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [notesData, todosData] = await Promise.all([
        notesApi.getAll(false),
        todosApi.getAll(),
      ]);

      setNotes(notesData);
      setTodos(todosData);
      await loadRssData();
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRssData = async () => {
    try {
      const settings = await settingsApi.getAll();
      const summaryEnabled = settings.rss_summary_enabled === '1';
      setShowSummaries(summaryEnabled);

      if (summaryEnabled) {
        const summaries = await rssApi.getSummaries();
        setRssContent(summaries);
      } else {
        const articles = await rssApi.getArticles();
        setRssContent(articles);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur chargement RSS:', error);
    }
  };

  const addTodo = async (text: string) => {
    if (!text.trim()) return;
    try {
      const newTodo = await todosApi.create(text);
      setTodos([...todos, newTodo]);
    } catch (error) {
      console.error('Erreur ajout todo:', error);
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await todosApi.update(id, completed);
      setTodos(todos.map(t => t.id === id ? { ...t, completed } : t));
    } catch (error) {
      console.error('Erreur toggle todo:', error);
    }
  };

  const deleteTodo = async (id: number) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    try {
      await todosApi.delete(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erreur suppression todo:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📝 NoteFlow</h1>
        </div>
        <div className="header-right">
          <span className="user-name">{user?.username}</span>
          <button onClick={logout} className="btn-logout">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="content-grid">
          {/* Notes Section */}
          <section className="notes-section">
            <div className="section-header">
              <h2>Notes</h2>
              <button className="btn-primary">+ Nouvelle note</button>
            </div>
            <div className="notes-grid">
              {notes.length === 0 ? (
                <p className="empty-state">Aucune note</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="note-card">
                    <h3>{note.title}</h3>
                    {note.content && <p>{note.content.substring(0, 150)}...</p>}
                    {note.todos && note.todos.length > 0 && (
                      <div className="note-todos-preview">
                        {note.todos_completed}/{note.todos_count} tâches
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Todos Sidebar */}
          <aside className="todos-sidebar">
            <div className="section-header">
              <h2>✓ Todos</h2>
            </div>
            <div className="todo-input-container">
              <input
                type="text"
                placeholder="Nouvelle tâche..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTodo(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            <div className="todos-list">
              {todos.map(todo => (
                <div key={todo.id} className="todo-item">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={(e) => toggleTodo(todo.id, e.target.checked)}
                  />
                  <span className={todo.completed ? 'completed' : ''}>{todo.text}</span>
                  <button onClick={() => deleteTodo(todo.id)} className="btn-delete">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* RSS Sidebar */}
          <aside className="rss-sidebar">
            <div className="section-header">
              <h2>📰 Actualités</h2>
            </div>
            <div className="rss-content">
              {rssContent.length === 0 ? (
                <p className="empty-state">Aucun contenu</p>
              ) : showSummaries ? (
                // Afficher les résumés
                (rssContent as RssSummary[]).map(summary => (
                  <div key={summary.id} className="rss-summary">
                    <h4>Résumé du {new Date(summary.created_at).toLocaleDateString('fr-FR')}</h4>
                    <p>{summary.summary.substring(0, 200)}...</p>
                    <div className="summary-meta">
                      {summary.articles_count} articles • {summary.model.split('/')[1] || summary.model}
                    </div>
                  </div>
                ))
              ) : (
                // Afficher les articles
                (rssContent as RssArticle[]).map(article => (
                  <div
                    key={article.id}
                    className="rss-article"
                    onClick={() => window.open(article.link, '_blank')}
                  >
                    <h4>{article.title}</h4>
                    <div className="article-meta">
                      <span>{article.feed_title}</span>
                      <span>{new Date(article.pub_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {article.description && <p>{article.description.substring(0, 100)}...</p>}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
