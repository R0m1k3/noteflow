// Routes pour Google Calendar avec OAuth 2.0
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { google } = require('googleapis');
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');
const timezoneLogger = require('../services/timezone-logger');

// Scopes Google Calendar requis (lecture ET écriture)
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// États OAuth en attente : nonce aléatoire -> { userId, expiresAt }
// Le paramètre "state" n'est plus l'identifiant utilisateur mais un nonce à usage unique
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingOAuthStates = new Map();

function purgeExpiredOAuthStates() {
  const now = Date.now();
  for (const [nonce, entry] of pendingOAuthStates) {
    if (entry.expiresAt <= now) {
      pendingOAuthStates.delete(nonce);
    }
  }
}

function createOAuthState(userId) {
  purgeExpiredOAuthStates();
  const nonce = crypto.randomBytes(32).toString('hex');
  pendingOAuthStates.set(nonce, { userId, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
  return nonce;
}

/**
 * Consommer un nonce OAuth (usage unique) et retourner l'utilisateur associé
 */
function consumeOAuthState(nonce) {
  purgeExpiredOAuthStates();
  if (typeof nonce !== 'string' || !pendingOAuthStates.has(nonce)) {
    return null;
  }
  const entry = pendingOAuthStates.get(nonce);
  pendingOAuthStates.delete(nonce);
  return entry.expiresAt > Date.now() ? entry.userId : null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envoyer la page de retour OAuth (popup) avec un script autorisé par nonce CSP
 */
function sendOAuthPopupPage(res, status, { message, title, details }) {
  const scriptNonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${scriptNonce}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
  );
  res.status(status).send(`
      <html>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(details)}</p>
          <script nonce="${scriptNonce}">
            if (window.opener) {
              window.opener.postMessage(${JSON.stringify(message).replace(/</g, '\\u003c')}, '*');
            }
            ${status === 200 ? 'window.close();' : ''}
          </script>
        </body>
      </html>
    `);
}

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
 */
async function getOAuth2Client() {
  const clientId = await getOne("SELECT value FROM settings WHERE key = 'google_client_id'");
  const clientSecret = await getOne("SELECT value FROM settings WHERE key = 'google_client_secret'");

  if (!clientId || !clientId.value || !clientSecret || !clientSecret.value) {
    throw new Error('Client ID et Client Secret non configurés');
  }

  // URL hardcodée pour note.ffnancy.fr
  const redirectUri = 'https://note.ffnancy.fr/api/calendar/oauth-callback';

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
router.get('/force-oauth2', authenticateToken, requireAdmin, async (req, res) => {
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
router.get('/auth-url', authenticateToken, async (req, res) => {
  try {
    const oauth2Client = await getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'select_account consent', // Force le choix du compte ET le prompt pour obtenir refresh_token
      state: createOAuthState(req.user.id) // Nonce à usage unique lié à l'utilisateur
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

    const userId = consumeOAuthState(state);
    if (!userId) {
      logger.warn('Callback OAuth avec un paramètre state invalide ou expiré');
      return res.status(400).send('État OAuth invalide ou expiré, veuillez relancer la connexion');
    }

    const oauth2Client = await getOAuth2Client();

    // Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Sauvegarder les tokens dans la base de données
    const existing = await getOne('SELECT id FROM google_oauth_tokens WHERE user_id = $1', [userId]);

    if (existing) {
      await runQuery(`
        UPDATE google_oauth_tokens
        SET access_token = $1, refresh_token = COALESCE($2, refresh_token),
            token_type = $3, expiry_date = $4, scope = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
      `, [
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type || 'Bearer',
        tokens.expiry_date || null,
        tokens.scope || SCOPES.join(' '),
        userId
      ]);
    } else {
      logger.info(`[CREATE OAUTH TOKEN] Ajout nouveau token OAuth - user_id: ${userId}`);
      await runQuery(`
        INSERT INTO google_oauth_tokens
        (user_id, access_token, refresh_token, token_type, expiry_date, scope)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.token_type || 'Bearer',
        tokens.expiry_date || null,
        tokens.scope || SCOPES.join(' ')
      ]);
      logger.info(`[CREATE OAUTH TOKEN] Token OAuth créé avec succès pour user_id: ${userId}`);
    }

    logger.info(`Tokens OAuth sauvegardés pour l'utilisateur ${userId}`);

    // Rediriger vers l'application avec un message de succès
    sendOAuthPopupPage(res, 200, {
      message: { type: 'google-auth-success' },
      title: 'Authentification réussie!',
      details: 'Vous pouvez fermer cette fenêtre et retourner à l\'application.'
    });
  } catch (error) {
    logger.error('Erreur lors du callback OAuth:', error);
    sendOAuthPopupPage(res, 500, {
      message: { type: 'google-auth-error', error: error.message },
      title: 'Erreur d\'authentification',
      details: error.message
    });
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
        'SELECT access_token, expiry_date FROM google_oauth_tokens WHERE user_id = $1',
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
    'SELECT * FROM google_oauth_tokens WHERE user_id = $1',
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
        SET access_token = $1, expiry_date = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
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
      WHERE user_id = $1 AND start_time >= $2
      ORDER BY start_time ASC
      LIMIT $3
    `, [req.user.id, now, limit]);

    // LOG pour chaque événement récupéré
    events.forEach(event => {
      timezoneLogger.log('GET', `📤 Envoi au frontend: "${event.title}"`, {
        start_time_DB: event.start_time,
        type: typeof event.start_time
      });

      if (event.start_time) {
        const date = new Date(event.start_time);
        timezoneLogger.log('GET', `  → Frontend recevra: ${event.start_time}`, {
          apresNewDate: date.toISOString(),
          affichageParisAttendu: date.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    res.json(events || []);
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/calendar/debug
 * Endpoint de diagnostic détaillé pour le timezone
 */
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      postgresTimezone: null,
      sampleEvent: null,
      parsing: {
        input: null,
        output: null,
        display: null
      }
    };

    // Récupérer le timezone de PostgreSQL
    const tzResult = await getOne('SHOW timezone');
    diagnostics.postgresTimezone = tzResult?.timezone || tzResult?.TimeZone;

    // Récupérer un événement pour test
    const event = await getOne(`
      SELECT
        title,
        start_time,
        pg_typeof(start_time) as type_col,
        start_time::text as start_text,
        to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_utc_formatted,
        to_char(start_time AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS') as start_paris_formatted
      FROM calendar_events
      WHERE user_id = $1
      ORDER BY start_time DESC
      LIMIT 1
    `, [req.user.id]);

    if (event) {
      diagnostics.sampleEvent = {
        title: event.title,
        type_col: event.type_col,
        start_time_raw: event.start_time,
        start_time_type: typeof event.start_time,
        start_text: event.start_text,
        start_utc_formatted: event.start_utc_formatted,
        start_paris_formatted: event.start_paris_formatted
      };

      // Test de parsing
      if (event.start_time) {
        const date = new Date(event.start_time);
        diagnostics.parsing = {
          input: event.start_time,
          inputType: typeof event.start_time,
          dateObject: date.toISOString(),
          displayUTC: date.toUTCString(),
          displayParis: date.toLocaleString('fr-FR', {
            timeZone: 'Europe/Paris',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          displayParisTime: date.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }
    }

    res.json(diagnostics);
  } catch (error) {
    logger.error('Erreur lors du diagnostic:', error);
    res.status(500).json({ error: error.message });
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
      const startTimeRaw = event.start.dateTime || event.start.date;
      const endTimeRaw = event.end.dateTime || event.end.date;
      const isAllDay = !event.start.dateTime; // Si pas de dateTime, c'est un événement toute la journée

      // Convertir en UTC pour PostgreSQL TIMESTAMP
      // PostgreSQL TIMESTAMP stocke l'heure sans fuseau horaire, donc il faut convertir en UTC avant insertion
      const startTime = isAllDay ? startTimeRaw : new Date(startTimeRaw).toISOString();
      const endTime = isAllDay ? endTimeRaw : new Date(endTimeRaw).toISOString();

      // LOG DÉTAILLÉ pour debug timezone
      timezoneLogger.log('SYNC', `📅 Événement: "${event.summary}"`, {
        googleStartBrut: event.start,
        startTimeExtrait: startTimeRaw,
        type: typeof startTimeRaw,
        isAllDay
      });

      if (startTimeRaw) {
        const testDate = new Date(startTimeRaw);
        timezoneLogger.log('SYNC', `  → Conversion: new Date("${startTimeRaw}") = ${testDate.toISOString()}`, {
          affichageParis: testDate.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
          heureParisSeule: testDate.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
        });
      }

      // Vérifier si l'événement existe déjà
      const existing = await getOne(
        'SELECT id FROM calendar_events WHERE google_event_id = $1 AND user_id = $2',
        [event.id, req.user.id]
      );

      // LOG ce qui sera inséré dans PostgreSQL
      timezoneLogger.log('SYNC', `  → Insertion dans PostgreSQL`, {
        startTimeType: typeof startTime,
        startTimeValue: startTime,
        endTimeValue: endTime,
        convertedToUTC: !isAllDay
      });

      if (existing) {
        // Mettre à jour l'événement existant
        await runQuery(`
          UPDATE calendar_events
          SET title = $1, description = $2, start_time = $3, end_time = $4,
              location = $5, html_link = $6, all_day = $7, synced_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [
          event.summary || 'Sans titre',
          event.description || '',
          startTime,
          endTime,
          event.location || '',
          event.htmlLink || '',
          isAllDay,
          existing.id
        ]);
      } else {
        // Créer un nouvel événement
        logger.info(`[CREATE CALENDAR EVENT] Ajout événement - event_id: "${event.id}", title: "${event.summary || 'Sans titre'}"`);
        await runQuery(`
          INSERT INTO calendar_events
          (google_event_id, user_id, title, description, start_time, end_time, location, html_link, all_day)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          event.id,
          req.user.id,
          event.summary || 'Sans titre',
          event.description || '',
          startTime,
          endTime,
          event.location || '',
          event.htmlLink || '',
          isAllDay
        ]);
        logger.info(`[CREATE CALENDAR EVENT] Événement créé avec succès - event_id: "${event.id}"`);
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
    const isAuthError =
      error.message.includes('authentifier') ||
      error.message.includes('reconnecter') ||
      error.message.includes('invalid_grant') ||
      (error.code === 401);

    if (isAuthError) {
      return res.status(401).json({
        error: 'Erreur d\'authentification Google. Veuillez vous reconnecter.',
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
    await runQuery('DELETE FROM google_oauth_tokens WHERE user_id = $1', [req.user.id]);
    logger.info(`Tokens OAuth supprimés pour l'utilisateur ${req.user.username}`);

    res.json({ message: 'Déconnecté avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/calendar/events
 * Créer un événement dans Google Calendar
 */
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      location,
      attendees,
      reminders,
      recurrence,
      visibility,
      colorId
    } = req.body;

    // Validation
    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Titre, date de début et date de fin requis' });
    }

    const calendar = await getCalendarClient(req.user.id);

    // Préparer l'événement
    const event = {
      summary: title,
      location: location || undefined,
      description: description || undefined,
      start: {
        dateTime: startDateTime,
        // Note: startDateTime est déjà en ISO UTC (ex: "2024-11-16T13:30:00.000Z")
        // Google Calendar l'interprétera correctement sans spécifier timeZone
      },
      end: {
        dateTime: endDateTime,
        // Note: endDateTime est déjà en ISO UTC
      },
      attendees: attendees && attendees.length > 0 ?
        attendees.map(email => ({ email })) : undefined,
      reminders: reminders ? {
        useDefault: false,
        overrides: reminders
      } : undefined,
      recurrence: recurrence || undefined,
      visibility: visibility || 'default',
      colorId: colorId || undefined
    };

    // Récupérer le Calendar ID depuis les settings
    const calendarIdSetting = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_id'");
    const calendarId = calendarIdSetting?.value || 'primary';

    // Créer l'événement dans Google Calendar
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none'
    });

    logger.info(`Événement créé: ${response.data.id} pour l'utilisateur ${req.user.username}`);

    // Synchroniser après création pour mettre à jour la base locale
    try {
      const events = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      });

      if (events.data.items && events.data.items.length > 0) {
        for (const item of events.data.items) {
          const itemStartRaw = item.start.dateTime || item.start.date;
          const itemEndRaw = item.end.dateTime || item.end.date;
          const itemIsAllDay = !item.start.dateTime;

          // Convertir en UTC pour PostgreSQL TIMESTAMP
          const itemStartUTC = itemIsAllDay ? itemStartRaw : new Date(itemStartRaw).toISOString();
          const itemEndUTC = itemIsAllDay ? itemEndRaw : new Date(itemEndRaw).toISOString();

          // PostgreSQL : INSERT ... ON CONFLICT DO UPDATE (pas INSERT OR REPLACE)
          logger.info(`[SYNC CALENDAR EVENT] Sync événement - event_id: "${item.id}"`);
          await runQuery(`
            INSERT INTO calendar_events
            (google_event_id, user_id, title, description, start_time, end_time, location, html_link, all_day, synced_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            ON CONFLICT (google_event_id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              location = EXCLUDED.location,
              html_link = EXCLUDED.html_link,
              all_day = EXCLUDED.all_day,
              synced_at = CURRENT_TIMESTAMP
            RETURNING *
          `, [
            item.id,
            req.user.id,
            item.summary || 'Sans titre',
            item.description || null,
            itemStartUTC,
            itemEndUTC,
            item.location || null,
            item.htmlLink || null,
            itemIsAllDay
          ]);
        }
      }
    } catch (syncError) {
      logger.warn('Erreur lors de la synchronisation post-création:', syncError);
    }

    res.json({
      message: 'Événement créé avec succès',
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    });

  } catch (error) {
    logger.error('Erreur lors de la création de l\'événement:', error);
    // Si l'erreur est liée à l'authentification, renvoyer un statut 401
    const isAuthError =
      error.message.includes('authentifier') ||
      error.message.includes('reconnecter') ||
      error.message.includes('invalid_grant') ||
      (error.code === 401);

    if (isAuthError) {
      return res.status(401).json({
        error: 'Erreur d\'authentification Google. Veuillez vous reconnecter.',
        needsReauth: true,
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création de l\'événement',
      details: error.message
    });
  }
});

/**
 * PUT /api/calendar/events/:id
 * Mettre à jour un événement dans Google Calendar
 */
router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      location,
      attendees,
      reminders,
      recurrence,
      visibility,
      colorId
    } = req.body;

    // Récupérer l'événement existant depuis la DB
    const dbEvent = await getOne(
      'SELECT google_event_id FROM calendar_events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!dbEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Validation
    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Titre, date de début et date de fin requis' });
    }

    const calendar = await getCalendarClient(req.user.id);

    // Préparer l'événement mis à jour
    const event = {
      summary: title,
      location: location || undefined,
      description: description || undefined,
      start: {
        dateTime: startDateTime,
        // Note: startDateTime est déjà en ISO UTC
      },
      end: {
        dateTime: endDateTime,
        // Note: endDateTime est déjà en ISO UTC
      },
      attendees: attendees && attendees.length > 0 ?
        attendees.map(email => ({ email })) : undefined,
      reminders: reminders ? {
        useDefault: false,
        overrides: reminders
      } : undefined,
      recurrence: recurrence || undefined,
      visibility: visibility || 'default',
      colorId: colorId || undefined
    };

    // Récupérer le Calendar ID depuis les settings
    const calendarIdSetting = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_id'");
    const calendarId = calendarIdSetting?.value || 'primary';

    // Mettre à jour l'événement dans Google Calendar
    const response = await calendar.events.update({
      calendarId: calendarId,
      eventId: dbEvent.google_event_id,
      resource: event,
      sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none'
    });

    logger.info(`Événement mis à jour: ${response.data.id} pour l'utilisateur ${req.user.username}`);

    // Mettre à jour dans la base de données locale
    const isAllDay = !startDateTime.includes('T') && !endDateTime.includes('T');

    // Convertir en UTC pour PostgreSQL TIMESTAMP (comme dans la synchronisation)
    const startTimeUTC = isAllDay ? startDateTime : new Date(startDateTime).toISOString();
    const endTimeUTC = isAllDay ? endDateTime : new Date(endDateTime).toISOString();

    await runQuery(`
      UPDATE calendar_events
      SET title = $1, description = $2, start_time = $3, end_time = $4,
          location = $5, html_link = $6, all_day = $7, synced_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      title,
      description || null,
      startTimeUTC,
      endTimeUTC,
      location || null,
      response.data.htmlLink || null,
      isAllDay, // BOOLEAN instead of 0/1
      req.params.id
    ]);

    res.json({
      message: 'Événement mis à jour avec succès',
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'événement:', error);
    // Si l'erreur est liée à l'authentification, renvoyer un statut 401
    const isAuthError =
      error.message.includes('authentifier') ||
      error.message.includes('reconnecter') ||
      error.message.includes('invalid_grant') ||
      (error.code === 401);

    if (isAuthError) {
      return res.status(401).json({
        error: 'Erreur d\'authentification Google. Veuillez vous reconnecter.',
        needsReauth: true,
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'événement',
      details: error.message
    });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Supprimer un événement local
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await getOne(
      'SELECT id FROM calendar_events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    await runQuery('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);

    logger.info(`Événement ${req.params.id} supprimé`);

    res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
