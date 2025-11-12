const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// In-memory storage for pastes
const pastes = new Map();

// Generate random ID
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// API Routes

// Create a new paste
app.post('/api/paste', (req, res) => {
  const { content } = req.body;
  
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  const id = generateId();
  const timestamp = new Date().toISOString();
  
  pastes.set(id, {
    id,
    content,
    timestamp
  });
  
  res.json({ id, url: `/paste/${id}` });
});

// Get a paste by ID
app.get('/api/paste/:id', (req, res) => {
  const { id } = req.params;
  
  const paste = pastes.get(id);
  
  if (!paste) {
    return res.status(404).json({ error: 'Paste not found' });
  }
  
  res.json(paste);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve paste view page
app.get('/paste/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Sepa server running on http://localhost:${PORT}`);
});
