import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { JSONFilePreset } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
const defaultData = { responses: [], nextId: 1 };
const db = await JSONFilePreset(path.join(__dirname, 'database.json'), defaultData);

// Load config
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(configData);
}

// API: Get public config (excludes admin password)
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  const { admin, ...publicConfig } = config;
  res.json(publicConfig);
});

// API: Submit RSVP
app.post('/api/rsvp', async (req, res) => {
  const { guest_name, email, attending, guest_count, dietary, message } = req.body;

  if (!guest_name || !attending) {
    return res.status(400).json({ error: 'Guest name and attendance status are required' });
  }

  try {
    const newResponse = {
      id: db.data.nextId++,
      guest_name,
      email: email || null,
      attending,
      guest_count: guest_count || 1,
      dietary: dietary || null,
      message: message || null,
      created_at: new Date().toISOString()
    };

    db.data.responses.push(newResponse);
    await db.write();

    res.json({ success: true, id: newResponse.id });
  } catch (error) {
    console.error('Error saving RSVP:', error);
    res.status(500).json({ error: 'Failed to save RSVP' });
  }
});

// Middleware to check admin password
function checkAdminAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;
  const config = loadConfig();

  if (password !== config.admin.password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// API: Get all responses (admin only)
app.get('/api/admin/responses', checkAdminAuth, (req, res) => {
  try {
    const responses = [...db.data.responses].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// API: Delete response (admin only)
app.delete('/api/admin/responses/:id', checkAdminAuth, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const index = db.data.responses.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Response not found' });
    }

    db.data.responses.splice(index, 1);
    await db.write();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting response:', error);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// API: Export CSV (admin only)
app.get('/api/admin/export', checkAdminAuth, (req, res) => {
  try {
    const responses = [...db.data.responses].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    const headers = ['ID', 'Guest Name', 'Email', 'Attending', 'Guest Count', 'Dietary Restrictions', 'Message', 'Date'];
    const csvRows = [headers.join(',')];

    responses.forEach(row => {
      const values = [
        row.id,
        `"${(row.guest_name || '').replace(/"/g, '""')}"`,
        `"${(row.email || '').replace(/"/g, '""')}"`,
        row.attending,
        row.guest_count,
        `"${(row.dietary || '').replace(/"/g, '""')}"`,
        `"${(row.message || '').replace(/"/g, '""')}"`,
        row.created_at
      ];
      csvRows.push(values.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=rsvp-responses.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// API: Get statistics (admin only)
app.get('/api/admin/stats', checkAdminAuth, (req, res) => {
  try {
    const responses = db.data.responses;
    const total = responses.length;
    const attending = responses.filter(r => r.attending === 'yes').length;
    const notAttending = responses.filter(r => r.attending === 'no').length;
    const maybe = responses.filter(r => r.attending === 'maybe').length;
    const totalGuests = responses
      .filter(r => r.attending === 'yes')
      .reduce((sum, r) => sum + (r.guest_count || 1), 0);

    res.json({
      total,
      attending,
      notAttending,
      maybe,
      totalGuests
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Wedding invitation server running at http://localhost:${PORT}`);
  console.log(`Admin panel available at http://localhost:${PORT}/admin.html`);
});
