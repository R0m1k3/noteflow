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
import { RichTextEditor } from "@/components/RichTextEditor";
import { MadeWithDyad } from "@/components/made-with-dyad";
import {
  PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2,
  Image as ImageIcon, CheckSquare, FileText, Rss, ExternalLink, RefreshCw, Key, Zap, Paperclip, X, Edit, Calendar as CalendarIcon, Tag as TagIcon
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
  const [deleteUserModal, setDeleteUserModal] = useState<{open: boolean, userId?: number}>({open: false});
  const [changePasswordModal, setChangePasswordModal] = useState<{open: boolean, userId?: number}>({open: false});
  const [addNoteTodoModal, setAddNoteTodoModal] = useState(false);
  const [addTagModal, setAddTagModal] = useState(false);

  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      const articles = await RssService.getArticles(15);
      if (Array.isArray(articles)) {
        setRssArticles(articles);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles RSS:", error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const events = await CalendarService.getEvents(10);
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
    if (user?.is_admin && settings.openrouter_api_key) {
      setLoadingModels(true);
      try {
        const models = await OpenRouterService.getModels();
        setOpenRouterModels(models);
      } catch (error) {
        console.error("Erreur lors du chargement des modèles:", error);
      } finally {
        setLoadingModels(false);
      }
    }
  };

  useEffect(() => {
    if (showAdmin) {
      loadUsers();
      loadSettings();
    }
  }, [showAdmin]);

  useEffect(() => {
    if (showAdmin && adminTab === 'openrouter' && settings.openrouter_api_key && openRouterModels.length === 0) {
      loadOpenRouterModels();
    }
  }, [showAdmin, adminTab, settings.openrouter_api_key]);

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
      const success = await NotesService.updateNote(updatedNote);
      if (!success) {
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
        await NotesService.updateNote(updatedNote);
        // Update notes list silently after save
        setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
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

  const handleDeleteTodo = async (todoId: number) => {
    try {
      await TodosService.deleteTodo(todoId);
      setTodos(todos.filter(t => t.id !== todoId));
      showSuccess("Tâche supprimée");
    } catch (error) {
      showError("Erreur lors de la suppression");
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
        setNoteTags([...noteTags, newTag]);
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
        setNoteTags(noteTags.filter(t => t.id !== tagId));
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-semibold">NoteFlow</span>
            </div>

            <div className="flex items-center gap-6">
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
        {/* Two Column Layout: Notes Left | Boxes Right */}
        <div className="grid grid-cols-[2fr,1fr] gap-8">
          {/* Left Column: Notes or Open Note */}
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

                {/* Notes Grid - 2 columns */}
                <div className="grid grid-cols-2 gap-6">
                  {filteredNotes.length > 0 ? (
                    filteredNotes.map(note => (
                      <Card
                        key={note.id}
                        className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
                        onClick={() => handleOpenNote(note)}
                      >
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-lg mb-3 line-clamp-2 min-h-[56px]">
                            {note.title || "Sans titre"}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-4 mb-4 min-h-[80px]">
                            {note.content ? note.content.replace(/<[^>]*>/g, '') : "Note vide"}
                          </p>
                          <div className="flex gap-2 flex-wrap mb-3">
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
                    <div className="col-span-2 text-center py-16">
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
              </>
            ) : (
              /* Open Note Editor */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleCloseNote}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Retour aux notes
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openNote && handleUpdateNote({ archived: !openNote.archived })}
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

                <Tabs defaultValue="content" className="mt-4">
                  <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                    <TabsTrigger value="content">Contenu</TabsTrigger>
                    <TabsTrigger value="todos">
                      Tâches
                      {openNote.todos && openNote.todos.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{openNote.todos.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="images">
                      Images
                      {openNote.images && openNote.images.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{openNote.images.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="files">
                      Fichiers
                      {openNote.files && openNote.files.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{openNote.files.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="tags">
                      Tags
                      {noteTags.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{noteTags.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="mt-4">
                    <RichTextEditor
                      key={openNote.id}
                      content={openNote.content || ""}
                      onChange={handleContentChange}
                    />
                  </TabsContent>

                  <TabsContent value="todos" className="mt-4 space-y-4">
                    <Button
                      onClick={() => setAddNoteTodoModal(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une tâche
                    </Button>

                    <div className="space-y-2">
                      {openNote.todos && openNote.todos.length > 0 ? (
                        openNote.todos.map((todo, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Checkbox
                              checked={todo.completed}
                              onCheckedChange={async () => {
                                const updatedTodos = [...(openNote.todos || [])];
                                updatedTodos[index] = { ...todo, completed: !todo.completed };
                                await handleUpdateNote({ todos: updatedTodos });
                              }}
                            />
                            <span className={todo.completed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                              {todo.text}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                const updatedTodos = [...(openNote.todos || [])];
                                updatedTodos.splice(index, 1);
                                await handleUpdateNote({ todos: updatedTodos });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">Aucune tâche</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="images" className="mt-4 space-y-4">
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0] && openNote.id) {
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
                        className="cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {openNote.images && openNote.images.length > 0 ? (
                        openNote.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={`/uploads/images/${image.filename}`}
                              alt={image.original_name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                if (image.id && openNote.id) {
                                  try {
                                    const success = await NotesService.deleteImage(openNote.id, image.id);
                                    if (success) {
                                      const updatedImages = (openNote.images || []).filter((_, i) => i !== index);
                                      await handleUpdateNote({ images: updatedImages });
                                    }
                                  } catch (error) {
                                    showError("Erreur lors de la suppression");
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-3 text-center text-muted-foreground py-8">Aucune image</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="mt-4 space-y-4">
                    <div>
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      {openNote.files && openNote.files.length > 0 ? (
                        openNote.files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg group">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.original_name || file.filename}</p>
                              {file.size && (
                                <p className="text-sm text-muted-foreground">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`/uploads/files/${file.filename}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
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
                                      }
                                    } catch (error) {
                                      showError("Erreur lors de la suppression");
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">Aucun fichier</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tags" className="mt-4 space-y-4">
                    <Button
                      onClick={() => setAddTagModal(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un tag
                    </Button>

                    <div className="flex gap-2 flex-wrap">
                      {noteTags.length > 0 ? (
                        noteTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-base px-3 py-2 gap-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors group"
                          >
                            <TagIcon className="h-4 w-4" />
                            {tag.tag}
                            <X
                              className="h-4 w-4 opacity-50 group-hover:opacity-100"
                              onClick={() => tag.id && handleDeleteTag(tag.id)}
                            />
                          </Badge>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8 w-full">Aucun tag</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

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
              </div>
            )}
          </div>

          {/* Right Column: Todos & RSS Boxes stacked */}
          <div className="space-y-6">
          {/* Todos Box */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckSquare className="h-6 w-6" />
                  Tâches
                </CardTitle>
                <Button size="lg" variant="outline" onClick={() => setAddTodoModal(true)} className="gap-2">
                  <Plus className="h-5 w-5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="active">Actives ({todos.filter(t => !t.completed).length})</TabsTrigger>
                  <TabsTrigger value="completed">Complétées ({todos.filter(t => t.completed).length})</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {todos.filter(t => !t.completed).length > 0 ? (
                      todos.filter(t => !t.completed).map(todo => (
                        <div key={todo.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group">
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                            className="h-5 w-5"
                          />
                          <span className="text-base flex-1">
                            {todo.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => todo.id && handleDeleteTodo(todo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Aucune tâche active</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {todos.filter(t => t.completed).length > 0 ? (
                      todos.filter(t => t.completed).map(todo => (
                        <div key={todo.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                            className="h-5 w-5"
                          />
                          <span className="text-base flex-1 line-through text-muted-foreground">
                            {todo.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => todo.id && handleDeleteTodo(todo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Aucune tâche complétée</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* RSS Box */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Rss className="h-6 w-6" />
                  Flux RSS
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="lg" variant="outline" onClick={handleRefreshRss} className="gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Actualiser
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setAddRssFeedModal(true)} className="gap-2">
                    <Plus className="h-5 w-5" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {rssArticles.length > 0 ? (
                  rssArticles.map(article => (
                    <div
                      key={article.id}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => article.link && window.open(article.link, '_blank')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium line-clamp-2 mb-1">{article.title}</h4>
                          {article.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun article
                    <br />
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setAddRssFeedModal(true)}
                    >
                      Ajouter un flux RSS
                    </Button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar Box */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6" />
                  Rendez-vous
                </CardTitle>
                <Button size="lg" variant="outline" onClick={async () => {
                  try {
                    const result = await CalendarService.sync();
                    showSuccess(`${result.syncedCount} événements synchronisés`);
                    await loadCalendarEvents();
                  } catch (error) {
                    showError("Erreur lors de la synchronisation");
                  }
                }} className="gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Synchroniser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {calendarEvents.length > 0 ? (
                  calendarEvents.map(event => {
                    const startDate = new Date(event.start_time);
                    const endDate = new Date(event.end_time);
                    const isToday = startDate.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={event.id}
                        className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium line-clamp-2 mb-1">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isToday ? "Aujourd'hui" : startDate.toLocaleDateString('fr-FR')} à {startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📍 {event.location}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun rendez-vous à venir
                    <br />
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setShowAdmin(true)}
                    >
                      Configurer Google Calendar
                    </Button>
                  </p>
                )}
              </div>
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
                          onClick={() => setChangePasswordModal({open: true, userId: u.id})}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Mot de passe
                        </Button>
                        {u.id !== 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserModal({open: true, userId: u.id})}
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
                    Configuration Google Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Choix du type d'authentification */}
                  <div className="space-y-2">
                    <Label htmlFor="google-auth-type">Méthode d'authentification</Label>
                    <Select
                      value={settings.google_auth_type || 'oauth2'}
                      onValueChange={(value) => setSettings({ ...settings, google_auth_type: value as 'oauth2' | 'service_account' | 'api_externe' })}
                    >
                      <SelectTrigger id="google-auth-type">
                        <SelectValue placeholder="Sélectionnez une méthode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oauth2">
                          <div className="flex flex-col">
                            <span className="font-medium">OAuth 2.0</span>
                            <span className="text-xs text-muted-foreground">
                              Calendrier personnel avec consentement utilisateur
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="service_account">
                          <div className="flex flex-col">
                            <span className="font-medium">Service Account</span>
                            <span className="text-xs text-muted-foreground">
                              Clé JSON pour calendriers partagés (sans interaction)
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="api_externe">
                          <div className="flex flex-col">
                            <span className="font-medium">API externe</span>
                            <span className="text-xs text-muted-foreground">
                              Connectez-vous à une API externe pour Google Calendar
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      <strong>OAuth 2.0</strong> : Pour accéder au calendrier personnel avec autorisation de l'utilisateur.<br/>
                      <strong>Service Account</strong> : Pour accéder à des calendriers partagés sans interaction utilisateur.<br/>
                      <strong>API externe</strong> : Utilisez votre propre API backend pour gérer la connexion à Google Calendar.
                    </p>
                  </div>

                  {/* Configuration OAuth2 */}
                  {(!settings.google_auth_type || settings.google_auth_type === 'oauth2') && (
                    <>
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
                            {window.location.origin}/api/calendar/oauth-callback
                          </code>
                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-2">
                            💡 Si vous utilisez un domaine différent, créez un fichier .env avec APP_URL=https://votre-domaine.com
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Configuration Service Account */}
                  {settings.google_auth_type === 'service_account' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="google-service-account-key">Clé Service Account (JSON)</Label>
                        <textarea
                          id="google-service-account-key"
                          className="w-full min-h-[200px] p-3 text-xs font-mono border rounded-md"
                          placeholder='Collez ici le contenu du fichier JSON de votre Service Account&#10;{&#10;  "type": "service_account",&#10;  "project_id": "...",&#10;  "private_key_id": "...",&#10;  ...&#10;}'
                          value={settings.google_service_account_key || ''}
                          onChange={(e) => setSettings({ ...settings, google_service_account_key: e.target.value })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Créez un Service Account sur{' '}
                          <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Google Cloud Console
                          </a>
                          {' '}et téléchargez la clé JSON.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="google-calendar-email">Email du calendrier à synchroniser</Label>
                        <Input
                          id="google-calendar-email"
                          type="email"
                          placeholder="votre-email@gmail.com"
                          value={settings.google_calendar_email || ''}
                          onChange={(e) => setSettings({ ...settings, google_calendar_email: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Important : Vous devez partager votre calendrier avec l'email du Service Account (visible dans le JSON)
                        </p>
                      </div>
                    </>
                  )}

                  {/* Configuration API Key */}
                  {settings.google_auth_type === 'api_externe' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="google-api-key">Clé API Google Calendar</Label>
                        <Input
                          id="google-api-key"
                          type="password"
                          placeholder="AIzaSy..."
                          value={settings.google_calendar_api_key || ''}
                          onChange={(e) => setSettings({ ...settings, google_calendar_api_key: e.target.value })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Entrez votre clé API Google Calendar.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="google-calendar-id-api">ID du calendrier</Label>
                        <Input
                          id="google-calendar-id-api"
                          type="text"
                          placeholder="primary ou votre-email@gmail.com"
                          value={settings.google_calendar_id || ''}
                          onChange={(e) => setSettings({ ...settings, google_calendar_id: e.target.value })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Utilisez "primary" pour votre calendrier principal ou l'email du calendrier spécifique.
                        </p>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                            ℹ️ Obtenir une clé API
                          </p>
                          <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                            1. Allez sur <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a><br/>
                            2. Créez une clé API<br/>
                            3. Activez l'API Google Calendar<br/>
                            4. Copiez la clé API ici
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>

                  {(
                    ((!settings.google_auth_type || settings.google_auth_type === 'oauth2') && settings.google_client_id && settings.google_client_secret) ||
                    (settings.google_auth_type === 'service_account' && settings.google_service_account_key) ||
                    (settings.google_auth_type === 'api_externe' && settings.google_calendar_api_key)
                  ) && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-2">Statut de connexion</h3>
                        {calendarAuthStatus.isAuthenticated && !calendarAuthStatus.isExpired ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-600"></div>
                            <span>Connecté à Google Calendar ({
                              calendarAuthStatus.authType === 'service_account' ? 'Service Account' :
                              calendarAuthStatus.authType === 'api_externe' ? 'API Key' :
                              'OAuth 2.0'
                            })</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
                            <span>Non connecté</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {calendarAuthStatus.needsReauth && (!settings.google_auth_type || settings.google_auth_type === 'oauth2') ? (
                          <Button onClick={handleGoogleConnect} className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Se connecter avec Google
                          </Button>
                        ) : !calendarAuthStatus.needsReauth && (!settings.google_auth_type || settings.google_auth_type === 'oauth2') ? (
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
                        ) : settings.google_auth_type === 'api_externe' || settings.google_auth_type === 'service_account' ? (
                          <Button
                            onClick={async () => {
                              try {
                                const result = await CalendarService.sync();
                                showSuccess(`${result.syncedCount} événements synchronisés`);
                                await loadCalendarEvents();
                              } catch (error) {
                                showError("Erreur lors de la synchronisation");
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Synchroniser
                          </Button>
                        ) : null}
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-model">Modèle IA</Label>
                      {settings.openrouter_api_key && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              setLoadingModels(true);
                              const models = await OpenRouterService.refreshModels();
                              setOpenRouterModels(models);
                              showSuccess(`${models.length} modèles chargés`);
                            } catch (error) {
                              showError("Erreur lors du chargement des modèles");
                            } finally {
                              setLoadingModels(false);
                            }
                          }}
                          disabled={loadingModels}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loadingModels ? 'animate-spin' : ''}`} />
                          Actualiser les modèles
                        </Button>
                      )}
                    </div>
                    {settings.openrouter_api_key && openRouterModels.length > 0 ? (
                      <Select
                        value={settings.ai_model || ''}
                        onValueChange={(value) => setSettings({ ...settings, ai_model: value })}
                      >
                        <SelectTrigger id="ai-model">
                          <SelectValue placeholder="Sélectionnez un modèle" />
                        </SelectTrigger>
                        <SelectContent>
                          {openRouterModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{model.name}</span>
                                {model.description && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {model.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="ai-model"
                        placeholder="anthropic/claude-3-sonnet"
                        value={settings.ai_model || ''}
                        onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                      />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {settings.openrouter_api_key
                        ? `${openRouterModels.length} modèles disponibles. Cliquez sur "Actualiser" pour charger la liste.`
                        : "Ajoutez d'abord une clé API pour voir les modèles disponibles."}
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
        onOpenChange={(open) => setDeleteUserModal({open})}
        title="Supprimer l'utilisateur"
        description="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        onConfirm={confirmDeleteUser}
        confirmText="Supprimer"
        variant="destructive"
      />

      <InputModal
        open={changePasswordModal.open}
        onOpenChange={(open) => setChangePasswordModal({open})}
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

      <div className="fixed bottom-4 right-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;
