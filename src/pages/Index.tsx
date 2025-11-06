import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { showSuccess } from "@/utils/toast";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PlusCircle, Search, User, LogOut, Settings, ChevronDown, Plus, Archive, Trash2, Image, CheckSquare } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showSuccess("Déconnexion réussie");
    window.location.href = "/login";
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user?.username}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user?.is_admin && (
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
            
            <Button className="w-full flex items-center gap-2" size="lg">
              <PlusCircle className="h-4 w-4" />
              Nouvelle Note
            </Button>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="archived">Archivées</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="space-y-2">
              {/* Notes list placeholder */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-medium">Note d'exemple</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Ceci est un exemple de contenu de note. Cliquez pour éditer.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Note Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                type="text"
                placeholder="Titre de la note"
                className="text-xl font-semibold border-none shadow-none text-2xl h-auto px-0 focus-visible:ring-0"
              />
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
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
                      placeholder="Commencez à écrire..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="todos" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter une tâche
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 border rounded-md">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span>Exemple de tâche</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="images" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Ajouter une image
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {/* Image placeholders */}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
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
              <Button className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Ajouter un utilisateur
              </Button>
              
              <div className="space-y-2">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>AD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">admin</p>
                        <p className="text-sm text-muted-foreground">Administrateur</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
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