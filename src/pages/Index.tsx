import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2, Image, CheckSquare } from "lucide-react";
import AuthService from "@/services/AuthService";
import AdminService from "@/services/AdminService";
import NotesService, { Note } from "@/services/NotesService";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";

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
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer l'utilisateur et vérifier l'authentification
    const userFromAuth = AuthService.getUser();
    if (userFromAuth) {
      setUser(userFromAuth);
      loadNotes().catch(err => {
        console.error("Erreur lors du chargement des notes:", err);
        showError("Erreur lors du chargement des notes");
      });
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
      throw error;
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
        showError("Erreur lors du chargement des utilisateurs");
      }
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
        setCurrentNote(newNote);
      }
    } catch (error) {
      console.error("Erreur lors de la création de la note:", error);
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
        images: currentNote.images || []
      };
      
      const success = await NotesService.updateNote(updatedNote);
      
      if (success) {
        setCurrentNote(updatedNote);
        setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note));
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la note:", error);
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
        }
      } catch (error) {
        console.error("Erreur lors de la suppression de la note:", error);
        showError("Erreur lors de la suppression de la note");
      }
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
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      showError("Erreur lors de la création de l'utilisateur");
    }
  };

  const handleChangePassword = async (userId: number) => {
    const password = prompt("Nouveau mot de passe:");
    if (!password) return;
    
    try {
      const success = await AdminService.updateUserPassword(userId, password);
      if (success) {
        loadUsers();
      }
    } catch (error) {
      console.error("Erreur lors de la modification du mot de passe:", error);
      showError("Erreur lors de la modification du mot de passe");
    }
  };

  const handleToggleAdmin = async (userId: number, currentStatus: boolean) => {
    try {
      const success = await AdminService.toggleAdminStatus(userId, currentStatus);
      if (success) {
        loadUsers();
      }
    } catch (error) {
      console.error("Erreur lors de la modification des droits:", error);
      showError("Erreur lors de la modification des droits");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      try {
        const success = await AdminService.deleteUser(userId);
        if (success) {
          loadUsers();
        }
      } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
        showError("Erreur lors de la suppression de l'utilisateur");
      }
    }
  };

  // Charger les utilisateurs quand le panel admin s'ouvre
  useEffect(() => {
    if (showAdmin) {
      loadUsers();
    }
  }, [showAdmin]);

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
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-4 w-4 text-primary"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="text-xl font-semibold">Notes App</span>
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
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar */}
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
            
            <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto">
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
                      <h3 className="font-medium">{note.title || "Sans titre"}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {note.content ? note.content.replace(/<[^>]*>/g, '') : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Note Editor */}
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
                  <TabsTrigger value="todos">Tâches</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className="min-h-[500px] outline-none"
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: currentNote.content || "" }}
                        onBlur={(e) => handleUpdateNote({ content: e.currentTarget.innerHTML })}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="todos" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
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
                      </div>
                      
                      <div className="space-y-2">
                        {currentNote.todos && currentNote.todos.length > 0 ? (
                          currentNote.todos.map((todo, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                              <input 
                                type="checkbox" 
                                checked={todo.completed} 
                                onChange={() => {
                                  const updatedTodos = [...(currentNote.todos || [])];
                                  updatedTodos[index].completed = !updatedTodos[index].completed;
                                  handleUpdateNote({ todos: updatedTodos });
                                }}
                                className="h-4 w-4"
                              />
                              <span className={todo.completed ? "line-through text-muted-foreground" : ""}>
                                {todo.text}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="ml-auto h-6 w-6"
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
                          <p className="text-center text-muted-foreground py-4">Aucune tâche</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="images" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            type="button"
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
                                  }
                                } catch (error) {
                                  console.error("Erreur lors de l'upload de l'image:", error);
                                  showError("Erreur lors de l'upload de l'image");
                                } finally {
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {currentNote.images && currentNote.images.length > 0 ? (
                          currentNote.images.map((image, index) => (
                            <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                              <img 
                                src={`/uploads/${image.filename}`} 
                                alt={`Note image ${index}`}
                                className="w-full h-full object-cover"
                              />
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                onClick={async () => {
                                  if (image.id && currentNote.id) {
                                    try {
                                      const success = await NotesService.deleteImage(currentNote.id, image.id);
                                      if (success) {
                                        const updatedImages = (currentNote.images || []).filter((_, i) => i !== index);
                                        handleUpdateNote({ images: updatedImages });
                                      }
                                    } catch (error) {
                                      console.error("Erreur lors de la suppression de l'image:", error);
                                      showError("Erreur lors de la suppression de l'image");
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="col-span-full text-center text-muted-foreground py-4">Aucune image</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">Aucune note sélectionnée</p>
                <Button 
                  className="mt-4"
                  onClick={handleCreateNote}
                >
                  Créer une note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Modal */}
      <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Administration</DialogTitle>
            <DialogDescription>
              Gérez les utilisateurs et les paramètres de l'application
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="users">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
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
                {users.length > 0 ? (
                  users.map(user => (
                    <Card key={user.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{user.username ? user.username.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.is_admin ? "Administrateur" : "Utilisateur"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.id !== 1 && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleChangePassword(user.id)}
                              >
                                Mot de passe
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                              >
                                {user.is_admin ? "Retirer admin" : "Rendre admin"}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Supprimer
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Chargement des utilisateurs...</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <p>Paramètres de l'application</p>
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