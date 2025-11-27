import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  ArrowLeft,
  Archive,
  Trash2,
  CheckSquare,
  Image as ImageIcon,
  Paperclip,
  Tag as TagIcon,
  X,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotesService, { Note } from "@/services/NotesService";
import { showError, showSuccess } from "@/utils/toast";

export default function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [addTodoModal, setAddTodoModal] = useState(false);
  const [todoText, setTodoText] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    if (!id) return;
    try {
      const notes = await NotesService.getNotes();
      const foundNote = notes.find(n => n.id === parseInt(id));
      if (foundNote) {
        setNote(foundNote);
      } else {
        showError("Note introuvable");
        navigate("/mobile/notes");
      }
    } catch (error) {
      showError("Erreur lors du chargement de la note");
    }
  };

  const updateNote = async (updates: Partial<Note>) => {
    if (!note) return;
    try {
      const updated = { ...note, ...updates };
      await NotesService.updateNote(updated);
      setNote(updated);
    } catch (error) {
      showError("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async () => {
    if (!note?.id) return;
    try {
      await NotesService.deleteNote(note.id);
      showSuccess("Note supprimée");
      navigate("/mobile/notes");
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const handleAddTodo = async () => {
    if (!note?.id || !todoText.trim()) return;
    const newTodo = await NotesService.addTodo(note.id, todoText.trim());
    if (newTodo) {
      const updatedTodos = [...(note.todos || []), newTodo];
      setNote({ ...note, todos: updatedTodos });
      setTodoText("");
      setAddTodoModal(false);
    }
  };

  const handleToggleTodo = async (index: number) => {
    if (!note?.todos) return;
    const todo = note.todos[index];
    if (!todo.id) return;

    const success = await NotesService.toggleTodo(todo.id, !todo.completed);
    if (success) {
      const updatedTodos = [...note.todos];
      updatedTodos[index] = { ...updatedTodos[index], completed: !updatedTodos[index].completed };
      setNote({ ...note, todos: updatedTodos });
    }
  };

  const handleDeleteTodo = async (index: number) => {
    if (!note?.todos) return;
    const todo = note.todos[index];
    if (!todo.id) return;

    const success = await NotesService.deleteTodo(todo.id);
    if (success) {
      const updatedTodos = note.todos.filter((_, i) => i !== index);
      setNote({ ...note, todos: updatedTodos });
      showSuccess("Tâche supprimée");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !note?.id) return;
    try {
      const image = await NotesService.uploadImage(note.id, e.target.files[0]);
      if (image) {
        const updatedImages = [...(note.images || []), image];
        setNote({ ...note, images: updatedImages });
        showSuccess("Image ajoutée");
      }
    } catch (error) {
      showError("Erreur lors de l'upload");
    }
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId: number, index: number) => {
    if (!note?.id) return;
    try {
      await NotesService.deleteImage(note.id, imageId);
      const updatedImages = (note.images || []).filter((_, i) => i !== index);
      setNote({ ...note, images: updatedImages });
      showSuccess("Image supprimée");
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/mobile/notes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-semibold truncate flex-1 text-center">
            {note.title || "Sans titre"}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={async () => {
                if (note?.id) {
                  const newArchived = !note.archived;
                  const success = await NotesService.archiveNote(note.id, newArchived);
                  if (success) {
                    setNote({ ...note, archived: newArchived });
                  }
                }
              }}>
                <Archive className="h-4 w-4 mr-2" />
                {note.archived ? "Désarchiver" : "Archiver"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteModal(true)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <Input
          type="text"
          placeholder="Titre de la note"
          className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
          value={note.title || ""}
          onChange={(e) => updateNote({ title: e.target.value })}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTodoModal(true)}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Tâche
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </Button>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Todos */}
        {note.todos && note.todos.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              {note.todos.map((todo, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border rounded">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleTodo(index)}
                  />
                  <span className={`flex-1 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteTodo(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Images */}
        {note.images && note.images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {note.images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={`/uploads/images/${image.filename}`}
                  alt={image.original_name}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedImage(`/uploads/images/${image.filename}`)}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7"
                  onClick={() => image.id && handleDeleteImage(image.id, index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Rich Text Editor */}
        <div className="min-h-[300px]">
          <RichTextEditor
            content={note.content || ""}
            onChange={(content) => updateNote({ content })}
          />
        </div>
      </div>

      {/* Add Todo Modal */}
      <Dialog open={addTodoModal} onOpenChange={setAddTodoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une tâche</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Texte de la tâche"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTodoModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddTodo}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la note ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <img src={selectedImage || ''} alt="Preview" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
