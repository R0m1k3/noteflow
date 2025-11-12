// Script pour corriger les paramètres Google Calendar
const { getAll, runQuery } = require('./config/database');

async function fixGoogleSettings() {
  console.log('🔍 Vérification des paramètres Google Calendar...\n');

  // Lire tous les paramètres Google
  const googleSettings = await getAll("SELECT key, value FROM settings WHERE key LIKE 'google%'");

  console.log('📋 Paramètres actuels :');
  googleSettings.forEach(setting => {
    let displayValue = setting.value;
    // Masquer les secrets
    if (setting.key.includes('secret') || setting.key.includes('key')) {
      displayValue = setting.value ? '***MASQUÉ***' : 'NULL';
    }
    console.log(`  ${setting.key}: ${displayValue}`);
  });

  // Vérifier le type d'authentification
  const authType = googleSettings.find(s => s.key === 'google_auth_type');
  console.log(`\n🔐 Type d'authentification actuel: ${authType?.value || 'NON DÉFINI'}`);

  // Forcer OAuth2
  console.log('\n✏️  Changement du type d\'authentification vers OAuth2...');
  await runQuery(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('google_auth_type', 'oauth2')",
    []
  );

  console.log('✅ Type d\'authentification changé vers OAuth2');

  // Vérifier à nouveau
  const newAuthType = await getAll("SELECT value FROM settings WHERE key = 'google_auth_type'");
  console.log(`\n✅ Nouveau type: ${newAuthType[0]?.value}`);

  console.log('\n🎉 Terminé ! Redémarrez votre application et réessayez.');
  process.exit(0);
}

fixGoogleSettings().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
