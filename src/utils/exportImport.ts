import { Note } from "@/services/NotesService";
import { Todo } from "@/services/TodosService";

export interface BackupData {
  version: string;
  exportDate: string;
  notes: Note[];
  globalTodos: Todo[];
  settings?: Record<string, any>;
}

/**
 * Export all app data to JSON
 */
export async function exportToJSON(
  notes: Note[],
  globalTodos: Todo[],
  settings?: Record<string, any>
): Promise<string> {
  const backup: BackupData = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    notes,
    globalTodos,
    settings
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(jsonData: string, filename?: string): void {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = filename || `noteflow-backup-${timestamp}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Parse and validate backup JSON
 */
export function parseBackupJSON(jsonString: string): BackupData | null {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.version || !data.exportDate || !Array.isArray(data.notes)) {
      throw new Error('Format de backup invalide');
    }

    return data as BackupData;
  } catch (error) {
    console.error('Error parsing backup:', error);
    return null;
  }
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsText(file);
  });
}

/**
 * Export notes to CSV format
 */
export function exportNotesToCSV(notes: Note[]): string {
  const headers = ['ID', 'Title', 'Created', 'Updated', 'Archived', 'Priority', 'Tags', 'Todos Count'];

  const rows = notes.map(note => [
    note.id || '',
    `"${(note.title || '').replace(/"/g, '""')}"`,
    note.created_at || '',
    note.updated_at || '',
    note.archived ? 'Yes' : 'No',
    note.priority ? 'Yes' : 'No',
    `"${(note.tags || []).map(t => t.name).join(', ')}"`,
    (note.todos || []).length
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvData: string, filename?: string): void {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = filename || `noteflow-export-${timestamp}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get backup statistics
 */
export function getBackupStats(backup: BackupData): {
  notesCount: number;
  todosCount: number;
  tagsCount: number;
  imagesCount: number;
  filesCount: number;
} {
  const allTags = new Set<string>();
  let imagesCount = 0;
  let filesCount = 0;

  backup.notes.forEach(note => {
    note.tags?.forEach(tag => allTags.add(tag.name));
    imagesCount += (note.images?.length || 0);
    filesCount += (note.files?.length || 0);
  });

  return {
    notesCount: backup.notes.length,
    todosCount: backup.globalTodos?.length || 0,
    tagsCount: allTags.size,
    imagesCount,
    filesCount
  };
}
