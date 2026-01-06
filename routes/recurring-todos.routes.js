// Routes de gestion des tâches récurrentes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

/**
 * GET /api/recurring-todos
 * Liste toutes les tâches récurrentes de l'utilisateur
 */
router.get('/', async (req, res) => {
    try {
        const todos = await getAll(
            `SELECT * FROM recurring_todos WHERE user_id = $1 ORDER BY next_occurrence ASC`,
            [req.user.id]
        );
        res.json(todos);
    } catch (error) {
        logger.error('Erreur lors de la récupération des tâches récurrentes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /api/recurring-todos
 * Créer une nouvelle tâche récurrente
 */
router.post('/',
    [
        body('text').trim().notEmpty().withMessage('Le texte est requis'),
        body('recurrence_type').isIn(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).withMessage('Type de récurrence invalide'),
        body('recurrence_interval').optional().isInt({ min: 1 }).withMessage('Intervalle invalide'),
        body('day_of_week').optional().isInt({ min: 0, max: 6 }),
        body('day_of_month').optional().isInt({ min: 1, max: 31 }),
        body('priority').optional().isBoolean(),
        body('next_occurrence').notEmpty().withMessage('Date de prochaine occurrence requise')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: 'Données invalides', details: errors.array() });
            }

            const { text, recurrence_type, recurrence_interval, day_of_week, day_of_month, priority, next_occurrence } = req.body;

            const result = await runQuery(
                `INSERT INTO recurring_todos (user_id, text, recurrence_type, recurrence_interval, day_of_week, day_of_month, priority, next_occurrence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [req.user.id, text, recurrence_type, recurrence_interval || 1, day_of_week, day_of_month, priority || false, next_occurrence]
            );

            res.status(201).json({
                id: result.id,
                text,
                recurrence_type,
                recurrence_interval: recurrence_interval || 1,
                day_of_week,
                day_of_month,
                priority: priority || false,
                next_occurrence,
                enabled: true,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Erreur lors de la création de la tâche récurrente:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

/**
 * PUT /api/recurring-todos/:id
 * Modifier une tâche récurrente
 */
router.put('/:id',
    [
        body('text').optional().trim().notEmpty(),
        body('recurrence_type').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
        body('recurrence_interval').optional().isInt({ min: 1 }),
        body('day_of_week').optional().isInt({ min: 0, max: 6 }),
        body('day_of_month').optional().isInt({ min: 1, max: 31 }),
        body('priority').optional().isBoolean(),
        body('enabled').optional().isBoolean(),
        body('next_occurrence').optional()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: 'Données invalides', details: errors.array() });
            }

            // Vérifier que la tâche appartient à l'utilisateur
            const existing = await getOne(
                'SELECT id FROM recurring_todos WHERE id = $1 AND user_id = $2',
                [req.params.id, req.user.id]
            );

            if (!existing) {
                return res.status(404).json({ error: 'Tâche récurrente non trouvée' });
            }

            const { text, recurrence_type, recurrence_interval, day_of_week, day_of_month, priority, enabled, next_occurrence } = req.body;
            const updates = [];
            const params = [];
            let paramCount = 0;

            if (text !== undefined) {
                paramCount++;
                updates.push(`text = $${paramCount}`);
                params.push(text);
            }
            if (recurrence_type !== undefined) {
                paramCount++;
                updates.push(`recurrence_type = $${paramCount}`);
                params.push(recurrence_type);
            }
            if (recurrence_interval !== undefined) {
                paramCount++;
                updates.push(`recurrence_interval = $${paramCount}`);
                params.push(recurrence_interval);
            }
            if (day_of_week !== undefined) {
                paramCount++;
                updates.push(`day_of_week = $${paramCount}`);
                params.push(day_of_week);
            }
            if (day_of_month !== undefined) {
                paramCount++;
                updates.push(`day_of_month = $${paramCount}`);
                params.push(day_of_month);
            }
            if (priority !== undefined) {
                paramCount++;
                updates.push(`priority = $${paramCount}`);
                params.push(priority);
            }
            if (enabled !== undefined) {
                paramCount++;
                updates.push(`enabled = $${paramCount}`);
                params.push(enabled);
            }
            if (next_occurrence !== undefined) {
                paramCount++;
                updates.push(`next_occurrence = $${paramCount}`);
                params.push(next_occurrence);
            }

            if (updates.length > 0) {
                paramCount++;
                params.push(req.params.id);
                await runQuery(`UPDATE recurring_todos SET ${updates.join(', ')} WHERE id = $${paramCount}`, params);
            }

            res.json({ message: 'Tâche récurrente modifiée avec succès' });
        } catch (error) {
            logger.error('Erreur lors de la modification de la tâche récurrente:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

/**
 * DELETE /api/recurring-todos/:id
 * Supprimer une tâche récurrente
 */
router.delete('/:id', async (req, res) => {
    try {
        // Vérifier que la tâche appartient à l'utilisateur
        const existing = await getOne(
            'SELECT id FROM recurring_todos WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (!existing) {
            return res.status(404).json({ error: 'Tâche récurrente non trouvée' });
        }

        await runQuery('DELETE FROM recurring_todos WHERE id = $1', [req.params.id]);

        res.json({ message: 'Tâche récurrente supprimée avec succès' });
    } catch (error) {
        logger.error('Erreur lors de la suppression de la tâche récurrente:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /api/recurring-todos/generate
 * Générer les todos du jour à partir des tâches récurrentes
 */
router.post('/generate', async (req, res) => {
    try {
        const recurringTodosService = require('../services/recurring-todos.service');
        const result = await recurringTodosService.generateTodos(req.user.id);
        res.json({
            message: `${result.generated} tâche(s) générée(s)`,
            generated: result.generated
        });
    } catch (error) {
        // Le logger est déjà appelé dans le controller
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
