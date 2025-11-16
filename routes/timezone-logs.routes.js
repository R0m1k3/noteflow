// Route pour afficher les logs de timezone
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const timezoneLogger = require('../services/timezone-logger');

/**
 * GET /api/timezone-logs
 * Afficher tous les logs de timezone
 */
router.get('/', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = timezoneLogger.getLogs(limit);

  res.json({
    total: logs.length,
    limit,
    logs
  });
});

/**
 * GET /api/timezone-logs/category/:category
 * Afficher les logs d'une catégorie spécifique
 */
router.get('/category/:category', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = timezoneLogger.getLogsByCategory(req.category.toUpperCase(), limit);

  res.json({
    category: req.params.category,
    total: logs.length,
    limit,
    logs
  });
});

/**
 * POST /api/timezone-logs/clear
 * Vider tous les logs
 */
router.post('/clear', authenticateToken, (req, res) => {
  timezoneLogger.clearLogs();
  res.json({ message: 'Logs vidés avec succès' });
});

/**
 * GET /api/timezone-logs/html
 * Afficher les logs en HTML (pour voir directement dans le navigateur)
 */
router.get('/html', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  const logs = timezoneLogger.getLogs(limit);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Logs Timezone - NoteFlow</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .header h1 {
      color: white;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header .stats {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    .stat {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: white;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
      color: white;
    }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    button:hover {
      background: #2563eb;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    button.danger {
      background: #ef4444;
    }
    button.danger:hover {
      background: #dc2626;
    }
    button.success {
      background: #10b981;
    }
    button.success:hover {
      background: #059669;
    }
    .log-entry {
      background: #1e293b;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .log-entry:hover {
      background: #2d3b52;
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .log-entry.SYNC {
      border-left-color: #8b5cf6;
    }
    .log-entry.PARSER {
      border-left-color: #f59e0b;
    }
    .log-entry.GET {
      border-left-color: #10b981;
    }
    .log-timestamp {
      color: #64748b;
      font-size: 12px;
      font-family: 'Courier New', monospace;
    }
    .log-category {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 10px;
      text-transform: uppercase;
    }
    .log-category.SYNC {
      background: #8b5cf6;
      color: white;
    }
    .log-category.PARSER {
      background: #f59e0b;
      color: white;
    }
    .log-category.GET {
      background: #10b981;
      color: white;
    }
    .log-message {
      margin: 10px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #e2e8f0;
    }
    .log-data {
      background: #0f172a;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 10px;
      border: 1px solid #334155;
    }
    .log-data pre {
      margin: 0;
      color: #94a3b8;
    }
    .no-logs {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
    }
    .filter-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 16px;
      font-size: 13px;
      background: #334155;
    }
    .filter-btn.active {
      background: #3b82f6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Logs de débogage Timezone</h1>
    <p style="opacity: 0.9; margin-top: 10px;">Suivi en temps réel des conversions de dates</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${logs.length}</div>
        <div class="stat-label">Total logs</div>
      </div>
      <div class="stat">
        <div class="stat-value">${logs.filter(l => l.category === 'SYNC').length}</div>
        <div class="stat-label">Synchronisation</div>
      </div>
      <div class="stat">
        <div class="stat-value">${logs.filter(l => l.category === 'PARSER').length}</div>
        <div class="stat-label">Parser</div>
      </div>
      <div class="stat">
        <div class="stat-value">${logs.filter(l => l.category === 'GET').length}</div>
        <div class="stat-label">Frontend</div>
      </div>
    </div>
  </div>

  <div class="controls">
    <button onclick="location.reload()" class="success">🔄 Rafraîchir</button>
    <button onclick="clearLogs()" class="danger">🗑️ Vider les logs</button>
    <button onclick="autoRefresh()" id="autoRefreshBtn">⏱️ Auto-refresh OFF</button>
    <div class="filter-buttons" style="margin-left: auto;">
      <button class="filter-btn active" onclick="filterLogs('ALL')">Tous</button>
      <button class="filter-btn" onclick="filterLogs('SYNC')">Sync</button>
      <button class="filter-btn" onclick="filterLogs('PARSER')">Parser</button>
      <button class="filter-btn" onclick="filterLogs('GET')">Get</button>
    </div>
  </div>

  <div id="logs-container">
    ${logs.length === 0 ? '<div class="no-logs">Aucun log pour le moment. Synchronisez avec Google Calendar pour voir les logs.</div>' : ''}
    ${logs.map(log => `
      <div class="log-entry ${log.category}" data-category="${log.category}">
        <div>
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString('fr-FR')}</span>
          <span class="log-category ${log.category}">${log.category}</span>
        </div>
        <div class="log-message">${log.message}</div>
        ${log.data ? `<div class="log-data"><pre>${log.data}</pre></div>` : ''}
      </div>
    `).join('')}
  </div>

  <script>
    let autoRefreshInterval = null;

    function filterLogs(category) {
      const entries = document.querySelectorAll('.log-entry');
      const buttons = document.querySelectorAll('.filter-btn');

      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      entries.forEach(entry => {
        if (category === 'ALL' || entry.dataset.category === category) {
          entry.style.display = 'block';
        } else {
          entry.style.display = 'none';
        }
      });
    }

    function clearLogs() {
      if (confirm('Voulez-vous vraiment vider tous les logs ?')) {
        fetch('/api/timezone-logs/clear', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        }).then(() => location.reload());
      }
    }

    function autoRefresh() {
      const btn = document.getElementById('autoRefreshBtn');
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        btn.textContent = '⏱️ Auto-refresh OFF';
        btn.style.background = '#3b82f6';
      } else {
        autoRefreshInterval = setInterval(() => location.reload(), 3000);
        btn.textContent = '⏱️ Auto-refresh ON (3s)';
        btn.style.background = '#10b981';
      }
    }
  </script>
</body>
</html>
  `;

  res.send(html);
});

module.exports = router;
