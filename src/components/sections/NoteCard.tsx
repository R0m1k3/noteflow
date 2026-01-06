import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, CheckSquare, ImageIcon, Paperclip, Tag as TagIcon } from "lucide-react";
import { Note } from "@/services/NotesService";
import NotesService from "@/services/NotesService";

interface NoteCardProps {
    note: Note;
    onOpenNote: (note: Note) => void;
    onUpdateNotes: (updater: (notes: Note[]) => Note[]) => void;
}

// Clean HTML content for preview
const cleanHtmlContent = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
};

export const NoteCard = ({ note, onOpenNote, onUpdateNotes }: NoteCardProps) => {
    const handleTogglePriority = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newPriority = !note.priority;
        if (note.id) {
            await NotesService.togglePriority(note.id, newPriority);
            onUpdateNotes(notes => notes.map(n => n.id === note.id ? { ...n, priority: newPriority } : n));
        }
    };

    const handleToggleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (note.id) {
            const newArchived = !note.archived;
            const success = await NotesService.archiveNote(note.id, newArchived);
            if (success) {
                onUpdateNotes(notes => notes.map(n => n.id === note.id ? { ...n, archived: newArchived } : n));
            }
        }
    };

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-all group relative"
            onClick={() => onOpenNote(note)}
        >
            <CardContent className="p-4">
                {/* Priority icon */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 h-6 w-6 transition-opacity ${note.priority ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    onClick={handleTogglePriority}
                >
                    {note.priority ? (
                        <span className="text-red-500 text-lg font-bold">!</span>
                    ) : (
                        <span className="text-muted-foreground text-lg">!</span>
                    )}
                </Button>

                {/* Archive icon */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-10 h-6 w-6 transition-opacity ${note.archived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    onClick={handleToggleArchive}
                    title={note.archived ? "Désarchiver" : "Archiver"}
                >
                    <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>

                <h3 className="font-semibold text-base mb-2 line-clamp-1 pr-8">
                    {note.title || "Sans titre"}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {note.content ? cleanHtmlContent(note.content) : "Note vide"}
                </p>
                <div className="flex gap-2 flex-wrap mb-2">
                    {note.todos && note.todos.length > 0 && (
                        <Badge variant="secondary">
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {note.todos.length}
                        </Badge>
                    )}
                    {note.images && note.images.length > 0 && (
                        <Badge variant="secondary">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {note.images.length}
                        </Badge>
                    )}
                    {note.files && note.files.length > 0 && (
                        <Badge variant="secondary">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {note.files.length}
                        </Badge>
                    )}
                    {note.tags && note.tags.length > 0 && (
                        note.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-xs">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag.name}
                            </Badge>
                        ))
                    )}
                </div>
                {note.updated_at && (
                    <p className="text-xs text-muted-foreground">
                        Modifiée le {new Date(note.updated_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default NoteCard;
