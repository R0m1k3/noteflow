import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard } from "lucide-react";
import { type KeyboardShortcut, formatShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({ open, onOpenChange, shortcuts }: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    // Determine category based on description
    let category = 'Général';

    if (shortcut.description.toLowerCase().includes('note')) {
      category = 'Notes';
    } else if (shortcut.description.toLowerCase().includes('recherch')) {
      category = 'Recherche';
    } else if (shortcut.description.toLowerCase().includes('todo') || shortcut.description.toLowerCase().includes('tâche')) {
      category = 'Tâches';
    } else if (shortcut.description.toLowerCase().includes('navigation')) {
      category = 'Navigation';
    } else if (shortcut.description.toLowerCase().includes('édition') || shortcut.description.toLowerCase().includes('gras') || shortcut.description.toLowerCase().includes('italique')) {
      category = 'Édition';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer plus rapidement
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatShortcut(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Appuyez sur <Badge variant="outline" className="mx-1">?</Badge> pour afficher cette aide
        </div>
      </DialogContent>
    </Dialog>
  );
}
