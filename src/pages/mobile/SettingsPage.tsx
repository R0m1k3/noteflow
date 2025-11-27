import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  User,
  LogOut,
  Calendar,
  Rss,
  Moon,
  Sun,
  Zap,
  ChevronRight
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import AuthService from "@/services/AuthService";
import CalendarService from "@/services/CalendarService";
import { showError, showSuccess } from "@/utils/toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; email?: string } | null>(null);

  useEffect(() => {
    loadCalendarStatus();
  }, []);

  const loadCalendarStatus = async () => {
    try {
      const status = await CalendarService.getAuthStatus();
      setCalendarStatus(status);
    } catch (error) {
      console.error("Error loading calendar status:", error);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login");
  };

  const handleConnectCalendar = async () => {
    try {
      const authUrl = await CalendarService.getAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      showError("Erreur lors de la connexion à Google Calendar");
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="text-base font-normal cursor-pointer flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Clair
              </Label>
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="text-base font-normal cursor-pointer flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Sombre
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="text-base font-normal cursor-pointer flex items-center gap-2">
                <User className="h-4 w-4" />
                Système
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {calendarStatus?.connected ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Connecté en tant que:
              </p>
              <p className="text-sm font-medium mb-3">
                {calendarStatus.email}
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Déconnecter
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Connectez votre compte Google pour synchroniser vos événements.
              </p>
              <Button onClick={handleConnectCalendar} className="w-full">
                Connecter Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSS Feeds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Flux RSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate("/mobile/rss")}
          >
            Gérer les flux RSS
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* OpenRouter AI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            OpenRouter AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Configuration de l'intégration OpenRouter pour les fonctionnalités IA.
          </p>
          <Button variant="outline" className="w-full" disabled>
            Configuration (bientôt disponible)
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>NoteFlow Mobile v1.0</p>
        <p className="text-xs mt-1">© 2024 NoteFlow</p>
      </div>
    </div>
  );
}
