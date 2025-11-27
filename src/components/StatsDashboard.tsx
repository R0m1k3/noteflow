import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  CheckSquare,
  Tag as TagIcon,
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { Note } from "@/services/NotesService";
import { Todo } from "@/services/TodosService";

interface StatsDashboardProps {
  notes: Note[];
  todos: Todo[];
}

export function StatsDashboard({ notes, todos }: StatsDashboardProps) {
  // Calculate statistics
  const totalNotes = notes.length;
  const archivedNotes = notes.filter(n => n.archived).length;
  const activeNotes = totalNotes - archivedNotes;
  const priorityNotes = notes.filter(n => n.priority && !n.archived).length;

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  const activeTodos = totalTodos - completedTodos;
  const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // Notes with specific content
  const notesWithTodos = notes.filter(n => n.todos && n.todos.length > 0 && !n.archived).length;
  const notesWithImages = notes.filter(n => n.images && n.images.length > 0 && !n.archived).length;
  const notesWithFiles = notes.filter(n => n.files && n.files.length > 0 && !n.archived).length;

  // Get all unique tags
  const allTags = new Set<string>();
  notes.forEach(note => {
    note.tags?.forEach(tag => allTags.add(tag.name));
  });
  const totalTags = allTags.size;

  // Recent activity (notes updated in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyUpdated = notes.filter(n =>
    n.updated_at && new Date(n.updated_at) > sevenDaysAgo
  ).length;

  // Calculate productivity score (0-100)
  const productivityScore = Math.round(
    (completionRate * 0.4) +
    ((activeNotes > 0 ? Math.min(priorityNotes / activeNotes, 1) : 0) * 20) +
    ((recentlyUpdated / Math.max(activeNotes, 1)) * 40)
  );

  return (
    <div className="space-y-4">
      {/* Productivity Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Score de Productivité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{productivityScore}</span>
              <Badge variant={productivityScore >= 70 ? "default" : productivityScore >= 40 ? "secondary" : "outline"}>
                {productivityScore >= 70 ? "Excellent" : productivityScore >= 40 ? "Bien" : "À améliorer"}
              </Badge>
            </div>
            <Progress value={productivityScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Basé sur le taux de complétion, notes prioritaires et activité récente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{totalNotes}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Actives</span>
                <Badge variant="secondary">{activeNotes}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Archivées</span>
                <Badge variant="outline">{archivedNotes}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Prioritaires</span>
                <Badge variant="destructive">{priorityNotes}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{totalTodos}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Complétées</span>
                <Badge variant="secondary">{completedTodos}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">En cours</span>
                <Badge variant="default">{activeTodos}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Taux</span>
                <Badge variant="outline">{completionRate.toFixed(0)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Contenu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avec tâches</span>
                <Badge variant="secondary">{notesWithTodos}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avec images</span>
                <Badge variant="secondary">{notesWithImages}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avec fichiers</span>
                <Badge variant="secondary">{notesWithFiles}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tags uniques</span>
                <Badge variant="secondary">{totalTags}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Derniers 7 jours</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{recentlyUpdated}</span>
              <span className="text-sm text-muted-foreground">notes modifiées</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
