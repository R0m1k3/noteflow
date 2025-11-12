// Routes pour Google Calendar
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

/**
 * GET /api/calendar/events
 * Récupérer les événements du calendrier
 */
router.get('/events', async (req, res) => {
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
 * Synchroniser avec Google Calendar
 */
router.post('/sync', async (req, res) => {
  try {
    // Récupérer les paramètres Google Calendar depuis settings
    const apiKey = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_api_key'");
    const calendarId = await getOne("SELECT value FROM settings WHERE key = 'google_calendar_id'");

    if (!apiKey || !apiKey.value) {
      return res.status(400).json({ error: 'Clé API Google Calendar non configurée' });
    }

    if (!calendarId || !calendarId.value) {
      return res.status(400).json({ error: 'ID du calendrier non configuré' });
    }

    // Créer un client Google Calendar
    const calendar = google.calendar({ version: 'v3', auth: apiKey.value });

    // Récupérer les événements des 30 prochains jours
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: calendarId.value,
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
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error.message
    });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Supprimer un événement local
 */
router.delete('/events/:id', async (req, res) => {
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
