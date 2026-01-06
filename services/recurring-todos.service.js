const { getAll, runQuery } = require('../config/database');
const logger = require('../config/logger');

class RecurringTodosService {
    /**
     * Génère les tâches à partir des modèles récurrents.
     * @param {number|null} userId - ID de l'utilisateur pour filtrer (optionnel). Si null, traite tous les utilisateurs.
     * @returns {Promise<{generated: number}>} Nombre de tâches générées
     */
    async generateTodos(userId = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            let recurringTodos;

            if (userId) {
                recurringTodos = await getAll(
                    `SELECT * FROM recurring_todos 
                     WHERE enabled = true AND next_occurrence <= $1 AND user_id = $2`,
                    [today, userId]
                );
            } else {
                recurringTodos = await getAll(
                    `SELECT * FROM recurring_todos 
                     WHERE enabled = true AND next_occurrence <= $1`,
                    [today]
                );
            }

            let generatedCount = 0;

            for (const recurring of recurringTodos) {
                // Créer le todo global
                await runQuery(
                    `INSERT INTO global_todos (user_id, text, priority, completed)
                     VALUES ($1, $2, $3, false)`,
                    [recurring.user_id, recurring.text, recurring.priority]
                );

                // Calculer la prochaine occurrence
                let nextDate = new Date(recurring.next_occurrence);

                switch (recurring.recurrence_type) {
                    case 'daily':
                        nextDate.setDate(nextDate.getDate() + recurring.recurrence_interval);
                        break;
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + (7 * recurring.recurrence_interval));
                        break;
                    case 'biweekly':
                        nextDate.setDate(nextDate.getDate() + 14);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + recurring.recurrence_interval);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + recurring.recurrence_interval);
                        break;
                }

                // Mettre à jour la tâche récurrente
                await runQuery(
                    `UPDATE recurring_todos SET next_occurrence = $1, last_generated = $2 WHERE id = $3`,
                    [nextDate.toISOString().split('T')[0], today, recurring.id]
                );

                generatedCount++;
            }

            return { generated: generatedCount };
        } catch (error) {
            logger.error('Erreur dans RecurringTodosService.generateTodos:', error);
            throw error;
        }
    }
}

module.exports = new RecurringTodosService();
