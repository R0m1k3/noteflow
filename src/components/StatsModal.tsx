import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatsDashboard } from "./StatsDashboard";
import { Note } from "@/services/NotesService";
import { Todo } from "@/services/TodosService";

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  todos: Todo[];
}

export function StatsModal({ open, onOpenChange, notes, todos }: StatsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Statistiques</DialogTitle>
          <DialogDescription className="sr-only">
            Tableau de bord de vos statistiques notes et tâches.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <StatsDashboard notes={notes} todos={todos} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
