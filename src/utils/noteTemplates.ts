export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  content: string;
  todos?: Array<{ text: string; completed: boolean }>;
}

export const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Note vide',
    description: 'Commencer avec une page blanche',
    icon: '📄',
    category: 'Général',
    content: '',
    todos: []
  },
  {
    id: 'meeting',
    name: 'Réunion',
    description: 'Notes de réunion structurées',
    icon: '🤝',
    category: 'Travail',
    content: `<h2>Réunion - [Titre]</h2>
<p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
<p><strong>Participants:</strong> </p>
<p><strong>Objectif:</strong> </p>

<h3>Points discutés</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>Décisions</h3>
<p>• </p>

<h3>Prochaines étapes</h3>
<p>→ </p>`,
    todos: [
      { text: 'Envoyer le compte-rendu', completed: false },
      { text: 'Planifier le suivi', completed: false }
    ]
  },
  {
    id: 'daily-journal',
    name: 'Journal quotidien',
    description: 'Réflexions et gratitude du jour',
    icon: '📔',
    category: 'Personnel',
    content: `<h2>Journal - ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>

<h3>🌅 Ce matin je me sens...</h3>
<p></p>

<h3>🎯 Mes priorités aujourd'hui</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>💡 Idées et réflexions</h3>
<p></p>

<h3>🙏 Gratitude</h3>
<p>Aujourd'hui je suis reconnaissant(e) pour:</p>
<p>• </p>

<h3>🌙 Bilan de la journée</h3>
<p></p>`,
    todos: []
  },
  {
    id: 'project-planning',
    name: 'Planification de projet',
    description: 'Organiser un nouveau projet',
    icon: '🎯',
    category: 'Travail',
    content: `<h2>Projet - [Nom du projet]</h2>

<h3>📋 Vue d'ensemble</h3>
<p><strong>Objectif:</strong> </p>
<p><strong>Deadline:</strong> </p>
<p><strong>Responsable:</strong> </p>

<h3>🎯 Objectifs</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>📊 Phases du projet</h3>
<p><strong>Phase 1:</strong> Préparation</p>
<p>• </p>

<p><strong>Phase 2:</strong> Développement</p>
<p>• </p>

<p><strong>Phase 3:</strong> Finalisation</p>
<p>• </p>

<h3>👥 Équipe</h3>
<p>• </p>

<h3>⚠️ Risques identifiés</h3>
<p>• </p>

<h3>📌 Ressources nécessaires</h3>
<p>• </p>`,
    todos: [
      { text: 'Définir le scope', completed: false },
      { text: 'Assembler l\'équipe', completed: false },
      { text: 'Créer le planning', completed: false }
    ]
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Session de génération d\'idées',
    icon: '💭',
    category: 'Créativité',
    content: `<h2>💭 Brainstorming - [Sujet]</h2>

<p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
<p><strong>Question centrale:</strong> </p>

<h3>💡 Idées</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>
<p>4. </p>
<p>5. </p>

<h3>⭐ Idées à creuser</h3>
<p>• </p>

<h3>🚀 Actions possibles</h3>
<p>→ </p>

<h3>🔗 Connexions et insights</h3>
<p></p>`,
    todos: []
  },
  {
    id: 'recipe',
    name: 'Recette de cuisine',
    description: 'Noter une recette',
    icon: '👨‍🍳',
    category: 'Personnel',
    content: `<h2>🍳 Recette - [Nom du plat]</h2>

<p><strong>⏱️ Temps de préparation:</strong> </p>
<p><strong>👥 Portions:</strong> </p>
<p><strong>😋 Difficulté:</strong> Facile / Moyen / Difficile</p>

<h3>📝 Ingrédients</h3>
<p>• </p>

<h3>👨‍🍳 Préparation</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>💡 Astuces</h3>
<p>• </p>

<h3>📌 Notes</h3>
<p></p>`,
    todos: []
  },
  {
    id: 'weekly-review',
    name: 'Revue hebdomadaire',
    description: 'Bilan et planification de la semaine',
    icon: '📊',
    category: 'Productivité',
    content: `<h2>📊 Revue de la semaine</h2>
<p><strong>Semaine du:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>

<h3>✅ Accomplissements</h3>
<p>Cette semaine j'ai réussi à:</p>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>📈 Progrès</h3>
<p>• </p>

<h3>⚠️ Défis rencontrés</h3>
<p>• </p>

<h3>💡 Leçons apprises</h3>
<p>• </p>

<h3>🎯 Objectifs semaine prochaine</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>🔄 Habitudes à améliorer</h3>
<p>• </p>`,
    todos: [
      { text: 'Planifier la semaine prochaine', completed: false }
    ]
  },
  {
    id: 'bug-report',
    name: 'Rapport de bug',
    description: 'Documenter un problème technique',
    icon: '🐛',
    category: 'Développement',
    content: `<h2>🐛 Bug Report</h2>

<p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
<p><strong>Priorité:</strong> 🔴 Critique / 🟠 Haute / 🟡 Moyenne / 🟢 Basse</p>
<p><strong>Statut:</strong> Nouveau / En cours / Résolu</p>

<h3>📋 Description</h3>
<p></p>

<h3>🔄 Étapes pour reproduire</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>✅ Résultat attendu</h3>
<p></p>

<h3>❌ Résultat actuel</h3>
<p></p>

<h3>💻 Environnement</h3>
<p><strong>OS:</strong> </p>
<p><strong>Navigateur:</strong> </p>
<p><strong>Version:</strong> </p>

<h3>📌 Notes additionnelles</h3>
<p></p>

<h3>🔧 Solution proposée</h3>
<p></p>`,
    todos: [
      { text: 'Reproduire le bug', completed: false },
      { text: 'Identifier la cause', completed: false },
      { text: 'Implémenter le fix', completed: false },
      { text: 'Tester la solution', completed: false }
    ]
  },
  {
    id: 'learning-notes',
    name: 'Notes d\'apprentissage',
    description: 'Apprendre un nouveau sujet',
    icon: '📚',
    category: 'Éducation',
    content: `<h2>📚 Notes d'apprentissage - [Sujet]</h2>

<p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
<p><strong>Source:</strong> </p>

<h3>🎯 Objectifs d'apprentissage</h3>
<p>• </p>

<h3>📝 Concepts clés</h3>
<p><strong>Concept 1:</strong> </p>
<p>• </p>

<p><strong>Concept 2:</strong> </p>
<p>• </p>

<h3>💡 Exemples</h3>
<p></p>

<h3>❓ Questions</h3>
<p>• </p>

<h3>🔗 Ressources</h3>
<p>• </p>

<h3>📌 À retenir</h3>
<p>• </p>

<h3>✍️ Pratique</h3>
<p>Exercices à faire:</p>
<p>1. </p>`,
    todos: [
      { text: 'Réviser les notes', completed: false },
      { text: 'Faire les exercices', completed: false }
    ]
  },
  {
    id: 'travel-planning',
    name: 'Planification de voyage',
    description: 'Organiser un déplacement',
    icon: '✈️',
    category: 'Personnel',
    content: `<h2>✈️ Voyage - [Destination]</h2>

<p><strong>📅 Dates:</strong> du [date] au [date]</p>
<p><strong>👥 Voyageurs:</strong> </p>
<p><strong>💰 Budget:</strong> </p>

<h3>🎒 À emporter</h3>
<p>Vêtements:</p>
<p>• </p>

<p>Documents:</p>
<p>• Passeport</p>
<p>• Billets</p>
<p>• Assurance</p>

<h3>🏨 Hébergement</h3>
<p><strong>Hôtel/Airbnb:</strong> </p>
<p><strong>Adresse:</strong> </p>
<p><strong>Check-in:</strong> </p>

<h3>✈️ Transport</h3>
<p><strong>Vol aller:</strong> </p>
<p><strong>Vol retour:</strong> </p>

<h3>📍 Lieux à visiter</h3>
<p>1. </p>
<p>2. </p>
<p>3. </p>

<h3>🍽️ Restaurants recommandés</h3>
<p>• </p>

<h3>💡 Conseils et infos pratiques</h3>
<p>• </p>`,
    todos: [
      { text: 'Réserver les vols', completed: false },
      { text: 'Réserver l\'hébergement', completed: false },
      { text: 'Faire la valise', completed: false }
    ]
  }
];

export function getTemplatesByCategory(): Map<string, NoteTemplate[]> {
  const categorized = new Map<string, NoteTemplate[]>();

  DEFAULT_TEMPLATES.forEach(template => {
    const category = template.category;
    if (!categorized.has(category)) {
      categorized.set(category, []);
    }
    categorized.get(category)!.push(template);
  });

  return categorized;
}

export function getTemplateById(id: string): NoteTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === id);
}

export function searchTemplates(query: string): NoteTemplate[] {
  const lowerQuery = query.toLowerCase();
  return DEFAULT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.category.toLowerCase().includes(lowerQuery)
  );
}
