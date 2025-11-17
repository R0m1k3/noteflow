import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Plus, Trash2, CheckSquare } from "lucide-react";
import TodosService, { Todo } from "@/services/TodosService";
import { showError, showSuccess } from "@/utils/toast";

const TODOS_PER_PAGE = 15;

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [addModal, setAddModal] = useState(false);
  const [todoText, setTodoText] = useState("");

  const loadTodos = async () => {
    try {
      const data = await TodosService.getTodos();
      setTodos(data);
    } catch (error) {
      showError("Erreur lors du chargement des tâches");
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      await TodosService.toggleComplete(id);
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    } catch (error) {
      showError("Erreur lors de la modification");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await TodosService.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
      showSuccess("Tâche supprimée");
    } catch (error) {
      showError("Erreur lors de la suppression");
    }
  };

  const handleAdd = async () => {
    if (!todoText.trim()) return;
    try {
      const newTodo = await TodosService.createTodo(todoText, 'medium');
      setTodos([newTodo, ...todos]);
      setTodoText("");
      setAddModal(false);
      showSuccess("Tâche ajoutée");
    } catch (error) {
      showError("Erreur lors de la création");
    }
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const totalActivePages = Math.ceil(activeTodos.length / TODOS_PER_PAGE);
  const totalCompletedPages = Math.ceil(completedTodos.length / TODOS_PER_PAGE);

  const paginatedActive = activeTodos.slice(activePage * TODOS_PER_PAGE, (activePage + 1) * TODOS_PER_PAGE);
  const paginatedCompleted = completedTodos.slice(completedPage * TODOS_PER_PAGE, (completedPage + 1) * TODOS_PER_PAGE);

  return (
    <div className="p-4 pb-24">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="active">
            Actives ({activeTodos.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Complétées ({completedTodos.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Todos */}
        <TabsContent value="active" className="space-y-3 mt-0">
          {paginatedActive.length > 0 ? (
            paginatedActive.map(todo => (
              <MobileCard key={todo.id}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => todo.id && handleToggle(todo.id)}
                  />
                  <span className="flex-1">{todo.text}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => todo.id && handleDelete(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </MobileCard>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <CheckSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Aucune tâche active</p>
              <Button onClick={() => setAddModal(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Ajouter une tâche
              </Button>
            </div>
          )}

          {totalActivePages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePage(p => Math.max(0, p - 1))}
                disabled={activePage === 0}
              >
                ‹ Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                {activePage + 1} / {totalActivePages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePage(p => Math.min(totalActivePages - 1, p + 1))}
                disabled={activePage === totalActivePages - 1}
              >
                Suivant ›
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Completed Todos */}
        <TabsContent value="completed" className="space-y-3 mt-0">
          {paginatedCompleted.length > 0 ? (
            paginatedCompleted.map(todo => (
              <MobileCard key={todo.id}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => todo.id && handleToggle(todo.id)}
                  />
                  <span className="flex-1 line-through text-muted-foreground">
                    {todo.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => todo.id && handleDelete(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </MobileCard>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>Aucune tâche complétée</p>
            </div>
          )}

          {totalCompletedPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompletedPage(p => Math.max(0, p - 1))}
                disabled={completedPage === 0}
              >
                ‹ Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                {completedPage + 1} / {totalCompletedPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompletedPage(p => Math.min(totalCompletedPages - 1, p + 1))}
                disabled={completedPage === totalCompletedPages - 1}
              >
                Suivant ›
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <MobileFAB icon={Plus} onClick={() => setAddModal(true)} label="Ajouter une tâche" />

      {/* Add Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Texte de la tâche"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
