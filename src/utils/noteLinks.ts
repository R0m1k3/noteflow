import { Note } from "@/services/NotesService";

/**
 * Pattern to match wiki-style links: [[Note Title]]
 */
const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

/**
 * Extract all note links from content
 */
export function extractNoteLinks(content: string): string[] {
  if (!content) return [];

  const matches = content.matchAll(WIKI_LINK_PATTERN);
  const links: string[] = [];

  for (const match of matches) {
    if (match[1]) {
      links.push(match[1].trim());
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Find notes that match the given link text
 */
export function findLinkedNotes(linkText: string, allNotes: Note[]): Note[] {
  const searchText = linkText.toLowerCase().trim();

  return allNotes.filter(note => {
    if (!note.title) return false;
    return note.title.toLowerCase().includes(searchText);
  });
}

/**
 * Convert wiki-style links to HTML clickable links
 */
export function convertLinksToHTML(
  content: string,
  allNotes: Note[],
  onLinkClick: (noteId: number) => void
): string {
  if (!content) return '';

  return content.replace(WIKI_LINK_PATTERN, (match, linkText) => {
    const trimmedText = linkText.trim();
    const matchedNotes = findLinkedNotes(trimmedText, allNotes);

    if (matchedNotes.length > 0) {
      // Found matching note - create clickable link
      const note = matchedNotes[0];
      return `<a
        href="#"
        class="note-link"
        data-note-id="${note.id}"
        style="color: #3b82f6; text-decoration: underline; cursor: pointer;"
        title="Ouvrir: ${note.title}"
      >${trimmedText}</a>`;
    } else {
      // No matching note - show as grayed out
      return `<span
        class="note-link-broken"
        style="color: #9ca3af; text-decoration: line-through;"
        title="Note introuvable: ${trimmedText}"
      >[[${trimmedText}]]</span>`;
    }
  });
}

/**
 * Get backlinks for a note (notes that link to this one)
 */
export function getBacklinks(note: Note, allNotes: Note[]): Note[] {
  if (!note.title) return [];

  const backlinks: Note[] = [];
  const noteTitle = note.title.toLowerCase();

  for (const otherNote of allNotes) {
    if (otherNote.id === note.id || !otherNote.content) continue;

    const links = extractNoteLinks(otherNote.content);
    const hasLink = links.some(link =>
      link.toLowerCase().includes(noteTitle) ||
      noteTitle.includes(link.toLowerCase())
    );

    if (hasLink) {
      backlinks.push(otherNote);
    }
  }

  return backlinks;
}

/**
 * Suggest note titles for autocomplete when typing [[
 */
export function suggestNoteTitles(
  partialText: string,
  allNotes: Note[],
  limit = 10
): Note[] {
  if (!partialText) {
    // Return recent notes when no search text
    return allNotes
      .filter(note => note.title && !note.archived)
      .sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      )
      .slice(0, limit);
  }

  const searchText = partialText.toLowerCase().trim();

  // Find notes matching the partial text
  const matches = allNotes
    .filter(note => {
      if (!note.title || note.archived) return false;
      return note.title.toLowerCase().includes(searchText);
    })
    .sort((a, b) => {
      // Prioritize exact matches and more recent notes
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';

      const aExact = aTitle === searchText ? 1 : 0;
      const bExact = bTitle === searchText ? 1 : 0;

      if (aExact !== bExact) return bExact - aExact;

      const aStarts = aTitle.startsWith(searchText) ? 1 : 0;
      const bStarts = bTitle.startsWith(searchText) ? 1 : 0;

      if (aStarts !== bStarts) return bStarts - aStarts;

      // Fall back to recency
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });

  return matches.slice(0, limit);
}

/**
 * Parse content and detect cursor position for link autocomplete
 * Returns the partial link text if cursor is inside a [[...]] pattern
 */
export function detectLinkAtCursor(content: string, cursorPosition: number): {
  isInLink: boolean;
  linkText: string;
  startPos: number;
  endPos: number;
} | null {
  // Find all [[ positions before cursor
  const beforeCursor = content.substring(0, cursorPosition);
  const lastOpenBracket = beforeCursor.lastIndexOf('[[');

  if (lastOpenBracket === -1) {
    return null; // Not in a link
  }

  // Check if there's a closing ]] between lastOpenBracket and cursor
  const betweenBrackets = content.substring(lastOpenBracket, cursorPosition);
  if (betweenBrackets.includes(']]')) {
    return null; // Link is already closed
  }

  // Find the closing ]] after cursor (if any)
  const afterCursor = content.substring(cursorPosition);
  const nextCloseBracket = afterCursor.indexOf(']]');
  const endPos = nextCloseBracket !== -1
    ? cursorPosition + nextCloseBracket + 2
    : cursorPosition;

  // Extract the link text
  const linkText = content.substring(lastOpenBracket + 2, cursorPosition).trim();

  return {
    isInLink: true,
    linkText,
    startPos: lastOpenBracket,
    endPos
  };
}
