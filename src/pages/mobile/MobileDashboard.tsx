import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Menu,
  Calendar,
  FileText,
  CheckSquare,
  Rss,
  Settings,
  LogOut,
  User
} from "lucide-react";
import AuthService from "@/services/AuthService";

const menuItems = [
  { icon: Calendar, label: "Calendrier", path: "/mobile/calendar" },
  { icon: FileText, label: "Notes", path: "/mobile/notes" },
  { icon: CheckSquare, label: "Tâches", path: "/mobile/todos" },
  { icon: Rss, label: "RSS", path: "/mobile/rss" },
  { icon: Settings, label: "Paramètres", path: "/mobile/settings" },
];

export default function MobileDashboard() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const getCurrentTitle = () => {
    const item = menuItems.find(item => location.pathname.startsWith(item.path));
    return item?.label || "NoteFlow";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">NoteFlow</h2>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4">
                  <div className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleMenuClick(item.path)}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-semibold truncate flex-1 text-center">
            {getCurrentTitle()}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleMenuClick("/mobile/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="h-[calc(100vh-3.5rem)] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
