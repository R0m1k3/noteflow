import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2,
  Image as ImageIcon, CheckSquare, FileText, Rss, ExternalLink, RefreshCw, Key, Zap, Paperclip, X, Edit, Calendar as CalendarIcon, Tag as TagIcon, MessageSquare, Send, Check, ChevronsUpDown, Star, Activity
} from "lucide-react";
import AuthService from "@/services/AuthService";
import AdminService from "@/services/AdminService";
import NotesService, { Note } from "@/services/NotesService";
import TodosService, { Todo } from "@/services/TodosService";
import RssService, { RssFeed, RssArticle } from "@/services/RssService";
import SettingsService, { Settings as AppSettings } from "@/services/SettingsService";
import CalendarService, { CalendarEvent } from "@/services/CalendarService";
import TagsService, { Tag } from "@/services/TagsService";
import OpenRouterService, { OpenRouterModel } from "@/services/OpenRouterService";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { InputModal } from "@/components/modals/InputModal";
import { AddUserModal } from "@/components/modals/AddUserModal";

// ===== FONCTIONS UTILITAIRES TIMEZONE EUROPE/PARIS =====

/**
 * Convertit une date ISO/UTC en format datetime-local pour Europe/Paris
 * @param date - Date ISO string ou Date object
 * @returns String au format "YYYY-MM-DDTHH:mm" en heure Europe/Paris
 */
function toLocalDateTimeString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Formater en heure Europe/Paris
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Convertit une valeur datetime-local en ISO string pour Europe/Paris
 * @param localDateTimeString - String au format "YYYY-MM-DDTHH:mm" (sans timezone)
 * @returns ISO string représentant cette heure en Europe/Paris
 */
function toParisISO(localDateTimeString: string): string {
  // Input: "2024-11-16T14:30" signifie 14:30 à Paris
  // Output: ISO UTC correspondant (ex: "2024-11-16T13:30:00.000Z" en hiver)

  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Déterminer l'offset de Europe/Paris pour cette date spécifique
  // (pour gérer automatiquement l'heure d'été/hiver)

  // Créer une date test en UTC à midi
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Formater cette date en Europe/Paris
  const parisHour = parseInt(testDate.toLocaleString('en-US', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false
  }));

  // Calculer l'offset (normalement +1 en hiver, +2 en été)
  const offset = parisHour - 12;
  const offsetString = offset === 1 ? '+01:00' : '+02:00';

  // Construire l'ISO string avec le timezone de Paris
  const isoWithTZ = `${datePart}T${timePart.padEnd(5, '0')}:00${offsetString}`;

  // Créer la date (JavaScript va automatiquement convertir en UTC)
  return new Date(isoWithTZ).toISOString();
}

interface UserType {
  id: number;
  username: string;
  is_admin: boolean;
}

