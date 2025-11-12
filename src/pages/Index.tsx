import { useEffect, useState } from "react";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { MadeWithDyad } from "@/components/made-with-dyad";
import {
  PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2,
  Image, CheckSquare, FileText, Rss, ExternalLink, RefreshCw, Key, Zap, Paperclip, X, Edit
} from "lucide-react";
import AuthService from "@/services/AuthService";
import AdminService from "@/services/AdminService";
import NotesService, { Note } from "@/services/NotesService";
import TodosService, { Todo } from "@/services/TodosService";
import RssService, { RssFeed, RssArticle } from "@/services/RssService";
import SettingsService, { Settings as AppSettings } from "@/services/SettingsService";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";

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
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [rssArticles, setRssArticles] = useState<RssArticle[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [adminTab, setAdminTab] = useState("users");
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userFromAuth = AuthService.getUser();
    if (userFromAuth) {
      setUser(userFromAuth);
      loadNotes();
      loadTodos();
      loadRssFeeds();
      loadRssArticles();
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

  useEffect(() => {
    if (showAdmin) {
      loadUsers();
      loadSettings();
    }
  }, [showAdmin]);

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await NotesService.createNote("Nouvelle note");
      if (newNote) {
        setNotes([newNote, ...notes]);
        setCurrentNote(newNote);
        setShowNoteDialog(true);
      }
    } catch (error) {
      showError("Erreur lors de la création de la note");
    }
  };

  const handleOpenNote = (note: Note) => {
    setCurrentNote(note);
    setShowNoteDialog(true);
  };

  const handleUpdateNote = async (updatedFields: Partial<Note>) => {
    if (!currentNote) return;

    try {
      const updatedNote = {
        ...currentNote,
        ...updatedFields,
        todos: currentNote.todos || [],
        images: currentNote.images || [],
        files: currentNote.files || []
      };

      const success = await NotesService.updateNote(updatedNote);

      if (success) {
        setCurrentNote(updatedNote);
        setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note));
      }
    } catch (error) {
      showError("Erreur lors de la mise à jour de la note");
    }
  };

  const handleDeleteNote = async () => {
    if (!currentNote?.id) return;

    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      try {
        const success = await NotesService.deleteNote(currentNote.id);

        if (success) {
          const updatedNotes = notes.filter(note => note.id !== currentNote.id);
          setNotes(updatedNotes);
          setShowNoteDialog(false);
          setCurrentNote(null);
          showSuccess("Note supprimée");
        }
      } catch (error) {
        showError("Erreur lors de la suppression");
      }
    }
  };

  const handleAddTodo = async () => {
    const text = prompt("Nouvelle tâche:");
    if (text) {
      try {
        const newTodo = await TodosService.createTodo(text);
        if (newTodo) {
          setTodos([newTodo, ...todos]);
          showSuccess("Tâche ajoutée");
        }
      } catch (error) {
        showError("Erreur lors de l'ajout de la tâche");
      }
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

  const handleAddRssFeed = async () => {
    const url = prompt("URL du flux RSS:");
    if (url) {
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

  const handleAddUser = async () => {
    const username = prompt("Nom d'utilisateur:");
    if (!username) return;
    const password = prompt("Mot de passe:");
    if (!password) return;
    const isAdmin = window.confirm("Donner les droits administrateur ?");

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

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      try {
        const success = await AdminService.deleteUser(userId);
        if (success) {
          loadUsers();
          showSuccess("Utilisateur supprimé");
        }
      } catch (error) {
        showError("Erreur lors de la suppression");
      }
    }
  };

  const handleChangePassword = async (userId: number) => {
    const newPassword = prompt("Nouveau mot de passe:");
    if (newPassword) {
      try {
        const success = await AdminService.updateUserPassword(userId, newPassword);
        if (success) {
          showSuccess("Mot de passe modifié");
        }
      } catch (error) {
        showError("Erreur lors de la modification");
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentNote?.id) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);

      try {
        const response = await fetch(`/api/notes/${currentNote.id}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (response.ok) {
          const file = await response.json();
          const updatedFiles = [...(currentNote.files || []), file];
          handleUpdateNote({ files: updatedFiles });
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
        {/* Todos & RSS Boxes - Large side by side */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Todos Box */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckSquare className="h-6 w-6" />
                  Tâches
                </CardTitle>
                <Button size="lg" variant="outline" onClick={handleAddTodo} className="gap-2">
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
                  <Button size="lg" variant="outline" onClick={handleAddRssFeed} className="gap-2">
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
                      onClick={handleAddRssFeed}
                    >
                      Ajouter un flux RSS
                    </Button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        <div className="space-y-6">
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

          {/* Notes Grid */}
          <div className="grid grid-cols-4 gap-6">
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
                    <div className="flex gap-2 flex-wrap">
                      {note.todos && note.todos.length > 0 && (
                        <Badge variant="secondary">
                          <CheckSquare className="h-3 w-3 mr-1" />
                          {note.todos.length}
                        </Badge>
                      )}
                      {note.images && note.images.length > 0 && (
                        <Badge variant="secondary">
                          <Image className="h-3 w-3 mr-1" />
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
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-4 text-center py-16">
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
        </div>
      </div>

      {/* Note Editor Dialog - Full Screen */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <Input
                type="text"
                placeholder="Titre de la note"
                className="text-2xl font-semibold border-none shadow-none h-auto px-0 focus-visible:ring-0"
                value={currentNote?.title || ""}
                onChange={(e) => handleUpdateNote({ title: e.target.value })}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => currentNote && handleUpdateNote({ archived: !currentNote.archived })}
                  title={currentNote?.archived ? "Désarchiver" : "Archiver"}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDeleteNote}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {currentNote && (
            <Tabs defaultValue="content" className="mt-4">
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="todos">
                  Tâches
                  {currentNote.todos && currentNote.todos.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{currentNote.todos.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="images">
                  Images
                  {currentNote.images && currentNote.images.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{currentNote.images.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="files">
                  Fichiers
                  {currentNote.files && currentNote.files.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{currentNote.files.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6">
                <RichTextEditor
                  content={currentNote.content || ""}
                  onChange={(content) => handleUpdateNote({ content })}
                  placeholder="Commencez à écrire votre note..."
                />
              </TabsContent>

              <TabsContent value="todos" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const text = prompt("Nouvelle tâche:");
                        if (text) {
                          const updatedTodos = [...(currentNote.todos || []), { text, completed: false }];
                          handleUpdateNote({ todos: updatedTodos });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une tâche
                    </Button>

                    <div className="space-y-2">
                      {currentNote.todos && currentNote.todos.length > 0 ? (
                        currentNote.todos.map((todo, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border rounded-md">
                            <Checkbox
                              checked={todo.completed}
                              onCheckedChange={() => {
                                const updatedTodos = [...(currentNote.todos || [])];
                                updatedTodos[index].completed = !updatedTodos[index].completed;
                                handleUpdateNote({ todos: updatedTodos });
                              }}
                            />
                            <span className={todo.completed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                              {todo.text}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updatedTodos = [...(currentNote.todos || [])];
                                updatedTodos.splice(index, 1);
                                handleUpdateNote({ todos: updatedTodos });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">Aucune tâche dans cette note</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="images" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <label htmlFor="image-upload">
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Ajouter une image
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0] && currentNote.id) {
                            try {
                              const image = await NotesService.uploadImage(currentNote.id, e.target.files[0]);
                              if (image) {
                                const updatedImages = [...(currentNote.images || []), image];
                                handleUpdateNote({ images: updatedImages });
                                showSuccess("Image ajoutée");
                              }
                            } catch (error) {
                              showError("Erreur lors de l'upload");
                            } finally {
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </label>

                    <div className="grid grid-cols-4 gap-4">
                      {currentNote.images && currentNote.images.length > 0 ? (
                        currentNote.images.map((image, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden border group">
                            <img
                              src={`/uploads/${image.filename}`}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                if (image.id && currentNote.id) {
                                  try {
                                    const success = await NotesService.deleteImage(currentNote.id, image.id);
                                    if (success) {
                                      const updatedImages = (currentNote.images || []).filter((_, i) => i !== index);
                                      handleUpdateNote({ images: updatedImages });
                                      showSuccess("Image supprimée");
                                    }
                                  } catch (error) {
                                    showError("Erreur lors de la suppression");
                                  }
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-4 text-center text-muted-foreground py-8">Aucune image</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <label htmlFor="file-upload">
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Ajouter un fichier
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    <div className="space-y-2">
                      {currentNote.files && currentNote.files.length > 0 ? (
                        currentNote.files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors group">
                            <div className="flex items-center gap-3 flex-1">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                              <span className="truncate">{file.filename || file.original_name}</span>
                              <Badge variant="secondary">
                                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/uploads/${file.filename}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={async () => {
                                  if (file.id && currentNote.id) {
                                    try {
                                      const response = await fetch(`/api/notes/${currentNote.id}/files/${file.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        }
                                      });
                                      if (response.ok) {
                                        const updatedFiles = (currentNote.files || []).filter((_, i) => i !== index);
                                        handleUpdateNote({ files: updatedFiles });
                                        showSuccess("Fichier supprimé");
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
                        <p className="text-center text-muted-foreground py-8">Aucun fichier attaché</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

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
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="rss">Flux RSS</TabsTrigger>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4 space-y-4">
              <Button
                className="flex items-center gap-2"
                onClick={handleAddUser}
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
                          onClick={() => handleChangePassword(u.id)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Mot de passe
                        </Button>
                        {u.id !== 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
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
                onClick={handleAddRssFeed}
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
                    <Label htmlFor="ai-model">Modèle IA</Label>
                    <Input
                      id="ai-model"
                      placeholder="anthropic/claude-3-sonnet"
                      value={settings.ai_model || ''}
                      onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                    />
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

      <div className="fixed bottom-4 right-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;
