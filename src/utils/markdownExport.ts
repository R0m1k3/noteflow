import { Note } from "@/services/NotesService";
import { Todo } from "@/services/TodosService";

/**
 * Convertit le contenu HTML d'une note en Markdown
 */
function htmlToMarkdown(html: string): string {
  let markdown = html;

  // Enlever les balises HTML simples et les convertir en Markdown
  markdown = markdown
    // Headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
    // Lists
    .replace(/<ul[^>]*>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol[^>]*>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
    // Paragraphs and breaks
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/g, '```\n$1\n```')
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

/**
 * Exporte une note au format Markdown
 */
export function exportNoteAsMarkdown(note: Note): string {
  let markdown = '';

  // Title
  markdown += `# ${note.title || 'Sans titre'}\n\n`;

  // Metadata
  if (note.created_at) {
    const date = new Date(note.created_at);
    markdown += `*Créée le: ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR')}*\n\n`;
  }

  // Tags
  if (note.tags && note.tags.length > 0) {
    markdown += `**Tags:** ${note.tags.map(tag => `#${tag.name}`).join(', ')}\n\n`;
  }

  // Priority
  if (note.priority) {
    markdown += `⭐ **Prioritaire**\n\n`;
  }

  // Separator
  markdown += '---\n\n';

  // Content
  if (note.content) {
    markdown += htmlToMarkdown(note.content);
    markdown += '\n\n';
  }

  // Todos
  if (note.todos && note.todos.length > 0) {
    markdown += '## Tâches\n\n';
    note.todos.forEach(todo => {
      const checkbox = todo.completed ? '[x]' : '[ ]';
      markdown += `- ${checkbox} ${todo.text}\n`;
    });
    markdown += '\n';
  }

  // Images
  if (note.images && note.images.length > 0) {
    markdown += '## Images\n\n';
    note.images.forEach(image => {
      markdown += `![${image.original_name || 'Image'}](/uploads/images/${image.filename})\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

/**
 * Télécharge une note au format Markdown
 */
export function downloadNoteAsMarkdown(note: Note): void {
  const markdown = exportNoteAsMarkdown(note);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${note.title || 'note'}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte toutes les notes au format Markdown (un fichier par note dans un zip)
 */
export function exportAllNotesAsMarkdown(notes: Note[]): string {
  let combined = `# Mes Notes\n\n`;
  combined += `*Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}*\n\n`;
  combined += `---\n\n`;

  notes.forEach((note, index) => {
    if (index > 0) {
      combined += `\n\n---\n\n`;
    }
    combined += exportNoteAsMarkdown(note);
  });

  return combined;
}

/**
 * Télécharge toutes les notes dans un fichier Markdown
 */
export function downloadAllNotesAsMarkdown(notes: Note[]): void {
  const markdown = exportAllNotesAsMarkdown(notes);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `noteflow-export-${new Date().toISOString().split('T')[0]}.md`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte un todo au format Markdown
 */
export function exportTodoAsMarkdown(todo: Todo): string {
  const checkbox = todo.completed ? '[x]' : '[ ]';
  let markdown = `- ${checkbox} ${todo.text}`;

  if (todo.priority) {
    markdown += ' ⭐';
  }

  if (todo.in_progress) {
    markdown += ' 🔄';
  }

  return markdown;
}

/**
 * Exporte tous les todos au format Markdown
 */
export function exportTodosAsMarkdown(todos: Todo[]): string {
  let markdown = '# Mes Tâches\n\n';
  markdown += `*Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}*\n\n`;

  // Tâches prioritaires
  const priorityTodos = todos.filter(t => t.priority && !t.completed);
  if (priorityTodos.length > 0) {
    markdown += '## ⭐ Prioritaires\n\n';
    priorityTodos.forEach(todo => {
      markdown += exportTodoAsMarkdown(todo) + '\n';
    });
    markdown += '\n';
  }

  // Tâches en cours
  const inProgressTodos = todos.filter(t => t.in_progress && !t.completed);
  if (inProgressTodos.length > 0) {
    markdown += '## 🔄 En cours\n\n';
    inProgressTodos.forEach(todo => {
      markdown += exportTodoAsMarkdown(todo) + '\n';
    });
    markdown += '\n';
  }

  // Tâches en attente
  const pendingTodos = todos.filter(t => !t.completed && !t.priority && !t.in_progress);
  if (pendingTodos.length > 0) {
    markdown += '## 📋 En attente\n\n';
    pendingTodos.forEach(todo => {
      markdown += exportTodoAsMarkdown(todo) + '\n';
    });
    markdown += '\n';
  }

  // Tâches terminées
  const completedTodos = todos.filter(t => t.completed);
  if (completedTodos.length > 0) {
    markdown += '## ✅ Terminées\n\n';
    completedTodos.forEach(todo => {
      markdown += exportTodoAsMarkdown(todo) + '\n';
    });
  }

  return markdown;
}

/**
 * Télécharge tous les todos au format Markdown
 */
export function downloadTodosAsMarkdown(todos: Todo[]): void {
  const markdown = exportTodosAsMarkdown(todos);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `noteflow-todos-${new Date().toISOString().split('T')[0]}.md`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
