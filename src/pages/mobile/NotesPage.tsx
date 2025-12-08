import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Plus, Search, CheckSquare, Image as ImageIcon, Paperclip, Tag as TagIcon, FileText } from "lucide-react";
import NotesService, { Note } from "@/services/NotesService";
import { showError, showSuccess } from "@/utils/toast";

const NOTES_PER_PAGE = 10;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const loadNotes = async () => {
    try {
      const data = await NotesService.getNotes(showArchived);
      setNotes(data);
    } catch (error) {
      showError("Erreur lors du chargement des notes");
    }
  };

  useEffect(() => {
    loadNotes();
  }, [showArchived]);

  const filteredNotes = notes
    .filter(note => {
      const matchArchived = showArchived ? note.archived : !note.archived;
      const matchSearch = searchQuery === "" ||
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchArchived && matchSearch;
    })
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });

  const totalPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const paginatedNotes = filteredNotes.slice(page * NOTES_PER_PAGE, (page + 1) * NOTES_PER_PAGE);

  const handleCreateNote = async () => {
    try {
      const newNote = await NotesService.createNote("Nouvelle note", "");
      navigate(`/mobile/notes/${newNote.id}`);
    } catch (error) {
      showError("Erreur lors de la création de la note");
    }
  };

  const handleTogglePriority = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newPriority = !note.priority;
      if (note.id) {
        await NotesService.togglePriority(note.id, newPriority);
        setNotes(notes.map(n => n.id === note.id ? { ...n, priority: newPriority } : n));
        showSuccess(newPriority ? "Note marquée comme prioritaire" : "Priorité retirée");
      }
    } catch (error) {
      showError("Erreur lors de la modification");
    }
  };

  return (
    <div className="pb-24">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={!showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(false);
              setPage(0);
            }}
            className="flex-1"
          >
            Actives ({notes.filter(n => !n.archived).length})
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(true);
              setPage(0);
            }}
            className="flex-1"
          >
            Archivées ({notes.filter(n => n.archived).length})
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="p-4 space-y-3">
        {paginatedNotes.length > 0 ? (
          paginatedNotes.map(note => (
            <MobileCard
              key={note.id}
              onClick={() => navigate(`/mobile/notes/${note.id}`)}
            >
              <div className="relative">
                {/* Priority Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute -top-1 -right-1 h-8 w-8 ${note.priority ? 'opacity-100' : 'opacity-50'
                    }`}
                  onClick={(e) => handleTogglePriority(note, e)}
                >
                  <span className={`text-lg font-bold ${note.priority ? 'text-red-500' : 'text-muted-foreground'}`}>
                    !
                  </span>
                </Button>

                <h3 className="font-semibold mb-2 line-clamp-1 pr-8">
                  {note.title || "Sans titre"}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {note.content ? note.content.replace(/<[^>]*>/g, '') : "Note vide"}
                </p>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap mb-2">
                  {note.todos && note.todos.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckSquare className="h-3 w-3 mr-1" />
                      {note.todos.length}
                    </Badge>
                  )}
                  {note.images && note.images.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {note.images.length}
                    </Badge>
                  )}
                  {note.files && note.files.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {note.files.length}
                    </Badge>
                  )}
                  {note.tags && note.tags.length > 0 && (
                    note.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))
                  )}
                  {note.tags && note.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{note.tags.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Date */}
                {note.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.updated_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </MobileCard>
          ))
        ) : (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Aucune note trouvée" : "Aucune note"}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateNote} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Créer votre première note
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ‹ Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            Suivant ›
          </Button>
        </div>
      )}

      {/* FAB */}
      <MobileFAB icon={Plus} onClick={handleCreateNote} label="Créer une note" />
    </div>
  );
}
