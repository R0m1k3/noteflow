import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, RefreshCw, Edit, ExternalLink } from "lucide-react";
import { CalendarEvent } from "@/services/CalendarService";
import CalendarService from "@/services/CalendarService";
import { showError, showSuccess } from "@/utils/toast";

interface CalendarSectionProps {
    calendarEvents: CalendarEvent[];
    paginatedCalendarEvents: CalendarEvent[];
    calendarPage: number;
    totalCalendarPages: number;
    onAddEvent: () => void;
    onEditEvent: (event: CalendarEvent) => void;
    onPageChange: (page: number) => void;
    onShowAdmin: () => void;
    loadCalendarEvents: () => Promise<void>;
}

export const CalendarSection = ({
    calendarEvents,
    paginatedCalendarEvents,
    calendarPage,
    totalCalendarPages,
    onAddEvent,
    onEditEvent,
    onPageChange,
    onShowAdmin,
    loadCalendarEvents
}: CalendarSectionProps) => {

    const handleSync = async () => {
        try {
            const result = await CalendarService.sync();
            showSuccess(`${result.syncedCount} événements synchronisés`);
            await loadCalendarEvents();
        } catch (error) {
            showError("Erreur lors de la synchronisation");
        }
    };

    return (
        <Card className="shadow-lg">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6" />
                        Rendez-vous
                    </CardTitle>
                    <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={onAddEvent}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleSync}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                    {calendarEvents.length > 0 ? (
                        paginatedCalendarEvents.map(event => {
                            const startDate = new Date(event.start_time);
                            const endDate = new Date(event.end_time);
                            const isToday = startDate.toDateString() === new Date().toDateString();
                            const isSoon = startDate.getTime() - new Date().getTime() < 30 * 60 * 1000 && startDate > new Date();

                            // Détecter les événements "toute la journée"
                            const isAllDay = event.all_day ||
                                (startDate.getHours() === 0 && startDate.getMinutes() === 0) ||
                                (startDate.getHours() === 1 && startDate.getMinutes() === 0 && endDate.getHours() === 1);

                            return (
                                <div
                                    key={event.id}
                                    className={`p-3 border rounded-lg hover:bg-accent/50 transition-colors group relative ${isSoon ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                            isToday ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium line-clamp-2 text-sm">{event.title}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {isToday ? "Aujourd'hui" : startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })}
                                                {isAllDay ? ' - Toute la journée' : ` à ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`}
                                            </p>
                                            {event.location && (
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                    📍 {event.location}
                                                </p>
                                            )}
                                            {isSoon && (
                                                <Badge variant="destructive" className="mt-1 text-xs">Dans moins de 30 min</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-1 items-start">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditEvent(event);
                                                }}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <ExternalLink
                                                className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1 cursor-pointer"
                                                onClick={() => event.html_link && window.open(event.html_link, '_blank')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                            Aucun rendez-vous à venir
                            <br />
                            <Button
                                variant="link"
                                className="mt-2 text-xs"
                                onClick={onShowAdmin}
                            >
                                Configurer Google Calendar
                            </Button>
                        </p>
                    )}
                </div>
                {totalCalendarPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(Math.max(0, calendarPage - 1))}
                            disabled={calendarPage === 0}
                        >
                            ‹
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {calendarPage + 1}/{totalCalendarPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(Math.min(totalCalendarPages - 1, calendarPage + 1))}
                            disabled={calendarPage === totalCalendarPages - 1}
                        >
                            ›
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CalendarSection;
