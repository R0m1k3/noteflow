import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, RefreshCw, Trash2, Edit, Play } from 'lucide-react';
import { toast } from 'sonner';
import RecurringTodosService, { RecurringTodo } from '@/services/RecurringTodosService';
import { Badge } from "@/components/ui/badge";

export const RecurringTodosAdmin = () => {
    const [recurringTodos, setRecurringTodos] = useState<RecurringTodo[]>([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [editingTodo, setEditingTodo] = useState<RecurringTodo | null>(null);

    // Form state
    const [text, setText] = useState('');
    const [recurrenceType, setRecurrenceType] = useState<RecurringTodo['recurrence_type']>('weekly');
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Monday
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [priority, setPriority] = useState(false);
    const [nextOccurrence, setNextOccurrence] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadRecurringTodos();
    }, []);

    const loadRecurringTodos = async () => {
        try {
            setLoading(true);
            const data = await RecurringTodosService.getAll();
            setRecurringTodos(data);
        } catch (error) {
            toast.error("Erreur lors du chargement des tâches récurrentes");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (todo: RecurringTodo | null = null) => {
        if (todo) {
            setEditingTodo(todo);
            setText(todo.text);
            setRecurrenceType(todo.recurrence_type);
            setRecurrenceInterval(todo.recurrence_interval);
            setDayOfWeek(todo.day_of_week || 1);
            setDayOfMonth(todo.day_of_month || 1);
            setPriority(todo.priority);
            setNextOccurrence(new Date(todo.next_occurrence).toISOString().split('T')[0]);
        } else {
            setEditingTodo(null);
            setText('');
            setRecurrenceType('weekly');
            setRecurrenceInterval(1);
            setDayOfWeek(1); // Monday
            setDayOfMonth(1);
            setPriority(false);
            setNextOccurrence(new Date().toISOString().split('T')[0]);
        }
        setOpenModal(true);
    };

    const calculateNextDate = () => {
        // Basic logic to guess next date based on type if user changes type
        // Not strictly implementing full logic here, just default to today or let user pick
    };

    const handleSubmit = async () => {
        try {
            const payload: any = {
                text,
                recurrence_type: recurrenceType,
                recurrence_interval: recurrenceInterval,
                priority,
                next_occurrence: nextOccurrence
            };

            if (recurrenceType === 'weekly' || recurrenceType === 'biweekly') {
                payload.day_of_week = dayOfWeek;
            }
            if (recurrenceType === 'monthly' || recurrenceType === 'yearly') {
                payload.day_of_month = dayOfMonth;
            }

            if (editingTodo) {
                await RecurringTodosService.update(editingTodo.id!, payload);
                toast.success("Tâche récurrente modifiée");
            } else {
                await RecurringTodosService.create(payload);
                toast.success("Tâche récurrente créée");
            }
            setOpenModal(false);
            loadRecurringTodos();
        } catch (error) {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette tâche récurrente ?")) return;
        try {
            await RecurringTodosService.delete(id);
            toast.success("Tâche supprimée");
            loadRecurringTodos();
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleGenerate = async () => {
        try {
            const result = await RecurringTodosService.generateNow();
            toast.success(`${result.generated} tâche(s) générée(s)`);
            if (result.generated > 0) {
                // Also refresh recurring list to see updated next_occurrences
                loadRecurringTodos();
            }
        } catch (error) {
            toast.error("Erreur lors de la génération");
        }
    };

    const formatRecurrence = (todo: RecurringTodo) => {
        const intervalStr = todo.recurrence_interval > 1 ? `Tous les ${todo.recurrence_interval} ` : 'Chaque ';

        switch (todo.recurrence_type) {
            case 'daily': return todo.recurrence_interval > 1 ? `Tous les ${todo.recurrence_interval} jours` : 'Quotidien';
            case 'weekly': return `${todo.recurrence_interval > 1 ? intervalStr + 'semaines' : 'Hebdomadaire'} (J${todo.day_of_week})`;
            case 'biweekly': return 'Bi-mensuel (1 semaine sur 2)';
            case 'monthly': return `${todo.recurrence_interval > 1 ? intervalStr + 'mois' : 'Mensuel'} (le ${todo.day_of_month})`;
            case 'yearly': return `${todo.recurrence_interval > 1 ? intervalStr + 'ans' : 'Annuel'} (le ${todo.day_of_month})`;
            default: return todo.recurrence_type;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4" />
                    Nouvelle tâche récurrente
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={handleGenerate}>
                    <Play className="h-4 w-4" />
                    Générer maintenant (Test)
                </Button>
            </div>

            <div className="space-y-2">
                {recurringTodos.map(todo => (
                    <Card key={todo.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{todo.text}</span>
                                    {todo.priority && <Badge variant="destructive" className="text-xs px-1 py-0 h-5">Prioritaire</Badge>}
                                    {!todo.enabled && <Badge variant="secondary" className="text-xs px-1 py-0 h-5">Désactivé</Badge>}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" />
                                        {formatRecurrence(todo)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Prochaine: {new Date(todo.next_occurrence).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(todo)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(todo.id!)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {recurringTodos.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">Aucune tâche récurrente configurée</p>
                )}
            </div>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingTodo ? 'Modifier la tâche récurrente' : 'Nouvelle tâche récurrente'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="text" className="text-right">Tâche</Label>
                            <Input id="text" value={text} onChange={(e) => setText(e.target.value)} className="col-span-3" placeholder="Ex: Payer loyer" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Priorité</Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox id="priority" checked={priority} onCheckedChange={(c) => setPriority(!!c)} />
                                <label htmlFor="priority" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Haute priorité (sera marqué !)
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Fréquence</Label>
                            <Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Quotidien</SelectItem>
                                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                    <SelectItem value="biweekly">Bi-mensuel (2 sem)</SelectItem>
                                    <SelectItem value="monthly">Mensuel</SelectItem>
                                    <SelectItem value="yearly">Annuel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="interval" className="text-right">Intervalle</Label>
                            <Input id="interval" type="number" min="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))} className="col-span-3" />
                        </div>

                        {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dayOfWeek" className="text-right">Jour Sem.</Label>
                                <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Lundi</SelectItem>
                                        <SelectItem value="2">Mardi</SelectItem>
                                        <SelectItem value="3">Mercredi</SelectItem>
                                        <SelectItem value="4">Jeudi</SelectItem>
                                        <SelectItem value="5">Vendredi</SelectItem>
                                        <SelectItem value="6">Samedi</SelectItem>
                                        <SelectItem value="0">Dimanche</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {(recurrenceType === 'monthly' || recurrenceType === 'yearly') && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dayOfMonth" className="text-right">Jour Mois</Label>
                                <Input id="dayOfMonth" type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value))} className="col-span-3" />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nextDate" className="text-right">Prochaine</Label>
                            <Input id="nextDate" type="date" value={nextOccurrence} onChange={(e) => setNextOccurrence(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmit}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
