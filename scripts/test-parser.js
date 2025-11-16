// Test du parser PostgreSQL
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST DU PARSER POSTGRESQL');
console.log('═══════════════════════════════════════════════════════════\n');

// Simuler le parser
function parseTimestampTZ(stringValue) {
  if (!stringValue) return null;

  // PostgreSQL avec timezone=UTC renvoie: "2024-11-17 09:20:00" ou "2024-11-17 09:20:00+00"
  // On doit toujours renvoyer une ISO string UTC propre avec 'Z'

  // Si déjà au format ISO avec Z ou timezone (+HH:MM ou +HH)
  if (stringValue.includes('Z') || stringValue.match(/[+-]\d{2}(:\d{2})?$/)) {
    return new Date(stringValue).toISOString();
  }

  // Si format "YYYY-MM-DD HH:MM:SS" sans timezone
  // Comme timezone=UTC, on sait que c'est en UTC
  // On ajoute 'Z' pour forcer JavaScript à l'interpréter comme UTC
  const isoString = stringValue.replace(' ', 'T') + 'Z';
  return new Date(isoString).toISOString();
}

// Test 1: Format PostgreSQL sans timezone (le plus courant)
console.log('Test 1: PostgreSQL format sans timezone');
const input1 = '2024-11-17 09:20:00';
const output1 = parseTimestampTZ(input1);
console.log('  Input:', input1);
console.log('  Output:', output1);
console.log('  ✓ Attendu: 2024-11-17T09:20:00.000Z');
console.log('  ✓ Match:', output1 === '2024-11-17T09:20:00.000Z');
console.log('');

// Test 2: Avec timezone +00
console.log('Test 2: PostgreSQL avec timezone +00');
const input2 = '2024-11-17 09:20:00+00';
const output2 = parseTimestampTZ(input2);
console.log('  Input:', input2);
console.log('  Output:', output2);
console.log('  ✓ Attendu: 2024-11-17T09:20:00.000Z');
console.log('');

// Test 3: Déjà en ISO avec Z
console.log('Test 3: Déjà en ISO UTC');
const input3 = '2024-11-17T09:20:00Z';
const output3 = parseTimestampTZ(input3);
console.log('  Input:', input3);
console.log('  Output:', output3);
console.log('  ✓ Attendu: 2024-11-17T09:20:00.000Z');
console.log('');

// Test 4: Affichage frontend
console.log('Test 4: Affichage frontend avec toLocaleTimeString');
const parsed = parseTimestampTZ('2024-11-17 09:20:00');
const date = new Date(parsed);
const parisTime = date.toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris'
});
console.log('  Input PostgreSQL: 2024-11-17 09:20:00 (09:20 UTC)');
console.log('  Après parser:', parsed);
console.log('  new Date():', date);
console.log('  Affiché en Paris:', parisTime);
console.log('  ✓ Attendu: 10:20 (09:20 UTC = 10:20 Paris en hiver)');
console.log('  ✓ Match:', parisTime === '10:20');
console.log('');

// Test 5: Flux complet Google → PostgreSQL → Frontend
console.log('Test 5: Flux complet Google Calendar → Frontend');
console.log('  1. Google Calendar envoie: "2024-11-17T10:20:00+01:00" (10:20 Paris)');

const googleDate = new Date('2024-11-17T10:20:00+01:00');
console.log('  2. Converti en UTC:', googleDate.toISOString(), '(09:20 UTC)');

const pgStored = '2024-11-17 09:20:00'; // Ce que PostgreSQL stocke en UTC
console.log('  3. PostgreSQL stocke:', pgStored, '(format sans Z)');

const pgParsed = parseTimestampTZ(pgStored);
console.log('  4. Parser renvoie:', pgParsed);

const frontendDate = new Date(pgParsed);
const frontendDisplay = frontendDate.toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris'
});
console.log('  5. Frontend affiche:', frontendDisplay);

if (frontendDisplay === '10:20') {
  console.log('  ✅ SUCCÈS: L\'heure affichée correspond à Google Calendar!');
} else {
  console.log('  ❌ ÉCHEC: Décalage détecté');
  console.log('     Attendu: 10:20');
  console.log('     Obtenu:', frontendDisplay);
}
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Tests terminés');
console.log('═══════════════════════════════════════════════════════════');
