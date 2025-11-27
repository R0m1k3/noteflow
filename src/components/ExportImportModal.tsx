import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Note } from "@/services/NotesService";
import { Todo } from "@/services/TodosService";
import {
  exportToJSON,
  downloadBackup,
  downloadCSV,
  exportNotesToCSV,
  parseBackupJSON,
  readFileAsText,
  getBackupStats,
  type BackupData
} from "@/utils/exportImport";
import { showSuccess, showError } from "@/utils/toast";

interface ExportImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  todos: Todo[];
  settings?: Record<string, any>;
  onImport?: (backup: BackupData) => Promise<void>;
}

export function ExportImportModal({
  open,
  onOpenChange,
  notes,
  todos,
  settings,
  onImport
}: ExportImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);

  const handleExportJSON = async () => {
    try {
      const jsonData = await exportToJSON(notes, todos, settings);
      downloadBackup(jsonData);
      showSuccess('Backup exporté avec succès');
    } catch (error) {
      showError('Erreur lors de l\'export');
    }
  };

  const handleExportCSV = () => {
    try {
      const csvData = exportNotesToCSV(notes);
      downloadCSV(csvData);
      showSuccess('CSV exporté avec succès');
    } catch (error) {
      showError('Erreur lors de l\'export CSV');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const content = await readFileAsText(file);
      const backup = parseBackupJSON(content);

      if (backup) {
        setPreviewData(backup);
      } else {
        showError('Fichier de backup invalide');
        setImportFile(null);
      }
    } catch (error) {
      showError('Erreur lors de la lecture du fichier');
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (!previewData || !onImport) return;

    setImporting(true);
    try {
      await onImport(previewData);
      showSuccess('Données importées avec succès');
      setImportFile(null);
      setPreviewData(null);
      onOpenChange(false);
    } catch (error) {
      showError('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const stats = notes.length > 0 ? {
    notesCount: notes.length,
    archivedCount: notes.filter(n => n.archived).length,
    priorityCount: notes.filter(n => n.priority).length,
    todosCount: todos.length,
    tagsCount: new Set(notes.flatMap(n => n.tags?.map(t => t.name) || [])).size
  } : null;

  const previewStats = previewData ? getBackupStats(previewData) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export / Import</DialogTitle>
          <DialogDescription>
            Exportez ou importez toutes vos données
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            {/* Current Data Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{stats.notesCount}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{stats.todosCount}</div>
                  <div className="text-xs text-muted-foreground">Tâches</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{stats.tagsCount}</div>
                  <div className="text-xs text-muted-foreground">Tags</div>
                </div>
              </div>
            )}

            {/* Export Options */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium mb-2 block">Format JSON (Backup complet)</Label>
                <Button onClick={handleExportJSON} className="w-full" variant="outline">
                  <FileJson className="h-4 w-4 mr-2" />
                  Exporter en JSON
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Inclut toutes les notes, tâches, tags, et paramètres
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Format CSV (Notes uniquement)</Label>
                <Button onClick={handleExportCSV} className="w-full" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter en CSV
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Tableau des notes pour Excel ou Google Sheets
                </p>
              </div>
            </div>

            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Les fichiers seront téléchargés dans votre dossier de téléchargements
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="import-file" className="text-sm font-medium mb-2 block">
                Sélectionner un fichier de backup (JSON)
              </Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
              />
            </div>

            {/* Preview */}
            {previewData && previewStats && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Backup valide</span>
                  <Badge variant="outline">{previewData.version}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-xl font-bold">{previewStats.notesCount}</div>
                    <div className="text-xs text-muted-foreground">Notes</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xl font-bold">{previewStats.todosCount}</div>
                    <div className="text-xs text-muted-foreground">Tâches</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xl font-bold">{previewStats.tagsCount}</div>
                    <div className="text-xs text-muted-foreground">Tags</div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Créé le {new Date(previewData.exportDate).toLocaleDateString('fr-FR')}
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleImport}
                  disabled={importing || !onImport}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Import en cours...' : 'Importer les données'}
                </Button>

                {!onImport && (
                  <p className="text-xs text-muted-foreground text-center">
                    La fonction d'import n'est pas disponible
                  </p>
                )}
              </div>
            )}

            {!previewData && !importFile && (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sélectionnez un fichier de backup pour commencer</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
