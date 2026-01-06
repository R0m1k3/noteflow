import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Plus, Trash2, Star, Activity } from "lucide-react";
import { Todo } from "@/services/TodosService";

interface TodosSectionProps {
    todos: Todo[];
    activeTodos: Todo[];
    completedTodos: Todo[];
    paginatedActiveTodos: Todo[];
    paginatedCompletedTodos: Todo[];
    todosActivePage: number;
    todosCompletedPage: number;
    totalActiveTodosPages: number;
    totalCompletedTodosPages: number;
    onAddTodo: () => void;
    onToggleTodo: (id: number) => void;
    onToggleTodoInProgress: (id: number) => void;
    onToggleTodoPriority: (id: number) => void;
    onDeleteTodo: (id: number) => void;
    onActivePageChange: (page: number) => void;
    onCompletedPageChange: (page: number) => void;
}

export const TodosSection = ({
    todos,
    paginatedActiveTodos,
    paginatedCompletedTodos,
    todosActivePage,
    todosCompletedPage,
    totalActiveTodosPages,
    totalCompletedTodosPages,
    onAddTodo,
    onToggleTodo,
    onToggleTodoInProgress,
    onToggleTodoPriority,
    onDeleteTodo,
    onActivePageChange,
    onCompletedPageChange
}: TodosSectionProps) => {
    const activeTodosCount = todos.filter(t => !t.completed).length;
    const completedTodosCount = todos.filter(t => t.completed).length;

    return (
        <Card className="shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CheckSquare className="h-5 w-5" />
                        Tâches
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={onAddTodo}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full mb-3">
                        <TabsTrigger value="active" className="text-xs">
                            Actives ({activeTodosCount})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs">
                            Complétées ({completedTodosCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-0">
                        <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
                            {paginatedActiveTodos.length > 0 ? (
                                paginatedActiveTodos.map(todo => (
                                    <div key={todo.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors group">
                                        <Checkbox
                                            checked={false}
                                            onCheckedChange={() => todo.id && onToggleTodo(todo.id)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm flex-1 leading-snug">
                                            {todo.text}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-7 w-7 transition-all ${todo.in_progress ? 'text-red-500 opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                                            onClick={() => todo.id && onToggleTodoInProgress(todo.id)}
                                            title={todo.in_progress ? "Marquer comme non commencé" : "Marquer comme en cours"}
                                        >
                                            <Activity className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-7 w-7 ${todo.priority ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                                            onClick={() => todo.id && onToggleTodoPriority(todo.id)}
                                            title={todo.priority ? "Retirer la priorité" : "Marquer comme prioritaire"}
                                        >
                                            <Star className={`h-3.5 w-3.5 ${todo.priority ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => todo.id && onDeleteTodo(todo.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground text-sm py-6">Aucune tâche active</p>
                            )}
                        </div>
                        {totalActiveTodosPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onActivePageChange(Math.max(0, todosActivePage - 1))}
                                    disabled={todosActivePage === 0}
                                >
                                    ‹
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {todosActivePage + 1}/{totalActiveTodosPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onActivePageChange(Math.min(totalActiveTodosPages - 1, todosActivePage + 1))}
                                    disabled={todosActivePage >= totalActiveTodosPages - 1}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="mt-0">
                        <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
                            {paginatedCompletedTodos.length > 0 ? (
                                paginatedCompletedTodos.map(todo => (
                                    <div key={todo.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors group">
                                        <Checkbox
                                            checked={true}
                                            onCheckedChange={() => todo.id && onToggleTodo(todo.id)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm flex-1 line-through text-muted-foreground leading-snug">
                                            {todo.text}
                                        </span>
                                        {todo.priority && (
                                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 opacity-50" />
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => todo.id && onDeleteTodo(todo.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground text-sm py-6">Aucune tâche complétée</p>
                            )}
                        </div>
                        {totalCompletedTodosPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onCompletedPageChange(Math.max(0, todosCompletedPage - 1))}
                                    disabled={todosCompletedPage === 0}
                                >
                                    ‹
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {todosCompletedPage + 1}/{totalCompletedTodosPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onCompletedPageChange(Math.min(totalCompletedTodosPages - 1, todosCompletedPage + 1))}
                                    disabled={todosCompletedPage >= totalCompletedTodosPages - 1}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default TodosSection;
