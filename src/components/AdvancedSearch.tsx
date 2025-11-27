import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { SlidersHorizontal, X, Calendar as CalendarIcon, Tag as TagIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface SearchFilters {
  tags: string[]; // Tag names
  dateFrom?: Date;
  dateTo?: Date;
  hasTodos?: boolean;
  hasImages?: boolean;
  hasFiles?: boolean;
  priority?: boolean;
}

export interface TagOption {
  id: number;
  name: string;
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableTags: TagOption[];
}

export function AdvancedSearch({ filters, onFiltersChange, availableTags }: AdvancedSearchProps) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);

  const hasActiveFilters = filters.tags.length > 0 ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.hasTodos !== undefined ||
    filters.hasImages !== undefined ||
    filters.hasFiles !== undefined ||
    filters.priority !== undefined;

  const clearFilters = () => {
    onFiltersChange({
      tags: [],
      dateFrom: undefined,
      dateTo: undefined,
      hasTodos: undefined,
      hasImages: undefined,
      hasFiles: undefined,
      priority: undefined
    });
  };

  const toggleTag = (tagName: string) => {
    const newTags = filters.tags.includes(tagName)
      ? filters.tags.filter(name => name !== tagName)
      : [...filters.tags, tagName];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const selectedTags = availableTags.filter(tag => filters.tags.includes(tag.name));

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtres avancés
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {filters.tags.length +
                  (filters.dateFrom ? 1 : 0) +
                  (filters.dateTo ? 1 : 0) +
                  (filters.hasTodos ? 1 : 0) +
                  (filters.hasImages ? 1 : 0) +
                  (filters.hasFiles ? 1 : 0) +
                  (filters.priority ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtres avancés</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tags</Label>
              <Popover open={tagSelectorOpen} onOpenChange={setTagSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <TagIcon className="h-4 w-4" />
                    {selectedTags.length > 0 ? (
                      <span className="text-xs">
                        {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} sélectionné{selectedTags.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sélectionner des tags</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un tag..." />
                    <CommandList>
                      <CommandEmpty>Aucun tag trouvé</CommandEmpty>
                      <CommandGroup>
                        {availableTags.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            onSelect={() => toggleTag(tag.name)}
                            className="cursor-pointer"
                          >
                            <Checkbox
                              checked={filters.tags.includes(tag.name)}
                              className="mr-2"
                            />
                            <TagIcon className="h-3 w-3 mr-2" />
                            {tag.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs gap-1">
                      {tag.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleTag(tag.name)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Période</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover open={datePickerOpen === 'from'} onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start text-xs">
                      <CalendarIcon className="h-3 w-3 mr-2" />
                      {filters.dateFrom ? filters.dateFrom.toLocaleDateString('fr-FR') : 'Du'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => {
                        onFiltersChange({ ...filters, dateFrom: date });
                        setDatePickerOpen(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={datePickerOpen === 'to'} onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start text-xs">
                      <CalendarIcon className="h-3 w-3 mr-2" />
                      {filters.dateTo ? filters.dateTo.toLocaleDateString('fr-FR') : 'Au'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => {
                        onFiltersChange({ ...filters, dateTo: date });
                        setDatePickerOpen(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Effacer les dates
                </Button>
              )}
            </div>

            {/* Content Type Filters */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Contenu</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasTodos"
                    checked={filters.hasTodos === true}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, hasTodos: checked ? true : undefined })
                    }
                  />
                  <label htmlFor="hasTodos" className="text-xs cursor-pointer">
                    Avec des tâches
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasImages"
                    checked={filters.hasImages === true}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, hasImages: checked ? true : undefined })
                    }
                  />
                  <label htmlFor="hasImages" className="text-xs cursor-pointer">
                    Avec des images
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasFiles"
                    checked={filters.hasFiles === true}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, hasFiles: checked ? true : undefined })
                    }
                  />
                  <label htmlFor="hasFiles" className="text-xs cursor-pointer">
                    Avec des fichiers
                  </label>
                </div>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="priority"
                  checked={filters.priority === true}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, priority: checked ? true : undefined })
                  }
                />
                <label htmlFor="priority" className="text-xs cursor-pointer font-medium">
                  Notes prioritaires uniquement
                </label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
          <X className="h-3 w-3" />
          Effacer
        </Button>
      )}
    </div>
  );
}
