import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles } from "lucide-react";
import { DEFAULT_TEMPLATES, getTemplatesByCategory, searchTemplates, type NoteTemplate } from "@/utils/noteTemplates";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: NoteTemplate) => void;
}

export function TemplateSelector({ open, onOpenChange, onSelectTemplate }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const templates = searchQuery.trim()
    ? searchTemplates(searchQuery)
    : DEFAULT_TEMPLATES;

  const templatesByCategory = getTemplatesByCategory();

  const handleSelectTemplate = (template: NoteTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choisir un template
          </DialogTitle>
          <DialogDescription>
            Démarrez rapidement avec un modèle prédéfini
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Templates Grid */}
        <ScrollArea className="h-[400px] pr-4">
          {searchQuery.trim() ? (
            // Search Results
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleSelectTemplate(template)}
                />
              ))}
              {templates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  Aucun template trouvé
                </div>
              )}
            </div>
          ) : (
            // Templates by Category
            <div className="space-y-6">
              {Array.from(templatesByCategory.entries()).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => handleSelectTemplate(template)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: NoteTemplate;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <Button
      variant="outline"
      className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent hover:border-primary transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-2xl">{template.icon}</span>
        <span className="font-semibold text-left flex-1">{template.name}</span>
      </div>
      <p className="text-sm text-muted-foreground text-left">
        {template.description}
      </p>
      {template.todos && template.todos.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {template.todos.length} tâche{template.todos.length > 1 ? 's' : ''}
        </Badge>
      )}
    </Button>
  );
}
