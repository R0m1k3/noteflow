import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Plus, Search, CheckSquare, Image as ImageIcon, Paperclip, Tag as TagIcon, FileText, LayoutGrid, List } from "lucide-react";
import NotesService, { Note } from "@/services/NotesService";
import { showError, showSuccess } from "@/utils/toast";
import { AdvancedSearch, type SearchFilters, type TagOption } from "@/components/AdvancedSearch";
import { KanbanBoard } from "@/components/KanbanBoard";
import TagsService from "@/services/TagsService";

const NOTES_PER_PAGE = 10;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    tags: [],
    dateFrom: undefined,
    dateTo: undefined,
    hasTodos: undefined,
    hasImages: undefined,
    hasFiles: undefined,
    priority: undefined
  });
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const navigate = useNavigate();

  const [counts, setCounts] = useState({ active: 0, archived: 0 });

  const loadNotes = async () => {
    try {
      const [notesData, countsData] = await Promise.all([
        NotesService.getNotes(showArchived),
        NotesService.getCounts()
      ]);
      setNotes(notesData);
      setCounts(countsData);
    } catch (error) {
      showError("Erreur lors du chargement des notes");
    }
  };

  useEffect(() => {
    loadNotes();
  }, [showArchived]);

  // Extract unique tags from all notes
  const availableTags: TagOption[] = Array.from(
    new Map(
      notes.flatMap(note =>
        (note.tags || []).map(tag => [tag.name, { id: tag.id!, name: tag.name }])
      )
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredNotes = notes
    .filter(note => {
      // Archived filter
      if (showArchived ? !note.archived : note.archived) return false;

      // Text search
      if (searchQuery !== "" &&
        !(note.title?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !(note.content?.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }

      // Tags filter
      if (searchFilters.tags.length > 0) {
        const noteTags = (note.tags || []).map(t => t.name);
        if (!searchFilters.tags.some(filterTag => noteTags.includes(filterTag))) {
          return false;
        }
      }

      // Date range filter
      if (searchFilters.dateFrom || searchFilters.dateTo) {
        const noteDate = new Date(note.updated_at || note.created_at || 0);
        if (searchFilters.dateFrom) {
          const fromDate = new Date(searchFilters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (noteDate < fromDate) return false;
        }
        if (searchFilters.dateTo) {
          const toDate = new Date(searchFilters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (noteDate > toDate) return false;
        }
      }

      // Has todos filter
      if (searchFilters.hasTodos && (!note.todos || note.todos.length === 0)) {
        return false;
      }

      // Has images filter
      if (searchFilters.hasImages && (!note.images || note.images.length === 0)) {
        return false;
      }

      // Has files filter
      if (searchFilters.hasFiles && (!note.files || note.files.length === 0)) {
        return false;
      }

      // Priority filter
      if (searchFilters.priority && !note.priority) {
        return false;
      }

      return true;
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
      if (newNote) {
        showSuccess("Note créée");
        navigate(`/mobile/notes/${newNote.id}`);
      }
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

        {/* Advanced Filters */}
        <AdvancedSearch
          filters={searchFilters}
          onFiltersChange={(newFilters) => {
            setSearchFilters(newFilters);
            setPage(0);
          }}
          availableTags={availableTags}
        />

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
            Actives ({counts.active})
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
            Archivées ({counts.archived})
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex-1 gap-2"
          >
            <List className="h-4 w-4" />
            Liste
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="flex-1 gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Notes View - List or Kanban */}
      {viewMode === 'list' ? (
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
        </div>
      ) : (
        /* Kanban View */
        <div className="p-2 overflow-x-auto">
          <KanbanBoard
            notes={filteredNotes}
            onNoteClick={(note) => navigate(`/mobile/notes/${note.id}`)}
            onCreateNote={(columnId) => {
              handleCreateNote();
            }}
            onMoveNote={async (noteId, newStatus) => {
              const note = notes.find(n => n.id === noteId);
              if (!note) return;

              // Remove old status tags
              const oldStatusTags = note.tags?.filter(tag =>
                ['backlog', 'todo', 'in_progress', 'review', 'done'].includes(tag.name.toLowerCase())
              ) || [];

              for (const tag of oldStatusTags) {
                if (tag.id && note.id) {
                  await TagsService.deleteTag(note.id, tag.id);
                }
              }

              // Add new status tag
              if (note.id) {
                await TagsService.addTag(note.id, newStatus);
                await loadNotes();
                showSuccess(`Note déplacée vers ${newStatus}`);
              }
            }}
          />
        </div>
      )}

      {/* FAB */}
      <MobileFAB icon={Plus} onClick={handleCreateNote} label="Créer une note" />
    </div>
  );
}
