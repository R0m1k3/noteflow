const recurringTodosService = require('./recurring-todos.service');
const logger = require('../config/logger');

function startScheduler() {
    logger.info('Démarrage du planificateur de tâches récurrentes...');

    // Vérification toutes les heures
    setInterval(async () => {
        try {
            logger.debug('Vérification périodique des tâches récurrentes...');
            const result = await recurringTodosService.generateTodos(); // All users
            if (result.generated > 0) {
                logger.info(`Tâches récurrentes auto-générées: ${result.generated}`);
            }
        } catch (error) {
            logger.error('Erreur dans le planificateur:', error);
        }
    }, 60 * 60 * 1000); // 1 heure

    // Allow start check after a slight delay to ensure DB is ready
    setTimeout(async () => {
        try {
            const result = await recurringTodosService.generateTodos();
            if (result.generated > 0) {
                logger.info(`Tâches récurrentes auto-générées (démarrage): ${result.generated}`);
            } else {
                logger.info('Aucune tâche récurrente à générer au démarrage.');
            }
        } catch (error) {
            logger.error('Erreur dans le planificateur (démarrage):', error);
        }
    }, 5000); // 5 sec delay
}

module.exports = { startScheduler };
