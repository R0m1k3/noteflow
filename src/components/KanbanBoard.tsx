import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare, Image as ImageIcon, Paperclip, Tag as TagIcon, Plus, GripVertical } from "lucide-react";
import { Note } from "@/services/NotesService";

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'todo', title: 'À faire', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'in_progress', title: 'En cours', color: 'bg-yellow-100 dark:bg-yellow-900' },
  { id: 'review', title: 'En révision', color: 'bg-purple-100 dark:bg-purple-900' },
  { id: 'done', title: 'Terminé', color: 'bg-green-100 dark:bg-green-900' },
];

interface KanbanBoardProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  onCreateNote: (columnId: string) => void;
  onMoveNote?: (noteId: number, newStatus: string) => void;
}

export function KanbanBoard({ notes, onNoteClick, onCreateNote, onMoveNote }: KanbanBoardProps) {
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Group notes by their kanban_status tag or default to 'backlog'
  const getNoteStatus = (note: Note): string => {
    const statusTag = note.tags?.find(tag =>
      DEFAULT_COLUMNS.some(col => col.id === tag.name.toLowerCase())
    );
    return statusTag?.name.toLowerCase() || 'backlog';
  };

  const notesByColumn = DEFAULT_COLUMNS.reduce((acc, column) => {
    acc[column.id] = notes.filter(note =>
      !note.archived && getNoteStatus(note) === column.id
    );
    return acc;
  }, {} as Record<string, Note[]>);

  const handleDragStart = (note: Note) => {
    setDraggedNote(note);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedNote && onMoveNote && getNoteStatus(draggedNote) !== columnId) {
      onMoveNote(draggedNote.id!, columnId);
    }
    setDraggedNote(null);
  };

  const handleDragEnd = () => {
    setDraggedNote(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {DEFAULT_COLUMNS.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-80"
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <Card className={`h-full flex flex-col ${dragOverColumn === column.id ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  {column.title}
                  <Badge variant="secondary" className="ml-1">
                    {notesByColumn[column.id]?.length || 0}
                  </Badge>
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCreateNote(column.id)}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-2 pr-4">
                  {notesByColumn[column.id]?.map((note) => (
                    <div
                      key={note.id}
                      draggable
                      onDragStart={() => handleDragStart(note)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onNoteClick(note)}
                      className={`p-3 border rounded-lg cursor-move hover:shadow-md transition-all group ${
                        draggedNote?.id === note.id ? 'opacity-50' : ''
                      } ${note.priority ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {note.title || "Sans titre"}
                          </h4>
                          {note.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {note.content.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.todos && note.todos.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {note.todos.filter(t => t.completed).length}/{note.todos.length}
                          </Badge>
                        )}
                        {note.images && note.images.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {note.images.length}
                          </Badge>
                        )}
                        {note.files && note.files.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {note.files.length}
                          </Badge>
                        )}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag.id} variant="outline" className="text-xs h-5">
                                <TagIcon className="h-2 w-2 mr-1" />
                                {tag.name}
                              </Badge>
                            ))}
                            {note.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs h-5">
                                +{note.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      {note.updated_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.updated_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                  {notesByColumn[column.id]?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Aucune note
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
