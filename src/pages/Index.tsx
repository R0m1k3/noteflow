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
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { MadeWithDyad } from "@/components/made-with-dyad";
import {
  PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2,
  Image, CheckSquare, FileText, Rss, ExternalLink, RefreshCw, Key, Zap, Paperclip, X
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
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [rssArticles, setRssArticles] = useState<RssArticle[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [adminTab, setAdminTab] = useState("users");
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
        if (fetchedNotes.length > 0) {
          setCurrentNote(fetchedNotes[0]);
        }
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
      const articles = await RssService.getArticles(10);
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
      }
    } catch (error) {
      showError("Erreur lors de la création de la note");
    }
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
          setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
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
    (activeTab === "all" || (activeTab === "archived" && note.archived)) &&
    (searchQuery === "" ||
     (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
     (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xl font-semibold">NoteFlow</span>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
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
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_300px] gap-6">
          {/* Left Sidebar - Notes */}
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher une note..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              className="w-full flex items-center gap-2"
              size="lg"
              onClick={handleCreateNote}
            >
              <PlusCircle className="h-4 w-4" />
              Nouvelle Note
            </Button>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="archived">Archivées</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune note trouvée</p>
              ) : (
                filteredNotes.map(note => (
                  <Card
                    key={note.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${currentNote?.id === note.id ? 'border-primary' : ''}`}
                    onClick={() => setCurrentNote(note)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">{note.title || "Sans titre"}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {note.content ? note.content.replace(/<[^>]*>/g, '') : ""}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {note.todos && note.todos.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {note.todos.length}
                          </Badge>
                        )}
                        {note.images && note.images.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            {note.images.length}
                          </Badge>
                        )}
                        {note.files && note.files.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {note.files.length}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Center - Note Editor */}
          {currentNote ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  type="text"
                  placeholder="Titre de la note"
                  className="text-xl font-semibold border-none shadow-none text-2xl h-auto px-0 focus-visible:ring-0"
                  value={currentNote.title || ""}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleUpdateNote({ archived: !currentNote.archived })}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDeleteNote}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="content">
                <TabsList>
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

                <TabsContent value="content" className="mt-4">
                  <RichTextEditor
                    content={currentNote.content || ""}
                    onChange={(content) => handleUpdateNote({ content })}
                    placeholder="Commencez à écrire votre note..."
                  />
                </TabsContent>

                <TabsContent value="todos" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => {
                          const text = prompt("Nouvelle tâche:");
                          if (text) {
                            const updatedTodos = [...(currentNote.todos || []), { text, completed: false }];
                            handleUpdateNote({ todos: updatedTodos });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une tâche
                      </Button>

                      <div className="space-y-2">
                        {currentNote.todos && currentNote.todos.length > 0 ? (
                          currentNote.todos.map((todo, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
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
                                className="h-6 w-6"
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

                <TabsContent value="images" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <label htmlFor="image-upload">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          type="button"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          <Image className="h-4 w-4" />
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

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="col-span-full text-center text-muted-foreground py-8">Aucune image</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="files" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <label htmlFor="file-upload">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          type="button"
                          onClick={() => document.getElementById('file-upload')?.click()}
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
                      </label>

                      <div className="space-y-2">
                        {currentNote.files && currentNote.files.length > 0 ? (
                          currentNote.files.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors group">
                              <div className="flex items-center gap-2 flex-1">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate">{file.filename || file.original_name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(`/uploads/${file.filename}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Aucune note sélectionnée</p>
                <Button onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une note
                </Button>
              </div>
            </div>
          )}

          {/* Right Sidebar - Todos & RSS */}
          <div className="space-y-6">
            {/* Boxes côte à côte */}
            <div className="grid grid-cols-2 gap-4">
              {/* Todos Box */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Tâches
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={handleAddTodo} className="h-7 w-7 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-8">
                      <TabsTrigger value="active" className="text-xs">Actives</TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs">Complétées</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-2">
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {todos.filter(t => !t.completed).length > 0 ? (
                          todos.filter(t => !t.completed).map(todo => (
                            <div key={todo.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent/50 transition-colors group">
                              <Checkbox
                                checked={false}
                                onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                              />
                              <span className="text-xs flex-1">
                                {todo.text}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => todo.id && handleDeleteTodo(todo.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-center text-muted-foreground py-4">Aucune tâche active</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-2">
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {todos.filter(t => t.completed).length > 0 ? (
                          todos.filter(t => t.completed).map(todo => (
                            <div key={todo.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent/50 transition-colors group">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => todo.id && handleToggleTodo(todo.id)}
                              />
                              <span className="text-xs flex-1 line-through text-muted-foreground">
                                {todo.text}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => todo.id && handleDeleteTodo(todo.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-center text-muted-foreground py-4">Aucune tâche complétée</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* RSS Box */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Rss className="h-4 w-4" />
                      Flux RSS
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={handleRefreshRss} className="h-7 w-7 p-0">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleAddRssFeed} className="h-7 w-7 p-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2 max-h-[330px] overflow-y-auto">
                    {rssArticles.length > 0 ? (
                      rssArticles.map(article => (
                        <div
                          key={article.id}
                          className="p-2 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => article.link && window.open(article.link, '_blank')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium line-clamp-2 mb-1">{article.title}</h4>
                              {article.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {article.description.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        Aucun article
                        <br />
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 text-xs"
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
                {users.map(user => (
                  <Card key={user.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.is_admin ? "Administrateur" : "Utilisateur"}
                          </p>
                        </div>
                      </div>
                      {user.id !== 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Supprimer
                        </Button>
                      )}
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
