// Routes pour Google Calendar avec OAuth 2.0
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

// Scopes Google Calendar requis
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Types d'authentification supportés
 */
const AUTH_TYPES = {
  OAUTH2: 'oauth2',
  SERVICE_ACCOUNT: 'service_account',
  API_KEY: 'api_externe'
};

/**
 * Récupérer le type d'authentification configuré
 */
async function getAuthType() {
  const authType = await getOne("SELECT value FROM settings WHERE key = 'google_auth_type'");
  return authType?.value || AUTH_TYPES.OAUTH2; // Par défaut OAuth2
}

/**
 * Créer un client OAuth2
 * @param {string} [customRedirectUri] - URI de redirection personnalisée (optionnel)
 */
async function getOAuth2Client(customRedirectUri = null) {
  const clientId = await getOne("SELECT value FROM settings WHERE key = 'google_client_id'");
  const clientSecret = await getOne("SELECT value FROM settings WHERE key = 'google_client_secret'");

  if (!clientId || !clientId.value || !clientSecret || !clientSecret.value) {
    throw new Error('Client ID et Client Secret non configurés');
  }

  // Utiliser l'URI personnalisée si fournie, sinon utiliser l'URL de production
  const redirectUri = customRedirectUri ||
    'https://note.ffnancy.fr/api/calendar/oauth-callback';

  return new google.auth.OAuth2(
    clientId.value,
    clientSecret.value,
    redirectUri
  );
}

/**
 * Créer un client avec Service Account
 */
async function getServiceAccountClient() {
  const serviceAccountKey = await getOne("SELECT value FROM settings WHERE key = 'google_service_account_key'");

  if (!serviceAccountKey || !serviceAccountKey.value) {
    throw new Error('Clé Service Account non configurée');
  }

  try {
    const credentials = JSON.parse(serviceAccountKey.value);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES
    });

    return await auth.getClient();
  } catch (error) {
    logger.error('Erreur lors de la création du client Service Account:', error);
    throw new Error('Clé Service Account invalide');
  }
}

/**
 * Créer un client avec API Key
 */
async function getApiKeyClient() {
  const apiKey = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_api_key'");

  if (!apiKey || !apiKey.value) {
    throw new Error('Clé API non configurée');
  }

  return apiKey.value;
}

/**
 * Créer un client Google Calendar selon la méthode d'authentification
 * @param {number} userId - ID de l'utilisateur (pour OAuth2)
 */
async function getCalendarClient(userId = null) {
  const authType = await getAuthType();

  if (authType === AUTH_TYPES.SERVICE_ACCOUNT) {
    const auth = await getServiceAccountClient();
    return google.calendar({ version: 'v3', auth });
  } else if (authType === AUTH_TYPES.API_KEY) {
    const apiKey = await getApiKeyClient();
    return google.calendar({ version: 'v3', auth: apiKey });
  } else {
    // OAuth2
    if (!userId) {
      throw new Error('User ID requis pour OAuth2');
    }
    const oauth2Client = await getValidTokens(userId);
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }
}

/**
 * GET /api/calendar/force-oauth2 (TEMPORAIRE - DEBUG - SANS AUTH)
 * Forcer le type d'authentification à OAuth2
 * ATTENTION : Route sans authentification, à supprimer après utilisation
 */
