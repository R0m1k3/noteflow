import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Plus, RefreshCw, ExternalLink, Edit } from "lucide-react";
import CalendarService, { CalendarEvent } from "@/services/CalendarService";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EVENTS_PER_PAGE = 10;

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [page, setPage] = useState(0);
  const [addEventModal, setAddEventModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState<{ open: boolean; event?: CalendarEvent }>({ open: false });
  const [loading, setLoading] = useState(false);

  // Form states
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");

  const loadEvents = async () => {
    try {
      const data = await CalendarService.getEvents(100);
      const sorted = data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setEvents(sorted);
    } catch (error) {
      showError("Erreur lors du chargement des événements");
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await CalendarService.sync();
      showSuccess(`${result.syncedCount} événements synchronisés`);
      await loadEvents();
    } catch (error) {
      showError("Erreur lors de la synchronisation");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewEventTitle("");
    setNewEventDescription("");
    setNewEventLocation("");
    // Default start time: next hour
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTime = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setNewEventStart(formatDateTime(now));
    setNewEventEnd(formatDateTime(end));
  };

  useEffect(() => {
    if (addEventModal) {
      resetForm();
    }
  }, [addEventModal]);

  useEffect(() => {
    if (editEventModal.open && editEventModal.event) {
      const event = editEventModal.event;
      setNewEventTitle(event.title);
      setNewEventDescription(event.description || "");
      setNewEventLocation(event.location || "");

      const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };

      setNewEventStart(formatDateTime(event.start_time));
      setNewEventEnd(formatDateTime(event.end_time));
    }
  }, [editEventModal.open]);

  const handleCreateEvent = async () => {
    if (!newEventTitle || !newEventStart || !newEventEnd) {
      showError("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      await CalendarService.createEvent({
        title: newEventTitle,
        description: newEventDescription,
        location: newEventLocation,
        startDateTime: new Date(newEventStart).toISOString(),
        endDateTime: new Date(newEventEnd).toISOString(),
      });
      showSuccess("Événement créé avec succès");
      setAddEventModal(false);
      loadEvents();
    } catch (error) {
      showError("Erreur lors de la création de l'événement");
    }
  };

  const handleUpdateEvent = async () => {
    if (!editEventModal.event || !newEventTitle || !newEventStart || !newEventEnd) return;

    try {
      await CalendarService.updateEvent(editEventModal.event.id, {
        title: newEventTitle,
        description: newEventDescription,
        location: newEventLocation,
        startDateTime: new Date(newEventStart).toISOString(),
        endDateTime: new Date(newEventEnd).toISOString(),
      });
      showSuccess("Événement modifié avec succès");
      setEditEventModal({ open: false });
      loadEvents();
    } catch (error) {
      showError("Erreur lors de la modification de l'événement");
    }
  };

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  const paginatedEvents = events.slice(page * EVENTS_PER_PAGE, (page + 1) * EVENTS_PER_PAGE);

  return (
    <div className="p-4 pb-24">
      {/* Header Actions */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Synchroniser
        </Button>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.length > 0 ? (
          paginatedEvents.map(event => {
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            const isToday = startDate.toDateString() === new Date().toDateString();
            const isSoon = startDate.getTime() - new Date().getTime() < 30 * 60 * 1000 && startDate > new Date();
            const isAllDay = event.all_day ||
              (startDate.getHours() === 0 && startDate.getMinutes() === 0) ||
              (startDate.getHours() === 1 && startDate.getMinutes() === 0 && endDate.getHours() === 1);

            return (
              <MobileCard
                key={event.id}
                className={`${isSoon ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                    isToday ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                  >
                    <h4 className="font-medium line-clamp-2 mb-2">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {isToday ? "Aujourd'hui" : startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })}
                      {isAllDay ? ' - Toute la journée' : ` à ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`}
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        📍 {event.location}
                      </p>
                    )}
                    {isSoon && (
                      <Badge variant="destructive" className="mt-2">
                        Dans moins de 30 min
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditEventModal({ open: true, event });
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </MobileCard>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground py-16">
            <p className="mb-4">Aucun rendez-vous à venir</p>
            <Button variant="outline" onClick={() => setAddEventModal(true)}>
              Ajouter un événement
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
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
      <MobileFAB icon={Plus} onClick={() => setAddEventModal(true)} label="Ajouter un événement" />

      {/* Add Event Modal */}
      <Dialog open={addEventModal} onOpenChange={setAddEventModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                placeholder="Titre de l'événement"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input
                  type="datetime-local"
                  value={newEventStart}
                  onChange={(e) => setNewEventStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={newEventEnd}
                  onChange={(e) => setNewEventEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lieu</Label>
              <Input
                placeholder="Lieu (optionnel)"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description (optionnel)"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleCreateEvent}>
              Créer l'événement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={editEventModal.open} onOpenChange={(open) => setEditEventModal({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                placeholder="Titre de l'événement"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input
                  type="datetime-local"
                  value={newEventStart}
                  onChange={(e) => setNewEventStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={newEventEnd}
                  onChange={(e) => setNewEventEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lieu</Label>
              <Input
                placeholder="Lieu (optionnel)"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description (optionnel)"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleUpdateEvent}>
              Enregistrer les modifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
