// Service de logging en mémoire pour débuguer le timezone
// Les logs sont stockés en mémoire et accessibles via /api/calendar/timezone-logs

class TimezoneLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // Garder max 500 logs
  }

  log(category, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };

    this.logs.push(entry);

    // Limiter le nombre de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Afficher aussi dans les logs console
    console.log(`[${category}] ${message}`, data || '');
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit).reverse();
  }

  clearLogs() {
    this.logs = [];
  }

  getLogsByCategory(category, limit = 50) {
    return this.logs
      .filter(log => log.category === category)
      .slice(-limit)
      .reverse();
  }
}

// Singleton
const timezoneLogger = new TimezoneLogger();

module.exports = timezoneLogger;