router.get('/force-oauth2', async (req, res) => {
  try {
    await runQuery("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_auth_type', 'oauth2')", []);
    const check = await getOne("SELECT value FROM settings WHERE key = 'google_auth_type'");
    res.json({ success: true, auth_type: check?.value, message: 'Type changé vers OAuth2. Rechargez la page d\'administration.' });
  } catch (error) {
    logger.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/auth-url
 * Générer l'URL d'authentification OAuth
 */
router.get('/auth-url', requireAdmin, async (req, res) => {
  try {
    // Permettre de passer une URL de redirection personnalisée via query param
    const customRedirectUri = req.query.redirect_uri;
    const oauth2Client = await getOAuth2Client(customRedirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'select_account consent', // Force le choix du compte ET le prompt pour obtenir refresh_token
      state: req.user.id.toString() // Pour identifier l'utilisateur au retour
    });

    res.json({ authUrl });
  } catch (error) {
    logger.error('Erreur lors de la génération de l\'URL OAuth:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de l\'URL',
      details: error.message
    });
  }
});

/**
 * GET /api/calendar/oauth-callback
 * Callback OAuth pour récupérer les tokens
 */
router.get('/oauth-callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Code d\'autorisation manquant');
    }

    const userId = parseInt(state);
    if (!userId) {
      return res.status(400).send('État utilisateur invalide');
    }

    const oauth2Client = await getOAuth2Client();

    // Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Sauvegarder les tokens dans la base de données
    const existing = await getOne('SELECT id FROM google_oauth_tokens WHERE user_id = ?', [userId]);

    if (existing) {
      await runQuery(`
        UPDATE google_oauth_tokens
        SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
            token_type = ?, expiry_date = ?, scope = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type || 'Bearer',
        tokens.expiry_date || null,
        tokens.scope || SCOPES.join(' '),
        userId
      ]);
    } else {
      await runQuery(`
        INSERT INTO google_oauth_tokens
        (user_id, access_token, refresh_token, token_type, expiry_date, scope)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userId,
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.token_type || 'Bearer',
        tokens.expiry_date || null,
        tokens.scope || SCOPES.join(' ')
      ]);
    }

    logger.info(`Tokens OAuth sauvegardés pour l'utilisateur ${userId}`);

    // Rediriger vers l'application avec un message de succès
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'google-auth-success' }, '*');
            window.close();
          </script>
          <h1>Authentification réussie!</h1>
          <p>Vous pouvez fermer cette fenêtre et retourner à l'application.</p>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Erreur lors du callback OAuth:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Erreur d'authentification</h1>
          <p>${error.message}</p>
          <script>
            window.opener.postMessage({ type: 'google-auth-error', error: '${error.message}' }, '*');
          </script>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/calendar/auth-status
 * Vérifier si l'utilisateur est authentifié avec Google
 */
