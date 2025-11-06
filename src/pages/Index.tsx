import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess } from "@/utils/toast";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-semibold">Notes App</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Connecté en tant que <span className="font-medium">{user?.username}</span>
              </span>
              {user?.is_admin && (
                <Button
                  variant="outline"
                  onClick={() => setShowAdmin(true)}
                >
                  Administration
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16 grid grid-cols-[300px_1fr] h-screen">
        {/* Sidebar */}
        <aside className="bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            <Input
              type="search"
              placeholder="Rechercher une note..."
              className="w-full"
            />
            <Button className="w-full">
              Nouvelle Note
            </Button>
            <div className="space-y-2">
              {/* Notes list will go here */}
            </div>
          </div>
        </aside>

        {/* Note Editor */}
        <main className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow p-6">
            <Input
              type="text"
              placeholder="Titre de la note"
              className="text-xl font-semibold mb-4"
            />
            <div
              className="min-h-[500px] p-4 border rounded-lg"
              contentEditable
              suppressContentEditableWarning
            />
          </div>
        </main>
      </div>

      {/* Admin Modal */}
      {showAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Administration</h2>
              <Button
                variant="ghost"
                onClick={() => setShowAdmin(false)}
              >
                ✕
              </Button>
            </div>
            {/* Admin content will go here */}
          </div>
        </div>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default Index;