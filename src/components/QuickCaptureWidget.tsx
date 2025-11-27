import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Zap, Send } from "lucide-react";
import NotesService from "@/services/NotesService";
import { showSuccess, showError } from "@/utils/toast";

interface QuickCaptureWidgetProps {
  onNoteCaptured?: () => void;
}

export function QuickCaptureWidget({ onNoteCaptured }: QuickCaptureWidgetProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCapture = async () => {
    if (!content.trim()) {
      showError("Le contenu ne peut pas être vide");
      return;
    }

    setIsSubmitting(true);
    try {
      const noteTitle = title.trim() || `Note rapide - ${new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })}`;

      await NotesService.createNote(noteTitle, content);
      showSuccess("Note capturée avec succès");

      // Reset form
      setTitle("");
      setContent("");
      setOpen(false);

      // Notify parent component
      if (onNoteCaptured) {
        onNoteCaptured();
      }
    } catch (error) {
      showError("Erreur lors de la capture de la note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCapture();
    }

    // Escape to close
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => setOpen(true)}
        title="Capture rapide (Ctrl+Q)"
      >
        <Zap className="h-6 w-6" />
      </Button>

      {/* Quick Capture Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Capture rapide
            </DialogTitle>
            <DialogDescription>
              Capturez rapidement une idée ou une note. Appuyez sur Ctrl+Entrée pour enregistrer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Optional Title */}
            <div>
              <Input
                placeholder="Titre (optionnel)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium"
                autoFocus={false}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si vide, un titre avec la date sera généré automatiquement
              </p>
            </div>

            {/* Content */}
            <Textarea
              placeholder="Votre note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              autoFocus
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> +{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> pour enregistrer
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCapture}
                  disabled={isSubmitting || !content.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Enregistrement..." : "Capturer"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