router.get('/auth-status', authenticateToken, async (req, res) => {
  try {
    const authType = await getAuthType();

    if (authType === AUTH_TYPES.SERVICE_ACCOUNT) {
      // Vérifier si la clé Service Account est configurée
      const serviceAccountKey = await getOne("SELECT value FROM settings WHERE key = 'google_service_account_key'");
      const isAuthenticated = !!serviceAccountKey?.value;

      res.json({
        authType: AUTH_TYPES.SERVICE_ACCOUNT,
        isAuthenticated,
        isExpired: false,
        needsReauth: !isAuthenticated
      });
    } else if (authType === AUTH_TYPES.API_KEY) {
      // Vérifier si la clé API est configurée
      const apiKey = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_api_key'");
      const isAuthenticated = !!apiKey?.value;

      res.json({
        authType: AUTH_TYPES.API_KEY,
        isAuthenticated,
        isExpired: false,
        needsReauth: !isAuthenticated
      });
    } else {
      // OAuth2
      const tokens = await getOne(
        'SELECT access_token, expiry_date FROM google_oauth_tokens WHERE user_id = ?',
        [req.user.id]
      );

      const isAuthenticated = !!tokens;
      const isExpired = tokens && tokens.expiry_date && tokens.expiry_date < Date.now();

      res.json({
        authType: AUTH_TYPES.OAUTH2,
        isAuthenticated,
        isExpired,
        needsReauth: !isAuthenticated || isExpired
      });
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification du statut OAuth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Récupérer et rafraîchir les tokens OAuth si nécessaire
 */
async function getValidTokens(userId) {
  const tokenData = await getOne(
    'SELECT * FROM google_oauth_tokens WHERE user_id = ?',
    [userId]
  );

  if (!tokenData) {
    throw new Error('Tokens OAuth non trouvés. Veuillez vous authentifier.');
  }

  const oauth2Client = await getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type,
    expiry_date: tokenData.expiry_date,
    scope: tokenData.scope
  });

  // Rafraîchir le token si expiré
  if (tokenData.expiry_date && tokenData.expiry_date < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Mettre à jour les tokens dans la base de données
      await runQuery(`
        UPDATE google_oauth_tokens
        SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [credentials.access_token, credentials.expiry_date, userId]);

      oauth2Client.setCredentials(credentials);
      logger.info(`Token OAuth rafraîchi pour l'utilisateur ${userId}`);
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement du token:', error);
      throw new Error('Erreur lors du rafraîchissement du token. Veuillez vous reconnecter.');
    }
  }

  return oauth2Client;
}

/**
 * GET /api/calendar/events
 * Récupérer les événements du calendrier
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const now = new Date().toISOString();

    // Récupérer les événements à venir depuis la base de données
    const events = await getAll(`
      SELECT
        id, google_event_id, title, description,
        start_time, end_time, location, html_link
      FROM calendar_events
      WHERE user_id = ? AND start_time >= ?
      ORDER BY start_time ASC
      LIMIT ?
    `, [req.user.id, now, limit]);

    res.json(events || []);
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/calendar/sync
 * Synchroniser avec Google Calendar (OAuth2, Service Account ou API Key)
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const authType = await getAuthType();
    let calendarId = 'primary'; // Par défaut : calendrier principal

    // Si Service Account, permettre de spécifier l'email du calendrier
    if (authType === AUTH_TYPES.SERVICE_ACCOUNT) {
      const calendarEmail = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_email'");
      if (calendarEmail?.value) {
        calendarId = calendarEmail.value;
      }
    }

    // Si API Key, permettre de spécifier l'ID du calendrier
    if (authType === AUTH_TYPES.API_KEY) {
      const calendarIdSetting = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_id'");
      if (calendarIdSetting?.value) {
        calendarId = calendarIdSetting.value;
      }
    }

    // Créer un client Google Calendar selon la méthode d'authentification
    const calendar = await getCalendarClient(req.user.id);

    // Récupérer les événements des 30 prochains jours
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const response = await calendar.events.list({
      calendarId, // Utilise le calendrier configuré
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    let syncedCount = 0;

    // Sauvegarder chaque événement dans la base de données
    for (const event of events) {
      const startTime = event.start.dateTime || event.start.date;
      const endTime = event.end.dateTime || event.end.date;

      // Vérifier si l'événement existe déjà
      const existing = await getOne(
        'SELECT id FROM calendar_events WHERE google_event_id = ? AND user_id = ?',
        [event.id, req.user.id]
      );

      if (existing) {
        // Mettre à jour l'événement existant
        await runQuery(`
          UPDATE calendar_events
          SET title = ?, description = ?, start_time = ?, end_time = ?,
              location = ?, html_link = ?, synced_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          event.summary || 'Sans titre',
          event.description || '',
          startTime,
          endTime,
          event.location || '',
          event.htmlLink || '',
          existing.id
        ]);
      } else {
        // Créer un nouvel événement
        await runQuery(`
          INSERT INTO calendar_events
          (google_event_id, user_id, title, description, start_time, end_time, location, html_link)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          event.id,
          req.user.id,
          event.summary || 'Sans titre',
          event.description || '',
          startTime,
          endTime,
          event.location || '',
          event.htmlLink || ''
        ]);
      }
      syncedCount++;
    }

    logger.info(`${syncedCount} événements synchronisés pour l'utilisateur ${req.user.username}`);

    res.json({
      message: 'Synchronisation réussie',
      syncedCount,
      events: events.length
    });
  } catch (error) {
    logger.error('Erreur lors de la synchronisation avec Google Calendar:', error);

    // Si l'erreur est liée à l'authentification, renvoyer un statut 401
    if (error.message.includes('authentifier') || error.message.includes('reconnecter')) {
      return res.status(401).json({
        error: error.message,
        needsReauth: true
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message
    });
  }
});

/**
 * POST /api/calendar/disconnect
 * Déconnecter Google Calendar (supprimer les tokens)
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM google_oauth_tokens WHERE user_id = ?', [req.user.id]);
    logger.info(`Tokens OAuth supprimés pour l'utilisateur ${req.user.username}`);

    res.json({ message: 'Déconnecté avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Supprimer un événement local
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await getOne(
      'SELECT id FROM calendar_events WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    await runQuery('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);

    logger.info(`Événement ${req.params.id} supprimé`);

    res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
