import { Note } from "@/services/NotesService";

// Common French stop words to filter out
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais', 'donc',
  'or', 'ni', 'car', 'est', 'sont', 'être', 'avoir', 'a', 'dans', 'sur', 'pour',
  'par', 'avec', 'sans', 'sous', 'vers', 'chez', 'depuis', 'pendant', 'avant',
  'après', 'entre', 'parmi', 'selon', 'dont', 'que', 'qui', 'quoi', 'où', 'quand',
  'comment', 'pourquoi', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma',
  'ta', 'sa', 'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'me', 'te', 'se',
  'lui', 'leur', 'y', 'en', 'ne', 'pas', 'plus', 'moins', 'très', 'trop', 'assez',
  'beaucoup', 'peu', 'bien', 'mal', 'tout', 'toute', 'tous', 'toutes', 'même',
  'autre', 'autres', 'tel', 'telle', 'quel', 'quelle', 'quelque', 'plusieurs',
  'chaque', 'aucun', 'aucune', 'nul', 'nulle', 'certain', 'certaine'
]);

// Category keywords for auto-tagging
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'travail': ['réunion', 'projet', 'équipe', 'client', 'présentation', 'deadline', 'objectif', 'tâche', 'mission', 'entreprise', 'bureau', 'collègue', 'manager'],
  'personnel': ['maison', 'famille', 'ami', 'vacances', 'loisir', 'hobby', 'détente', 'week-end', 'anniversaire', 'fête'],
  'développement': ['code', 'bug', 'feature', 'api', 'database', 'frontend', 'backend', 'git', 'deploy', 'test', 'debug', 'javascript', 'python', 'react', 'node'],
  'design': ['ui', 'ux', 'interface', 'maquette', 'prototype', 'couleur', 'police', 'layout', 'wireframe', 'mockup', 'figma', 'sketch'],
  'finance': ['budget', 'dépense', 'économie', 'investissement', 'facture', 'paiement', 'compte', 'banque', 'argent', 'revenu'],
  'santé': ['sport', 'exercice', 'nutrition', 'médecin', 'santé', 'bien-être', 'fitness', 'régime', 'yoga', 'course'],
  'formation': ['cours', 'apprentissage', 'étude', 'formation', 'certifica', 'examen', 'leçon', 'tutoriel', 'documentation', 'lecture'],
  'idée': ['brainstorming', 'innovation', 'créativité', 'concept', 'inspiration', 'réflexion', 'hypothèse', 'proposition'],
  'urgent': ['urgent', 'important', 'prioritaire', 'asap', 'deadline', 'critique', 'essentiel'],
  'meeting': ['réunion', 'rendez-vous', 'appel', 'visio', 'conférence', 'présentation', 'démonstration']
};

/**
 * Extract keywords from text content
 */
export function extractKeywords(text: string, limit = 10): string[] {
  if (!text) return [];

  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, ' ');

  // Convert to lowercase and split into words
  const words = cleanText
    .toLowerCase()
    .replace(/[^\w\sàâäæçéèêëïîôùûüÿœ]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3) // Min 4 chars
    .filter(word => !FRENCH_STOP_WORDS.has(word));

  // Count word frequency
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  // Sort by frequency and take top N
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Suggest category tags based on content
 */
export function suggestCategoryTags(text: string): string[] {
  if (!text) return [];

  const cleanText = text.toLowerCase().replace(/<[^>]*>/g, ' ');
  const suggestions: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if any category keyword appears in the text
    const matches = keywords.filter(keyword =>
      cleanText.includes(keyword.toLowerCase())
    );

    // If multiple matches, suggest this category
    if (matches.length >= 2) {
      suggestions.push(category);
    }
  }

  return suggestions;
}

/**
 * Suggest tags based on existing tags from similar notes
 */
export function suggestFromSimilarNotes(
  currentNote: Note,
  allNotes: Note[],
  limit = 5
): string[] {
  if (!currentNote.title && !currentNote.content) return [];

  const currentKeywords = extractKeywords(
    `${currentNote.title || ''} ${currentNote.content || ''}`,
    15
  );

  if (currentKeywords.length === 0) return [];

  // Find notes with similar keywords
  const noteSimilarity = allNotes
    .filter(note => note.id !== currentNote.id && note.tags && note.tags.length > 0)
    .map(note => {
      const noteKeywords = extractKeywords(
        `${note.title || ''} ${note.content || ''}`,
        15
      );

      // Calculate similarity (common keywords / total unique keywords)
      const commonKeywords = currentKeywords.filter(kw =>
        noteKeywords.includes(kw)
      ).length;

      const totalKeywords = new Set([...currentKeywords, ...noteKeywords]).size;
      const similarity = totalKeywords > 0 ? commonKeywords / totalKeywords : 0;

      return {
        note,
        similarity
      };
    })
    .filter(item => item.similarity > 0.2) // Min 20% similarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // Top 5 similar notes

  // Extract tags from similar notes
  const tagFrequency = new Map<string, number>();
  noteSimilarity.forEach(({ note }) => {
    note.tags?.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      tagFrequency.set(tagName, (tagFrequency.get(tagName) || 0) + 1);
    });
  });

  // Sort by frequency and return top tags
  return Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Get all tag suggestions for a note
 */
export function getSmartTagSuggestions(
  note: Note,
  allNotes: Note[],
  existingTags: string[] = []
): string[] {
  const content = `${note.title || ''} ${note.content || ''}`;

  // Get category suggestions
  const categoryTags = suggestCategoryTags(content);

  // Get suggestions from similar notes
  const similarNoteTags = suggestFromSimilarNotes(note, allNotes);

  // Get keyword-based suggestions
  const keywords = extractKeywords(content, 5);

  // Combine all suggestions
  const allSuggestions = [
    ...categoryTags,
    ...similarNoteTags,
    ...keywords
  ];

  // Filter out existing tags and duplicates
  const existingTagsLower = existingTags.map(t => t.toLowerCase());
  const uniqueSuggestions = Array.from(
    new Set(allSuggestions.map(t => t.toLowerCase()))
  ).filter(tag => !existingTagsLower.includes(tag));

  // Return top 8 suggestions
  return uniqueSuggestions.slice(0, 8);
}
