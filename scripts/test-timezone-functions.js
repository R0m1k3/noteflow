// Test des fonctions de conversion timezone
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST DES FONCTIONS DE TIMEZONE');
console.log('═══════════════════════════════════════════════════════════\n');

// Fonction toParisISO
function toParisISO(localDateTimeString) {
  // Input: "2024-11-16T14:30" signifie 14:30 à Paris
  // Output: ISO UTC correspondant (ex: "2024-11-16T13:30:00.000Z" en hiver)

  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Déterminer l'offset de Europe/Paris pour cette date spécifique
  // (pour gérer automatiquement l'heure d'été/hiver)

  // Créer une date test en UTC à midi
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Formater cette date en Europe/Paris
  const parisHour = parseInt(testDate.toLocaleString('en-US', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false
  }));

  // Calculer l'offset (normalement +1 en hiver, +2 en été)
  const offset = parisHour - 12;
  const offsetString = offset === 1 ? '+01:00' : '+02:00';

  // Construire l'ISO string avec le timezone de Paris
  const isoWithTZ = `${datePart}T${timePart.padEnd(5, '0')}:00${offsetString}`;

  // Créer la date (JavaScript va automatiquement convertir en UTC)
  return new Date(isoWithTZ).toISOString();
}

// Fonction toLocalDateTimeString
function toLocalDateTimeString(date) {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Formater en heure Europe/Paris
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

// Test 1: Date en hiver (novembre - UTC+1)
console.log('Test 1: Date en hiver (16 novembre 2024, 14:30 à Paris)');
const winterInput = '2024-11-16T14:30';
const winterISO = toParisISO(winterInput);
console.log('  Input (datetime-local):', winterInput);
console.log('  Output (ISO UTC):', winterISO);

const winterDate = new Date(winterISO);
const winterParis = winterDate.toLocaleString('fr-FR', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
console.log('  Vérification (affichage Paris):', winterParis);
console.log('  ✓ Devrait être: 16/11/2024, 14:30:00');
console.log('');

// Test 2: Date en été (juillet - UTC+2)
console.log('Test 2: Date en été (15 juillet 2024, 14:30 à Paris)');
const summerInput = '2024-07-15T14:30';
const summerISO = toParisISO(summerInput);
console.log('  Input (datetime-local):', summerInput);
console.log('  Output (ISO UTC):', summerISO);

const summerDate = new Date(summerISO);
const summerParis = summerDate.toLocaleString('fr-FR', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
console.log('  Vérification (affichage Paris):', summerParis);
console.log('  ✓ Devrait être: 15/07/2024, 14:30:00');
console.log('');

// Test 3: Round-trip (toParisISO puis toLocalDateTimeString)
console.log('Test 3: Round-trip (conversion aller-retour)');
const originalInput = '2024-11-16T14:30';
console.log('  Original:', originalInput);

const iso = toParisISO(originalInput);
console.log('  → ISO:', iso);

const backToLocal = toLocalDateTimeString(iso);
console.log('  → Back to local:', backToLocal);

if (originalInput === backToLocal) {
  console.log('  ✅ SUCCÈS: Round-trip conserve la valeur');
} else {
  console.log('  ❌ ÉCHEC: Round-trip ne conserve pas la valeur');
  console.log('     Attendu:', originalInput);
  console.log('     Obtenu:', backToLocal);
}
console.log('');

// Test 4: toLocalDateTimeString avec une date ISO UTC
console.log('Test 4: toLocalDateTimeString avec ISO UTC');
const utcISO = '2024-11-16T13:30:00.000Z'; // 13:30 UTC = 14:30 Paris (hiver)
const localResult = toLocalDateTimeString(utcISO);
console.log('  Input (ISO UTC):', utcISO);
console.log('  Output (datetime-local):', localResult);
console.log('  ✓ Devrait être: 2024-11-16T14:30');
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Tests terminés');
console.log('═══════════════════════════════════════════════════════════');
