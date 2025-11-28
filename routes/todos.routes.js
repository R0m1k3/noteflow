// Routes de gestion des todos globaux (sidebar)
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

/**
 * GET /api/todos
 * Liste tous les todos globaux de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    // Essayer d'abord avec le champ priority (nouvelle version)
    try {
      const todos = await getAll(`
        SELECT id, text, completed, priority, in_progress, parent_id, level, created_at
        FROM global_todos
        WHERE user_id = $1
        ORDER BY priority DESC, created_at DESC
      `, [req.user.id]);

      res.json(todos);
      return;
    } catch (priorityError) {
      // Si le champ priority n'existe pas, utiliser l'ancienne requête
      logger.info('Champ priority non trouvé, utilisation de la requête sans priority');
      const todos = await getAll(`
        SELECT id, text, completed, created_at
        FROM global_todos
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [req.user.id]);

      // Ajouter priority=false et in_progress=false par défaut pour compatibilité frontend
      const todosWithPriority = todos.map(t => ({ ...t, priority: false, in_progress: false, parent_id: null, level: 0 }));
      res.json(todosWithPriority);
    }
  } catch (error) {
    logger.error('Erreur lors de la récupération des todos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/todos
 * Créer un nouveau todo global (supports subtasks via parent_id)
 */
router.post('/',
  [
    body('text').trim().notEmpty().withMessage('Le texte est requis'),
    body('parent_id').optional().isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { text, parent_id } = req.body;
      let level = 0;

      // Si c'est un subtask, vérifier que le parent existe et calculer le niveau
      if (parent_id) {
        const parent = await getOne('SELECT id, level FROM global_todos WHERE id = $1 AND user_id = $2', [parent_id, req.user.id]);
        if (!parent) {
          return res.status(404).json({ error: 'Todo parent non trouvé' });
        }
        level = (parent.level || 0) + 1;
      }

      logger.info(`[CREATE GLOBAL TODO] Début création - user_id: ${req.user.id}, text: "${text}"${parent_id ? ` (subtask of ${parent_id})` : ''}`);

      const result = await runQuery(`
        INSERT INTO global_todos (user_id, text, parent_id, level)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [req.user.id, text, parent_id || null, level]);

      logger.info(`[CREATE GLOBAL TODO] Todo global créé avec succès - ID: ${result.id}, user: ${req.user.username}, level: ${level}`);

      res.status(201).json({
        id: result.id,
        text,
        completed: false,
        priority: false,
        in_progress: false,
        parent_id: parent_id || null,
        level: level,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Erreur lors de la création du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/todos/:id
 * Modifier un todo global
 */
router.put('/:id',
  [
    body('text').optional().trim().notEmpty(),
    body('completed').optional().isBoolean(),
    body('priority').optional().isBoolean(),
    body('in_progress').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { text, completed, priority, in_progress } = req.body;

      // Vérifier que le todo appartient à l'utilisateur
      const todo = await getOne('SELECT id FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (!todo) {
        return res.status(404).json({ error: 'Todo non trouvé' });
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (text !== undefined) {
        paramCount++;
        updates.push(`text = $${paramCount}`);
        params.push(text);
      }
      if (completed !== undefined) {
        paramCount++;
        updates.push(`completed = $${paramCount}`);
        params.push(completed); // BOOLEAN instead of 0/1
      }
      if (priority !== undefined) {
        paramCount++;
        updates.push(`priority = $${paramCount}`);
        params.push(priority); // BOOLEAN instead of 0/1
      }
      if (in_progress !== undefined) {
        paramCount++;
        updates.push(`in_progress = $${paramCount}`);
        params.push(in_progress); // BOOLEAN instead of 0/1
      }

      if (updates.length > 0) {
        paramCount++;
        params.push(req.params.id);
        await runQuery(`UPDATE global_todos SET ${updates.join(', ')} WHERE id = $${paramCount}`, params);
      }

      res.json({ message: 'Todo modifié avec succès' });
    } catch (error) {
      logger.error('Erreur lors de la modification du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/todos/:id/toggle
 * Basculer l'état completed d'un todo
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    const todo = await getOne('SELECT id, completed FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    const newCompleted = !todo.completed; // BOOLEAN instead of 0/1
    await runQuery('UPDATE global_todos SET completed = $1 WHERE id = $2', [newCompleted, req.params.id]);

    logger.info(`Todo global ${newCompleted ? 'complété' : 'réouvert'} (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Todo modifié avec succès', completed: newCompleted });
  } catch (error) {
    logger.error('Erreur lors du toggle du todo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/todos/:id/priority
 * Basculer l'état priority d'un todo
 */
router.patch('/:id/priority', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    try {
      const todo = await getOne('SELECT id, priority FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (!todo) {
        return res.status(404).json({ error: 'Todo non trouvé' });
      }

      const newPriority = !todo.priority; // BOOLEAN instead of 0/1
      await runQuery('UPDATE global_todos SET priority = $1 WHERE id = $2', [newPriority, req.params.id]);

      logger.info(`Todo global ${newPriority ? 'marqué prioritaire' : 'démarqué prioritaire'} (ID: ${req.params.id}) par ${req.user.username}`);

      res.json({ message: 'Priorité modifiée avec succès', priority: newPriority });
    } catch (priorityError) {
      // Si le champ priority n'existe pas encore, retourner un message d'erreur explicite
      if (priorityError.message && priorityError.message.includes('priority')) {
        logger.warn('Tentative d\'utilisation de la fonctionnalité priority sans migration');
        return res.status(400).json({
          error: 'Fonctionnalité priority non disponible',
          message: 'Veuillez exécuter la migration: npm run db:migrate:priority'
        });
      }
      throw priorityError;
    }
  } catch (error) {
    logger.error('Erreur lors du toggle de la priorité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/todos/:id/in-progress
 * Basculer l'état in_progress d'un todo
 */
router.patch('/:id/in-progress', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    try {
      const todo = await getOne('SELECT id, in_progress FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (!todo) {
        return res.status(404).json({ error: 'Todo non trouvé' });
      }

      const newInProgress = !todo.in_progress; // BOOLEAN instead of 0/1
      await runQuery('UPDATE global_todos SET in_progress = $1 WHERE id = $2', [newInProgress, req.params.id]);

      logger.info(`Todo global ${newInProgress ? 'marqué en cours' : 'démarqué en cours'} (ID: ${req.params.id}) par ${req.user.username}`);

      res.json({ message: 'Statut en cours modifié avec succès', in_progress: newInProgress });
    } catch (inProgressError) {
      // Si le champ in_progress n'existe pas encore
      if (inProgressError.message && inProgressError.message.includes('in_progress')) {
        logger.warn('Tentative d\'utilisation de la fonctionnalité in_progress sans migration');
        return res.status(400).json({
          error: 'Fonctionnalité in_progress non disponible',
          message: 'Veuillez exécuter la migration: node scripts/migrate_003.js'
        });
      }
      throw inProgressError;
    }
  } catch (error) {
    logger.error('Erreur lors du toggle du statut en cours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/todos/:id
 * Supprimer un todo global
 */
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    const todo = await getOne('SELECT id FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    await runQuery('DELETE FROM global_todos WHERE id = $1', [req.params.id]);

    logger.info(`Todo global supprimé (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Todo supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du todo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