const Index = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [rssArticles, setRssArticles] = useState<RssArticle[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [adminTab, setAdminTab] = useState("users");
  const [showArchived, setShowArchived] = useState(false);
  const [noteTags, setNoteTags] = useState<Tag[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [upcomingAlert, setUpcomingAlert] = useState<CalendarEvent | null>(null);
  const [calendarAuthStatus, setCalendarAuthStatus] = useState<{
    isAuthenticated: boolean;
    isExpired: boolean;
    needsReauth: boolean;
    authType?: 'oauth2' | 'service_account' | 'api_externe';
  }>({
    isAuthenticated: false,
    isExpired: false,
    needsReauth: true
  });
  const navigate = useNavigate();

  // Modal states
  const [deleteNoteModal, setDeleteNoteModal] = useState(false);
  const [addTodoModal, setAddTodoModal] = useState(false);
  const [addRssFeedModal, setAddRssFeedModal] = useState(false);
  const [addUserModal, setAddUserModal] = useState(false);
  const [deleteUserModal, setDeleteUserModal] = useState<{ open: boolean, userId?: number }>({ open: false });
  const [changePasswordModal, setChangePasswordModal] = useState<{ open: boolean, userId?: number }>({ open: false });
  const [addNoteTodoModal, setAddNoteTodoModal] = useState(false);
  const [addTagModal, setAddTagModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [addEventModal, setAddEventModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState<{ open: boolean, event?: CalendarEvent }>({ open: false });

  // Pagination states
  const [notesPage, setNotesPage] = useState(0);
  const [todosActivePage, setTodosActivePage] = useState(0);
  const [todosCompletedPage, setTodosCompletedPage] = useState(0);
  const [rssPage, setRssPage] = useState(0);
  const [calendarPage, setCalendarPage] = useState(0);

  const NOTES_PER_PAGE = 5;
  const TODOS_PER_PAGE = 15;
  const RSS_MAX_ARTICLES = 14;
  const RSS_PER_PAGE = 8;
  const CALENDAR_PER_PAGE = 10;

  // Chatbox states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update current date/time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for upcoming events every minute
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const upcomingEvent = calendarEvents.find(event => {
        const eventStart = new Date(event.start_time);
        return eventStart > now && eventStart <= thirtyMinutesFromNow;
      });

      setUpcomingAlert(upcomingEvent || null);
    };

    checkUpcomingEvents();
    const timer = setInterval(checkUpcomingEvents, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [calendarEvents]);


  useEffect(() => {
    const userFromAuth = AuthService.getUser();
    if (userFromAuth) {
      setUser(userFromAuth);
      loadNotes();
      loadTodos();
      loadRssFeeds();
      loadRssArticles();
      loadCalendarEvents();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Auto-refresh des articles RSS toutes les 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadRssArticles();
    }, 2 * 60 * 1000); // 2 minutes (synchronisé avec le scheduler backend)

    return () => clearInterval(interval);
  }, []);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await NotesService.getNotes();
      if (Array.isArray(fetchedNotes)) {
        setNotes(fetchedNotes);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des notes:", error);
    }
  };

  const loadTodos = async () => {
    try {
      const fetchedTodos = await TodosService.getTodos();
      if (Array.isArray(fetchedTodos)) {
        setTodos(fetchedTodos);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des todos:", error);
    }
  };

  const loadRssFeeds = async () => {
    try {
      const feeds = await RssService.getFeeds();
      if (Array.isArray(feeds)) {
        setRssFeeds(feeds);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des flux RSS:", error);
    }
  };

  const loadRssArticles = async () => {
    try {
      const articles = await RssService.getArticles(100);
      if (Array.isArray(articles)) {
        // Les articles arrivent triés par date DESC (récent en premier) depuis le backend
        setRssArticles(articles);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles RSS:", error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const events = await CalendarService.getEvents(50); // Charger 50 événements pour pagination
      if (Array.isArray(events)) {
        setCalendarEvents(events);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des événements:", error);
    }
  };

  const loadUsers = async () => {
    if (user?.is_admin) {
      try {
        const fetchedUsers = await AdminService.getUsers();
        if (Array.isArray(fetchedUsers)) {
          setUsers(fetchedUsers);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      }
    }
  };

  const loadSettings = async () => {
    if (user?.is_admin) {
      try {
        const fetchedSettings = await SettingsService.getSettings();
        setSettings(fetchedSettings || {});
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
      }
    }
  };

  const loadOpenRouterModels = async () => {
    setLoadingModels(true);
    try {
      const models = await OpenRouterService.getModels();
      setOpenRouterModels(models);
    } catch (error) {
      console.error("Erreur lors du chargement des modèles:", error);
      setOpenRouterModels([]); // Vider en cas d'erreur
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (showAdmin) {
      loadUsers();
      loadSettings();
    }
  }, [showAdmin]);

  useEffect(() => {
    if (showAdmin && adminTab === 'openrouter' && openRouterModels.length === 0) {
      loadOpenRouterModels();
    }
  }, [showAdmin, adminTab]);

  useEffect(() => {
    if (showAdmin && adminTab === 'calendar') {
      checkCalendarAuthStatus();
    }
  }, [showAdmin, adminTab]);

  const checkCalendarAuthStatus = async () => {
    try {
      const status = await CalendarService.getAuthStatus();
      setCalendarAuthStatus(status);
    } catch (error) {
      console.error('Erreur lors de la vérification du statut OAuth:', error);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const authUrl = await CalendarService.getAuthUrl();

      // Ouvrir une popup pour l'authentification OAuth
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'GoogleAuth',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      // Écouter le message de la popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'google-auth-success') {
          showSuccess('Authentification Google réussie');
          checkCalendarAuthStatus();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'google-auth-error') {
          showError(`Erreur d'authentification: ${event.data.error}`);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fermer le listener si la popup est fermée manuellement
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    } catch (error) {
      showError('Erreur lors de la génération de l\'URL d\'authentification');
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      const success = await CalendarService.disconnect();
      if (success) {
        showSuccess('Déconnecté de Google Calendar');
        checkCalendarAuthStatus();
      }
    } catch (error) {
      showError('Erreur lors de la déconnexion');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await NotesService.createNote("Nouvelle note");
      if (newNote) {
        setNotes([newNote, ...notes]);
        setOpenNote(newNote);
      }
    } catch (error) {
      showError("Erreur lors de la création de la note");
    }
  };

  const loadNoteTags = async (noteId: number) => {
    try {
      const tags = await TagsService.getTags(noteId);
      setNoteTags(tags || []);

      // Synchroniser avec openNote.tags (convertir de 'tag' vers 'name')
      if (openNote && openNote.id === noteId) {
        setOpenNote({
          ...openNote,
          tags: (tags || []).map(t => ({ id: t.id, name: t.tag }))
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tags:", error);
      setNoteTags([]);
    }
  };

  const handleOpenNote = (note: Note) => {
    setOpenNote(note);
    if (note.id) {
      loadNoteTags(note.id);
    }
  };

  const handleCloseNote = () => {
    setOpenNote(null);
    setNoteTags([]);
  };

  // Update note with immediate local state update
  const handleUpdateNote = useCallback(async (updatedFields: Partial<Note>) => {
    if (!openNote) return;

    const updatedNote = {
      ...openNote,
      ...updatedFields,
      todos: updatedFields.todos || openNote.todos || [],
      images: updatedFields.images || openNote.images || [],
      files: updatedFields.files || openNote.files || []
    };

    // Update local state immediately
    setOpenNote(updatedNote);
    setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));

    try {
      const savedNote = await NotesService.updateNote(updatedNote);
      if (savedNote) {
        // Mettre à jour avec les données du serveur (updated_at, etc.)
        setOpenNote(savedNote);
        setNotes(prev => prev.map(note => note.id === savedNote.id ? savedNote : note));
      } else {
        showError("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      showError("Erreur lors de la mise à jour de la note");
    }
  }, [openNote, setOpenNote, setNotes]);

  // Debounced content update for typing
  const handleContentChange = useCallback((content: string) => {
    if (!openNote) return;

    // Don't update local state to avoid re-render during typing
    // Just save to API in background
    const updatedNote = { ...openNote, content };

    // Debounce the API call
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const savedNote = await NotesService.updateNote(updatedNote);
        if (savedNote) {
          // Mettre à jour avec les données du serveur (updated_at, etc.)
          setOpenNote(savedNote);
          setNotes(prev => prev.map(note => note.id === savedNote.id ? savedNote : note));
        }
      } catch (error) {
        showError("Erreur lors de la sauvegarde automatique");
      }
    }, 1000); // Save after 1 second of inactivity
  }, [openNote, setNotes]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const confirmDeleteNote = async () => {
    if (!openNote?.id) return;

    try {
      const success = await NotesService.deleteNote(openNote.id);

      if (success) {
        const updatedNotes = notes.filter(note => note.id !== openNote.id);
        setNotes(updatedNotes);
        setOpenNote(null);
        showSuccess("Note supprimée");
      }
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const confirmAddTodo = async (text: string) => {
    try {
      const newTodo = await TodosService.createTodo(text);
      if (newTodo) {
        setTodos([newTodo, ...todos]);
        showSuccess("Tâche ajoutée");
      }
    } catch (error) {
      showError("Erreur lors de l'ajout de la tâche");
    }
  };

  const handleToggleTodo = async (todoId: number) => {
    try {
      await TodosService.toggleComplete(todoId);
      setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t));
    } catch (error) {
      showError("Erreur lors de la mise à jour");
    }
  };

  const handleToggleTodoPriority = async (todoId: number) => {
    try {
      await TodosService.togglePriority(todoId);
      setTodos(todos.map(t => t.id === todoId ? { ...t, priority: !t.priority } : t));
    } catch (error) {
      showError("Erreur lors de la mise à jour de la priorité");
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      await TodosService.deleteTodo(todoId);
      setTodos(todos.filter(t => t.id !== todoId));
      showSuccess("Tâche supprimée");
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const handleToggleTodoInProgress = async (todoId: number) => {
    try {
      await TodosService.toggleInProgress(todoId);
      setTodos(todos.map(t => t.id === todoId ? { ...t, in_progress: !t.in_progress } : t));
    } catch (error) {
      showError("Erreur lors de la mise à jour du statut");
    }
  };

  const confirmAddRssFeed = async (url: string) => {
    try {
      const newFeed = await RssService.addFeed(url);
      if (newFeed) {
        setRssFeeds([...rssFeeds, newFeed]);
        showSuccess("Flux RSS ajouté");
        loadRssArticles();
      }
    } catch (error) {
      showError("Erreur lors de l'ajout du flux");
    }
  };

  const handleDeleteRssFeed = async (feedId: number) => {
    try {
      await RssService.deleteFeed(feedId);
      setRssFeeds(rssFeeds.filter(f => f.id !== feedId));
      showSuccess("Flux supprimé");
      loadRssArticles();
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const handleRefreshRss = async () => {
    try {
      await RssService.refreshFeeds();
      loadRssArticles();
      showSuccess("Flux actualisés");
    } catch (error) {
      showError("Erreur lors de l'actualisation");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedModel || chatLoading) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];

    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await OpenRouterService.sendMessage(selectedModel, newMessages);
      setChatMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'envoi du message');
      setChatMessages([...newMessages, { role: 'assistant', content: 'Erreur: ' + error.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  // Scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load default model from localStorage on mount
  useEffect(() => {
    const savedDefaultModel = localStorage.getItem('defaultAiModel');
    if (savedDefaultModel) {
      setDefaultModel(savedDefaultModel);
    }
  }, []);

  // Load models when chatbox opens
  useEffect(() => {
    if (chatOpen && openRouterModels.length === 0) {
      loadOpenRouterModels();
    }
  }, [chatOpen]);

  // Set default model when models are loaded
  useEffect(() => {
    if (openRouterModels.length > 0 && !selectedModel) {
      // If there's a default model saved, use it
      if (defaultModel && openRouterModels.find(m => m.id === defaultModel)) {
        setSelectedModel(defaultModel);
      } else {
        // Otherwise use the first model
        setSelectedModel(openRouterModels[0].id);
      }
    }
  }, [openRouterModels, selectedModel, defaultModel]);

  // Save default model to localStorage
  const handleSetDefaultModel = (modelId: string) => {
    setDefaultModel(modelId);
    localStorage.setItem('defaultAiModel', modelId);
    showSuccess("Modèle par défaut défini");
  };

  const confirmAddUser = async (username: string, password: string, isAdmin: boolean) => {
    try {
      const newUser = await AdminService.createUser(username, password, isAdmin);
      if (newUser) {
        loadUsers();
        showSuccess("Utilisateur créé");
      }
    } catch (error) {
      showError("Erreur lors de la création");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.userId) return;

    try {
      const success = await AdminService.deleteUser(deleteUserModal.userId);
      if (success) {
        loadUsers();
        showSuccess("Utilisateur supprimé");
      }
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const confirmChangePassword = async (newPassword: string) => {
    if (!changePasswordModal.userId) return;

    try {
      const success = await AdminService.updateUserPassword(changePasswordModal.userId, newPassword);
      if (success) {
        showSuccess("Mot de passe modifié");
      }
    } catch (error) {
      showError("Erreur lors de la modification");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await SettingsService.updateSettings(settings);
      showSuccess("Paramètres enregistrés");
    } catch (error) {
      showError("Erreur lors de l'enregistrement");
    }
  };

  const confirmAddTag = async (tagText: string) => {
    if (!openNote?.id) return;

    try {
      const newTag = await TagsService.addTag(openNote.id, tagText);
      if (newTag) {
        const updatedNoteTags = [...noteTags, newTag];
        setNoteTags(updatedNoteTags);

        // Synchroniser avec openNote.tags (convertir de 'tag' vers 'name')
        setOpenNote({
          ...openNote,
          tags: updatedNoteTags.map(t => ({ id: t.id, name: t.tag }))
        });

        showSuccess("Tag ajouté");
      }
    } catch (error) {
      showError("Erreur lors de l'ajout du tag");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!openNote?.id) return;

    try {
      const success = await TagsService.deleteTag(openNote.id, tagId);
      if (success) {
        const updatedNoteTags = noteTags.filter(t => t.id !== tagId);
        setNoteTags(updatedNoteTags);

        // Synchroniser avec openNote.tags (convertir de 'tag' vers 'name')
        setOpenNote({
          ...openNote,
          tags: updatedNoteTags.map(t => ({ id: t.id, name: t.tag }))
        });

        showSuccess("Tag supprimé");
      }
    } catch (error) {
      showError("Erreur lors de la suppression du tag");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && openNote?.id) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);

      try {
        const response = await fetch(`/api/notes/${openNote.id}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          const newFile = result.file || result;
          const updatedFiles = [...(openNote.files || []), newFile];
          setOpenNote({ ...openNote, files: updatedFiles });
          await handleUpdateNote({ files: updatedFiles });
          showSuccess("Fichier ajouté");
        }
      } catch (error) {
        showError("Erreur lors de l'upload");
      } finally {
        e.target.value = '';
      }
    }
  };

  const filteredNotes = notes.filter(note =>
    (showArchived ? note.archived : !note.archived) &&
    (searchQuery === "" ||
      (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Pagination for notes
  const totalNotesPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const paginatedNotes = filteredNotes.slice(
    notesPage * NOTES_PER_PAGE,
    (notesPage + 1) * NOTES_PER_PAGE
  );

  // Reset page when changing filters or search
  useEffect(() => {
    setNotesPage(0);
  }, [showArchived, searchQuery]);

  useEffect(() => {
    setTodosActivePage(0);
    setTodosCompletedPage(0);
  }, [todos.length]);

  useEffect(() => {
    setRssPage(0);
  }, [rssArticles.length]);

  useEffect(() => {
    setCalendarPage(0);
  }, [calendarEvents.length]);

  // Pagination for todos
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const totalActiveTodosPages = Math.ceil(activeTodos.length / TODOS_PER_PAGE);
  const totalCompletedTodosPages = Math.ceil(completedTodos.length / TODOS_PER_PAGE);
  const paginatedActiveTodos = activeTodos.slice(
    todosActivePage * TODOS_PER_PAGE,
    (todosActivePage + 1) * TODOS_PER_PAGE
  );
  const paginatedCompletedTodos = completedTodos.slice(
    todosCompletedPage * TODOS_PER_PAGE,
    (todosCompletedPage + 1) * TODOS_PER_PAGE
  );

  // Pagination for RSS
  const totalRssPages = Math.ceil(rssArticles.length / RSS_PER_PAGE);
  const paginatedRssArticles = rssArticles.slice(
    rssPage * RSS_PER_PAGE,
    (rssPage + 1) * RSS_PER_PAGE
  );

  // Pagination for Calendar
  const totalCalendarPages = Math.ceil(calendarEvents.length / CALENDAR_PER_PAGE);
  const paginatedCalendarEvents = calendarEvents.slice(
    calendarPage * CALENDAR_PER_PAGE,
    (calendarPage + 1) * CALENDAR_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        {/* Alert bar for upcoming events */}
        {upcomingAlert && (
          <div className="bg-red-500 text-white px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <span className="font-medium">
                Rendez-vous dans moins de 30 minutes : {upcomingAlert.title}
              </span>
              <span className="text-sm opacity-90">
                à {new Date(upcomingAlert.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-600"
              onClick={() => upcomingAlert.html_link && window.open(upcomingAlert.html_link, '_blank')}
            >
              Voir
            </Button>
          </div>
        )}

        <div className="max-w-[1920px] mx-auto px-8">
          <div className="grid grid-cols-3 h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-semibold">NoteFlow</span>
            </div>

            <div className="flex flex-col items-center text-center text-sm text-muted-foreground">
              <div className="font-medium">
                {currentDateTime.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-lg font-mono">
                {currentDateTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>

            <div className="flex items-center gap-6 justify-end">
              <Button onClick={handleCreateNote} size="lg" className="gap-2">
                <PlusCircle className="h-5 w-5" />
                Nouvelle Note
              </Button>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.username}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.is_admin && (
                      <DropdownMenuItem onClick={() => setShowAdmin(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Administration</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        {/* Three Column Layout: Calendar Left | Notes Middle | Todo+RSS Right */}
        <div className="grid grid-cols-[300px,1fr,760px] gap-6">
          {/* Left Column: Calendar */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6" />
                    Rendez-vous
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setAddEventModal(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const result = await CalendarService.sync();
                        showSuccess(`${result.syncedCount} événements synchronisés`);
                        await loadCalendarEvents();
                      } catch (error) {
                        showError("Erreur lors de la synchronisation");
                      }
                    }}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {calendarEvents.length > 0 ? (
                    paginatedCalendarEvents.map(event => {
                      const startDate = new Date(event.start_time);
                      const endDate = new Date(event.end_time);
                      const isToday = startDate.toDateString() === new Date().toDateString();
                      const isSoon = startDate.getTime() - new Date().getTime() < 30 * 60 * 1000 && startDate > new Date();

                      // Détecter les événements "toute la journée" (all_day OU heure à 00:00 ou 01:00)
                      const isAllDay = event.all_day ||
                        (startDate.getHours() === 0 && startDate.getMinutes() === 0) ||
                        (startDate.getHours() === 1 && startDate.getMinutes() === 0 && endDate.getHours() === 1);

                      return (
                        <div
                          key={event.id}
                          className={`p-3 border rounded-lg hover:bg-accent/50 transition-colors group relative ${isSoon ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                            isToday ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium line-clamp-2 text-sm">{event.title}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {isToday ? "Aujourd'hui" : startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })}
                                {isAllDay ? ' - Toute la journée' : ` à ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`}
                              </p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  📍 {event.location}
                                </p>
                              )}
                              {isSoon && (
                                <Badge variant="destructive" className="mt-1 text-xs">Dans moins de 30 min</Badge>
                              )}
                            </div>
                            <div className="flex gap-1 items-start">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditEventModal({ open: true, event });
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <ExternalLink
                                className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1 cursor-pointer"
                                onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Aucun rendez-vous à venir
                      <br />
                      <Button
                        variant="link"
                        className="mt-2 text-xs"
                        onClick={() => setShowAdmin(true)}
                      >
                        Configurer Google Calendar
                      </Button>
                    </p>
                  )}
                </div>
                {totalCalendarPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCalendarPage(p => Math.max(0, p - 1))}
                      disabled={calendarPage === 0}
                    >
                      ‹
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {calendarPage + 1}/{totalCalendarPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCalendarPage(p => Math.min(totalCalendarPages - 1, p + 1))}
                      disabled={calendarPage === totalCalendarPages - 1}
                    >
                      ›
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column: Notes or Open Note */}
          <div className="space-y-6">
            {!openNote ? (
              <>
                {/* Notes Grid Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-semibold">Mes Notes</h2>
                    <div className="flex gap-2">
                      <Button
                        variant={!showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(false)}
                      >
                        Actives ({notes.filter(n => !n.archived).length})
                      </Button>
                      <Button
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(true)}
                      >
                        Archivées ({notes.filter(n => n.archived).length})
                      </Button>
                    </div>
                  </div>

                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Rechercher dans les notes..."
                      className="pl-10 h-12 text-base"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes Grid - 1 column for better visibility */}
                <div className="grid grid-cols-1 gap-4">
                  {filteredNotes.length > 0 ? (
                    paginatedNotes.map(note => (
                      <Card
                        key={note.id}
                        className="cursor-pointer hover:shadow-md transition-all group relative"
                        onClick={() => handleOpenNote(note)}
                      >
                        <CardContent className="p-4">
                          {/* Priority icon */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 right-2 h-6 w-6 transition-opacity ${note.priority ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newPriority = !note.priority;
                              if (note.id) {
                                NotesService.togglePriority(note.id, newPriority);
                                setNotes(notes.map(n => n.id === note.id ? { ...n, priority: newPriority } : n));
                              }
                            }}
                          >
                            {note.priority ? (
                              <span className="text-red-500 text-lg font-bold">!</span>
                            ) : (
                              <span className="text-muted-foreground text-lg">!</span>
                            )}
                          </Button>

                          {/* Archive icon */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 right-10 h-6 w-6 transition-opacity ${note.archived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (note.id) {
                                const newArchived = !note.archived;
                                const success = await NotesService.archiveNote(note.id, newArchived);
                                if (success) {
                                  setNotes(notes.map(n => n.id === note.id ? { ...n, archived: newArchived } : n));
                                }
                              }
                            }}
                            title={note.archived ? "Désarchiver" : "Archiver"}
                          >
                            <Archive className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          <h3 className="font-semibold text-base mb-2 line-clamp-1 pr-8">
                            {note.title || "Sans titre"}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {note.content ? note.content.replace(/<[^>]*>/g, '') : "Note vide"}
                          </p>
                          <div className="flex gap-2 flex-wrap mb-2">
                            {note.todos && note.todos.length > 0 && (
                              <Badge variant="secondary">
                                <CheckSquare className="h-3 w-3 mr-1" />
                                {note.todos.length}
                              </Badge>
                            )}
                            {note.images && note.images.length > 0 && (
                              <Badge variant="secondary">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                {note.images.length}
                              </Badge>
                            )}
                            {note.files && note.files.length > 0 && (
                              <Badge variant="secondary">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {note.files.length}
                              </Badge>
                            )}
                            {note.tags && note.tags.length > 0 && (
                              note.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                  <TagIcon className="h-3 w-3 mr-1" />
                                  {tag.name}
                                </Badge>
                              ))
                            )}
                          </div>
                          {note.updated_at && (
                            <p className="text-xs text-muted-foreground">
                              Modifiée le {new Date(note.updated_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-1 text-center py-16">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg mb-4">
                        {searchQuery ? "Aucune note trouvée" : "Aucune note"}
                      </p>
                      {!searchQuery && (
                        <Button onClick={handleCreateNote} size="lg">
                          <Plus className="h-5 w-5 mr-2" />
                          Créer votre première note
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pagination pour les notes */}
                {totalNotesPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesPage(p => Math.max(0, p - 1))}
                      disabled={notesPage === 0}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {notesPage + 1} sur {totalNotesPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesPage(p => Math.min(totalNotesPages - 1, p + 1))}
                      disabled={notesPage >= totalNotesPages - 1}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Open Note Editor */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div></div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        if (openNote?.id) {
                          const newArchived = !openNote.archived;
                          const success = await NotesService.archiveNote(openNote.id, newArchived);
                          if (success) {
                            const updatedNote = { ...openNote, archived: newArchived };
                            setOpenNote(updatedNote);
                            setNotes(notes.map(n => n.id === openNote.id ? updatedNote : n));
                          }
                        }
                      }}
                      title={openNote?.archived ? "Désarchiver" : "Archiver"}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteNoteModal(true)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Input
                  type="text"
                  placeholder="Titre de la note"
                  className="text-2xl font-semibold border-none shadow-none h-auto px-0 focus-visible:ring-0"
                  value={openNote?.title || ""}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                />

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddNoteTodoModal(true)}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Ajouter une tâche
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Ajouter une image
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0] && openNote?.id) {
                        try {
                          const image = await NotesService.uploadImage(openNote.id, e.target.files[0]);
                          if (image) {
                            const updatedImages = [...(openNote.images || []), image];
                            setOpenNote({ ...openNote, images: updatedImages });
                            await handleUpdateNote({ images: updatedImages });
                            showSuccess("Image ajoutée");
                          }
                        } catch (error) {
                          showError("Erreur lors de l'upload de l'image");
                        }
                        e.target.value = '';
                      }
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Ajouter un fichier
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddTagModal(true)}
                    className="gap-2"
                  >
                    <TagIcon className="h-4 w-4" />
                    Ajouter un tag
                  </Button>
                </div>

                {/* Tags */}
                {noteTags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {noteTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-sm px-2 py-1 gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors group"
                      >
                        <TagIcon className="h-3 w-3" />
                        {tag.tag}
                        <X
                          className="h-3 w-3 opacity-50 group-hover:opacity-100"
                          onClick={() => tag.id && handleDeleteTag(tag.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Todos */}
                {openNote.todos && openNote.todos.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground mb-2">todo list:</div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {openNote.todos.map((todo, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 border rounded">
                              <Checkbox
                                checked={todo.completed}
                                onCheckedChange={async () => {
                                  const updatedTodos = [...(openNote.todos || [])];
                                  updatedTodos[index] = { ...todo, completed: !todo.completed };
                                  await handleUpdateNote({ todos: updatedTodos });
                                }}
                              />
                              <span className={todo.completed ? "line-through text-muted-foreground flex-1 text-sm" : "flex-1 text-sm"}>
                                {todo.text}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={async () => {
                                  const updatedTodos = [...(openNote.todos || [])];
                                  updatedTodos.splice(index, 1);
                                  await handleUpdateNote({ todos: updatedTodos });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Images in thumbnails */}
                {openNote.images && openNote.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {openNote.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`/uploads/images/${image.filename}`}
                          alt={image.original_name}
                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(`/uploads/images/${image.filename}`)}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            if (image.id && openNote.id) {
                              try {
                                const success = await NotesService.deleteImage(openNote.id, image.id);
                                if (success) {
                                  const updatedImages = (openNote.images || []).filter((_, i) => i !== index);
                                  await handleUpdateNote({ images: updatedImages });
                                  showSuccess("Image supprimée");
                                }
                              } catch (error) {
                                showError("Erreur lors de la suppression");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files */}
                {openNote.files && openNote.files.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Fichiers divers : Fichier(s)
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {openNote.files.map((file: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-2 border rounded group">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">{file.original_name || file.filename}</p>
                                {file.size && (
                                  <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(2)} KB
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => window.open(`/uploads/files/${file.filename}`, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={async () => {
                                    if (file.id && openNote.id) {
                                      try {
                                        const response = await fetch(`/api/notes/${openNote.id}/files/${file.id}`, {
                                          method: 'DELETE',
                                          headers: {
                                            'Authorization': `Bearer ${AuthService.getToken()}`
                                          }
                                        });

                                        if (response.ok) {
                                          const updatedFiles = (openNote.files || []).filter((_, i) => i !== index);
                                          await handleUpdateNote({ files: updatedFiles });
                                          showSuccess("Fichier supprimé");
                                        }
                                      } catch (error) {
                                        showError("Erreur lors de la suppression");
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Rich text editor */}
                <RichTextEditor
                  content={openNote.content || ""}
                  onChange={handleContentChange}
                />

                {/* Note metadata */}
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Créée le:</span>
                        <span>{openNote.created_at ? new Date(openNote.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Modifiée le:</span>
                        <span>{openNote.updated_at ? new Date(openNote.updated_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save button */}
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleCloseNote}
                    className="gap-2"
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Todos & RSS Boxes side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Todos Box */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Tâches
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setAddTodoModal(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-3">
                    <TabsTrigger value="active" className="text-xs">Actives ({todos.filter(t => !t.completed).length})</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs">Complétées ({todos.filter(t => t.completed).length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="mt-0">
                    <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {activeTodos.length > 0 ? (
                        paginatedActiveTodos.map(todo => (
                          <div key={todo.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors group">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm flex-1 leading-snug">
                              {todo.text}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${todo.in_progress ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100 text-muted-foreground'} transition-all`}
                              onClick={() => todo.id && handleToggleTodoInProgress(todo.id)}
                              title={todo.in_progress ? "Marquer comme non commencé" : "Marquer comme en cours"}
                            >
                              <Activity className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${todo.priority ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                              onClick={() => todo.id && handleToggleTodoPriority(todo.id)}
                              title={todo.priority ? "Retirer la priorité" : "Marquer comme prioritaire"}
                            >
                              <Star className={`h-3.5 w-3.5 ${todo.priority ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => todo.id && handleDeleteTodo(todo.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground text-sm py-6">Aucune tâche active</p>
                      )}
                    </div>
                    {totalActiveTodosPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTodosActivePage(p => Math.max(0, p - 1))}
                          disabled={todosActivePage === 0}
                        >
                          ‹
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {todosActivePage + 1}/{totalActiveTodosPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTodosActivePage(p => Math.min(totalActiveTodosPages - 1, p + 1))}
                          disabled={todosActivePage >= totalActiveTodosPages - 1}
                        >
                          ›
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="mt-0">
                    <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {completedTodos.length > 0 ? (
                        paginatedCompletedTodos.map(todo => (
                          <div key={todo.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors group">
                            <Checkbox
                              checked={true}
                              onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm flex-1 line-through text-muted-foreground leading-snug">
                              {todo.text}
                            </span>
                            {todo.priority && (
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 opacity-50" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => todo.id && handleDeleteTodo(todo.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground text-sm py-6">Aucune tâche complétée</p>
                      )}
                    </div>
                    {totalCompletedTodosPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTodosCompletedPage(p => Math.max(0, p - 1))}
                          disabled={todosCompletedPage === 0}
                        >
                          ‹
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {todosCompletedPage + 1}/{totalCompletedTodosPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTodosCompletedPage(p => Math.min(totalCompletedTodosPages - 1, p + 1))}
                          disabled={todosCompletedPage >= totalCompletedTodosPages - 1}
                        >
                          ›
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* RSS Box */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl flex items-center gap-2 flex-shrink-0">
                    <Rss className="h-5 w-5" />
                    Flux RSS
                  </CardTitle>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={handleRefreshRss}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddRssFeedModal(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto">
                  {rssArticles.length > 0 ? (
                    paginatedRssArticles.map(article => (
                      <div
                        key={article.id}
                        className="p-2.5 border rounded hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => article.link && window.open(article.link, '_blank')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">{article.title}</h4>
                            {article.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {article.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-6">
                      Aucun article
                      <br />
                      <Button
                        variant="link"
                        className="mt-2 text-xs"
                        onClick={() => setAddRssFeedModal(true)}
                      >
                        Ajouter un flux RSS
                      </Button>
                    </p>
                  )}
                </div>
                {totalRssPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRssPage(p => Math.max(0, p - 1))}
                      disabled={rssPage === 0}
                    >
                      ‹
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {rssPage + 1}/{totalRssPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRssPage(p => Math.min(totalRssPages - 1, p + 1))}
                      disabled={rssPage >= totalRssPages - 1}
                    >
                      ›
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Admin Modal */}
      <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Administration</DialogTitle>
            <DialogDescription>
              Gérez les utilisateurs et les paramètres de l'application
            </DialogDescription>
          </DialogHeader>

          <Tabs value={adminTab} onValueChange={setAdminTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="rss">Flux RSS</TabsTrigger>
              <TabsTrigger value="calendar">Google Calendar</TabsTrigger>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4 space-y-4">
              <Button
                className="flex items-center gap-2"
                onClick={() => setAddUserModal(true)}
              >
                <User className="h-4 w-4" />
                Ajouter un utilisateur
              </Button>

              <div className="space-y-2">
                {users.map(u => (
                  <Card key={u.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {u.is_admin ? "Administrateur" : "Utilisateur"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChangePasswordModal({ open: true, userId: u.id })}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Mot de passe
                        </Button>
                        {u.id !== 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserModal({ open: true, userId: u.id })}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rss" className="mt-4 space-y-4">
              <Button
                className="flex items-center gap-2"
                onClick={() => setAddRssFeedModal(true)}
              >
                <Rss className="h-4 w-4" />
                Ajouter un flux RSS
              </Button>

              <div className="space-y-2">
                {rssFeeds.map(feed => (
                  <Card key={feed.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{feed.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{feed.url}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => feed.id && handleDeleteRssFeed(feed.id)}
                      >
                        Supprimer
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {rssFeeds.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucun flux RSS configuré</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Configuration Google Calendar OAuth 2.0
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-url">URL du site</Label>
                    <Input
                      id="app-url"
                      type="url"
                      placeholder="https://votre-domaine.com"
                      value={settings.app_url || ''}
                      onChange={(e) => setSettings({ ...settings, app_url: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      URL de votre site (utilisée pour les redirections OAuth)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="google-client-id">Client ID Google</Label>
                    <Input
                      id="google-client-id"
                      type="text"
                      placeholder="123456789-abcdef.apps.googleusercontent.com"
                      value={settings.google_client_id || ''}
                      onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="google-client-secret">Client Secret Google</Label>
                    <Input
                      id="google-client-secret"
                      type="password"
                      placeholder="GOCSPX-..."
                      value={settings.google_client_secret || ''}
                      onChange={(e) => setSettings({ ...settings, google_client_secret: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Créez un projet OAuth 2.0 sur{' '}
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Google Cloud Console
                      </a>
                      {' '}et activez l'API Google Calendar.
                    </p>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                        ⚠️ IMPORTANT : URI de redirection autorisée
                      </p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                        Ajoutez cette URL exacte dans la console Google Cloud (OAuth 2.0 Client IDs → URIs de redirection autorisées) :
                      </p>
                      <code className="block p-2 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded text-xs font-mono break-all">
                        {settings.app_url || window.location.origin}/api/calendar/oauth-callback
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>

                  {settings.google_client_id && settings.google_client_secret && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-2">Statut de connexion</h3>
                        {calendarAuthStatus.isAuthenticated && !calendarAuthStatus.isExpired ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-600"></div>
                            <span>Connecté à Google Calendar (OAuth 2.0)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
                            <span>Non connecté</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {calendarAuthStatus.needsReauth ? (
                          <Button onClick={handleGoogleConnect} className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Se connecter avec Google
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={async () => {
                                try {
                                  const result = await CalendarService.sync();
                                  showSuccess(`${result.syncedCount} événements synchronisés`);
                                  await loadCalendarEvents();
                                } catch (error: any) {
                                  if (error.response?.data?.needsReauth) {
                                    showError("Session expirée. Veuillez vous reconnecter.");
                                    checkCalendarAuthStatus();
                                  } else {
                                    showError("Erreur lors de la synchronisation.");
                                  }
                                }
                              }}
                              className="flex items-center gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Synchroniser
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleGoogleDisconnect}
                              className="flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Déconnecter
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="openrouter" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Configuration OpenRouter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Clé API OpenRouter</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-or-..."
                      value={settings.openrouter_api_key || ''}
                      onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Obtenez votre clé API sur{' '}
                      <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        openrouter.ai
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres généraux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rss-interval">Intervalle de rafraîchissement RSS (minutes)</Label>
                    <Input
                      id="rss-interval"
                      type="number"
                      min="5"
                      placeholder="30"
                      value={settings.rss_refresh_interval || ''}
                      onChange={(e) => setSettings({ ...settings, rss_refresh_interval: parseInt(e.target.value) })}
                    />
                  </div>

                  <Button onClick={handleSaveSettings}>
                    Enregistrer
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <ConfirmModal
        open={deleteNoteModal}
        onOpenChange={setDeleteNoteModal}
        title="Supprimer la note"
        description="Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible."
        onConfirm={confirmDeleteNote}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
      />

      <InputModal
        open={addTodoModal}
        onOpenChange={setAddTodoModal}
        title="Nouvelle tâche"
        label="Tâche"
        placeholder="Entrez la tâche..."
        onConfirm={confirmAddTodo}
        confirmText="Ajouter"
      />

      <InputModal
        open={addRssFeedModal}
        onOpenChange={setAddRssFeedModal}
        title="Ajouter un flux RSS"
        label="URL du flux RSS"
        placeholder="https://example.com/feed.xml"
        onConfirm={confirmAddRssFeed}
        confirmText="Ajouter"
        type="url"
      />

      <AddUserModal
        open={addUserModal}
        onOpenChange={setAddUserModal}
        onConfirm={confirmAddUser}
      />

      <ConfirmModal
        open={deleteUserModal.open}
        onOpenChange={(open) => setDeleteUserModal({ open })}
        title="Supprimer l'utilisateur"
        description="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        onConfirm={confirmDeleteUser}
        confirmText="Supprimer"
        variant="destructive"
      />

      <InputModal
        open={changePasswordModal.open}
        onOpenChange={(open) => setChangePasswordModal({ open })}
        title="Changer le mot de passe"
        label="Nouveau mot de passe"
        placeholder="Entrez le nouveau mot de passe..."
        onConfirm={confirmChangePassword}
        confirmText="Modifier"
        type="password"
      />

      <InputModal
        open={addNoteTodoModal}
        onOpenChange={setAddNoteTodoModal}
        title="Nouvelle tâche"
        label="Tâche"
        placeholder="Entrez la tâche..."
        onConfirm={async (text) => {
          if (openNote) {
            const updatedTodos = [...(openNote.todos || []), { text, completed: false }];
            await handleUpdateNote({ todos: updatedTodos });
          }
        }}
        confirmText="Ajouter"
      />

      <InputModal
        open={addTagModal}
        onOpenChange={setAddTagModal}
        title="Nouveau tag"
        label="Tag"
        placeholder="Entrez le nom du tag..."
        onConfirm={confirmAddTag}
        confirmText="Ajouter"
      />

      {/* Add Event Modal */}
      <Dialog open={addEventModal} onOpenChange={setAddEventModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un rendez-vous</DialogTitle>
            <DialogDescription>
              Créer un événement dans votre Google Calendar
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            try {
              const reminderMinutes = formData.get('reminderMinutes') as string;
              const recurrenceValue = formData.get('recurrence') as string;

              const eventData = {
                title: formData.get('title') as string,
                description: formData.get('description') as string || undefined,
                startDateTime: toParisISO(formData.get('startDateTime') as string),
                endDateTime: toParisISO(formData.get('endDateTime') as string),
                location: formData.get('location') as string || undefined,
                attendees: (formData.get('attendees') as string || '').split(',').map(e => e.trim()).filter(e => e),
                reminders: reminderMinutes && reminderMinutes !== '0' ? [
                  { method: 'popup', minutes: parseInt(reminderMinutes) }
                ] : undefined,
                recurrence: recurrenceValue ? [recurrenceValue] : undefined,
                visibility: formData.get('visibility') as string || 'default',
                colorId: formData.get('colorId') as string || undefined
              };

              await CalendarService.createEvent(eventData);
              showSuccess('Événement créé avec succès');
              setAddEventModal(false);
              await loadCalendarEvents();
              e.currentTarget.reset();
            } catch (error: any) {
              showError(error.response?.data?.error || 'Erreur lors de la création de l\'événement');
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input id="title" name="title" required placeholder="Réunion d'équipe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-background"
                placeholder="Détails de l'événement..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDateTime">Début *</Label>
                <Input
                  id="startDateTime"
                  name="startDateTime"
                  type="datetime-local"
                  required
                  defaultValue={toLocalDateTimeString(new Date(Date.now() + 60 * 60 * 1000))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDateTime">Fin *</Label>
                <Input
                  id="endDateTime"
                  name="endDateTime"
                  type="datetime-local"
                  required
                  defaultValue={toLocalDateTimeString(new Date(Date.now() + 2 * 60 * 60 * 1000))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lieu</Label>
              <Input id="location" name="location" placeholder="Salle de réunion A" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendees">Participants (emails séparés par des virgules)</Label>
              <Input
                id="attendees"
                name="attendees"
                type="text"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderMinutes">Rappel (minutes avant)</Label>
              <select
                id="reminderMinutes"
                name="reminderMinutes"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue="30"
              >
                <option value="0">Aucun</option>
                <option value="10">10 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 heure</option>
                <option value="1440">1 jour</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Récurrence</Label>
              <select
                id="recurrence"
                name="recurrence"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue=""
              >
                <option value="">Pas de récurrence</option>
                <option value="RRULE:FREQ=DAILY">Tous les jours</option>
                <option value="RRULE:FREQ=WEEKLY">Toutes les semaines</option>
                <option value="RRULE:FREQ=MONTHLY">Tous les mois</option>
                <option value="RRULE:FREQ=YEARLY">Tous les ans</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibilité</Label>
              <select
                id="visibility"
                name="visibility"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue="default"
              >
                <option value="default">Par défaut</option>
                <option value="public">Public</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorId">Couleur</Label>
              <select
                id="colorId"
                name="colorId"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue=""
              >
                <option value="">Par défaut</option>
                <option value="1">Lavande</option>
                <option value="2">Sauge</option>
                <option value="3">Raisin</option>
                <option value="4">Flamant rose</option>
                <option value="5">Banane</option>
                <option value="6">Mandarine</option>
                <option value="7">Paon</option>
                <option value="8">Graphite</option>
                <option value="9">Myrtille</option>
                <option value="10">Basilic</option>
                <option value="11">Tomate</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddEventModal(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Créer l'événement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={editEventModal.open} onOpenChange={(open) => setEditEventModal({ open, event: undefined })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le rendez-vous</DialogTitle>
            <DialogDescription>
              Modifier l'événement dans votre Google Calendar
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editEventModal.event?.id) return;

            const formData = new FormData(e.currentTarget);

            try {
              const reminderMinutes = formData.get('reminderMinutes') as string;
              const recurrenceValue = formData.get('recurrence') as string;

              const eventData = {
                title: formData.get('title') as string,
                description: formData.get('description') as string || undefined,
                startDateTime: toParisISO(formData.get('startDateTime') as string),
                endDateTime: toParisISO(formData.get('endDateTime') as string),
                location: formData.get('location') as string || undefined,
                attendees: (formData.get('attendees') as string || '').split(',').map(e => e.trim()).filter(e => e),
                reminders: reminderMinutes && reminderMinutes !== '0' ? [
                  { method: 'popup', minutes: parseInt(reminderMinutes) }
                ] : undefined,
                recurrence: recurrenceValue ? [recurrenceValue] : undefined,
                visibility: formData.get('visibility') as string || 'default',
                colorId: formData.get('colorId') as string || undefined
              };

              await CalendarService.updateEvent(editEventModal.event.id, eventData);
              showSuccess('Événement mis à jour avec succès');
              setEditEventModal({ open: false, event: undefined });
              await loadCalendarEvents();
            } catch (error: any) {
              showError(error.response?.data?.error || 'Erreur lors de la mise à jour de l\'événement');
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input id="edit-title" name="title" required defaultValue={editEventModal.event?.title || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                name="description"
                className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-background"
                defaultValue={editEventModal.event?.description || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDateTime">Début *</Label>
                <Input
                  id="edit-startDateTime"
                  name="startDateTime"
                  type="datetime-local"
                  required
                  defaultValue={editEventModal.event ? toLocalDateTimeString(editEventModal.event.start_time) : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDateTime">Fin *</Label>
                <Input
                  id="edit-endDateTime"
                  name="endDateTime"
                  type="datetime-local"
                  required
                  defaultValue={editEventModal.event ? toLocalDateTimeString(editEventModal.event.end_time) : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Lieu</Label>
              <Input id="edit-location" name="location" defaultValue={editEventModal.event?.location || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-attendees">Participants (emails séparés par des virgules)</Label>
              <Input
                id="edit-attendees"
                name="attendees"
                type="text"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-reminderMinutes">Rappel (minutes avant)</Label>
              <select
                id="edit-reminderMinutes"
                name="reminderMinutes"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue="30"
              >
                <option value="0">Aucun</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 heure</option>
                <option value="120">2 heures</option>
                <option value="1440">1 jour</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-recurrence">Récurrence</Label>
              <select
                id="edit-recurrence"
                name="recurrence"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue=""
              >
                <option value="">Aucune</option>
                <option value="RRULE:FREQ=DAILY">Quotidienne</option>
                <option value="RRULE:FREQ=WEEKLY">Hebdomadaire</option>
                <option value="RRULE:FREQ=MONTHLY">Mensuelle</option>
                <option value="RRULE:FREQ=YEARLY">Annuelle</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-visibility">Visibilité</Label>
              <select
                id="edit-visibility"
                name="visibility"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue="default"
              >
                <option value="default">Par défaut</option>
                <option value="public">Public</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-colorId">Couleur</Label>
              <select
                id="edit-colorId"
                name="colorId"
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                defaultValue=""
              >
                <option value="">Par défaut</option>
                <option value="1">Lavande</option>
                <option value="2">Sauge</option>
                <option value="3">Raisin</option>
                <option value="4">Flamant rose</option>
                <option value="5">Banane</option>
                <option value="6">Mandarine</option>
                <option value="7">Paon</option>
                <option value="8">Graphite</option>
                <option value="9">Myrtille</option>
                <option value="10">Basilic</option>
                <option value="11">Tomate</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditEventModal({ open: false, event: undefined })}>
                Annuler
              </Button>
              <Button type="submit">
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Chatbox */}
      {!chatOpen ? (
        <Button
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setChatOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-2xl flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Assistant IA
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  disabled={chatMessages.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelSelectorOpen}
                    className="flex-1 justify-between text-xs h-9"
                    disabled={chatLoading || loadingModels}
                  >
                    <span className="truncate">
                      {loadingModels ? (
                        "Chargement des modèles..."
                      ) : openRouterModels.length === 0 ? (
                        user?.is_admin ? "Configurer clé API OpenRouter" : "Aucun modèle IA configuré"
                      ) : selectedModel ? (
                        <>
                          {openRouterModels.find(m => m.id === selectedModel)?.name || "Sélectionner un modèle"}
                          {defaultModel === selectedModel && (
                            <span className="ml-1 text-yellow-500">★</span>
                          )}
                        </>
                      ) : (
                        "Sélectionner un modèle"
                      )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un modèle..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        {openRouterModels.length === 0 && user?.is_admin ? (
                          <div className="p-4 text-center text-sm">
                            <p className="mb-2">Aucun modèle IA disponible</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setModelSelectorOpen(false);
                                setShowAdmin(true);
                                setAdminTab('openrouter');
                              }}
                            >
                              Configurer OpenRouter
                            </Button>
                          </div>
                        ) : (
                          "Aucun modèle trouvé."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {openRouterModels.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={model.name}
                            onSelect={() => {
                              setSelectedModel(model.id);
                              setModelSelectorOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedModel === model.id ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            <div className="flex-1 truncate">
                              {model.name}
                            </div>
                            {defaultModel === model.id && (
                              <span className="ml-1 text-yellow-500 text-sm">★</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedModel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleSetDefaultModel(selectedModel)}
                  disabled={loadingModels}
                  title="Définir comme modèle par défaut"
                >
                  {defaultModel === selectedModel ? (
                    <span className="text-yellow-500">★</span>
                  ) : (
                    <span className="text-muted-foreground">☆</span>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Commencez une conversation avec l'IA
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                      }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Posez une question..."
                disabled={chatLoading || !selectedModel}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={chatLoading || !chatInput.trim() || !selectedModel}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Image modal for fullscreen view */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
