import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { Note } from "@/services/NotesService";
import { NoteCard } from "./NoteCard";

interface NotesListViewProps {
    notes: Note[];
    filteredNotes: Note[];
    paginatedNotes: Note[];
    notesPage: number;
    totalNotesPages: number;
    searchQuery: string;
    onOpenNote: (note: Note) => void;
    onCreateNote: () => void;
    onUpdateNotes: (updater: (notes: Note[]) => Note[]) => void;
    onPageChange: (page: number) => void;
}

export const NotesListView = ({
    paginatedNotes,
    totalNotesPages,
    notesPage,
    searchQuery,
    onOpenNote,
    onCreateNote,
    onUpdateNotes,
    onPageChange
}: NotesListViewProps) => {
    return (
        <>
            <div className="grid grid-cols-1 gap-4">
                {paginatedNotes.length > 0 ? (
                    paginatedNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onOpenNote={onOpenNote}
                            onUpdateNotes={onUpdateNotes}
                        />
                    ))
                ) : (
                    <div className="col-span-1 text-center py-16">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-lg mb-4">
                            {searchQuery ? "Aucune note trouvée" : "Aucune note"}
                        </p>
                        {!searchQuery && (
                            <Button onClick={onCreateNote} size="lg">
                                <Plus className="h-5 w-5 mr-2" />
                                Créer votre première note
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination pour les notes */}
            {totalNotesPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.max(0, notesPage - 1))}
                        disabled={notesPage === 0}
                    >
                        Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {notesPage + 1} sur {totalNotesPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.min(totalNotesPages - 1, notesPage + 1))}
                        disabled={notesPage >= totalNotesPages - 1}
                    >
                        Suivant
                    </Button>
                </div>
            )}
        </>
    );
};

export default NotesListView;
