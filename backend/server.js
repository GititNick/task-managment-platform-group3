import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InferenceClient } from '@huggingface/inference';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL =
  process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hf = new InferenceClient(HF_TOKEN);

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.header('Content-Type', 'application/json');
    return res.status(200).end();
  }

  next();
});

app.use(express.json());

// Initialize Neon PostgreSQL client
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Connect to database
client.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to Neon PostgreSQL');
    syncAllAuth0Users();
  }
});

// Sync all Auth0 users to Neon (runs on startup)
async function syncAllAuth0Users() {
  try {
    console.log('Syncing Auth0 users to database...');

    const tokenRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Failed to get Auth0 token:', await tokenRes.json());
      return;
    }

    const { access_token } = await tokenRes.json();

    const usersRes = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users?per_page=100&page=0`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!usersRes.ok) {
      console.error('Failed to fetch Auth0 users:', await usersRes.json());
      return;
    }

    const auth0Users = await usersRes.json();

    for (const u of auth0Users) {
      await client.query(
        `INSERT INTO users (auth0_id, name, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (auth0_id) DO UPDATE
           SET name = EXCLUDED.name,
               email = EXCLUDED.email,
               updated_at = CURRENT_TIMESTAMP`,
        [u.user_id, u.name || u.nickname || u.email, u.email]
      );
    }

    console.log(`Synced ${auth0Users.length} Auth0 user(s) to database`);
  } catch (error) {
    console.error('Error syncing Auth0 users on startup:', error.message);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await client.query('SELECT NOW()');
    res.json({
      status: 'Database connected',
      timestamp: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Database error',
      error: error.message,
    });
  }
});

// Initialize database (runs init-db.sql)
app.post('/api/init-db', async (req, res) => {
  try {
    const sqlFile = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await client.query(sql);
    res.json({ status: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({
      status: 'Database initialization error',
      error: error.message,
    });
  }
});

// ===== USER ENDPOINTS =====

// Sync all Auth0 users into Neon database (run once to backfill)
app.post('/api/auth/sync-all-users', async (req, res) => {
  try {
    const tokenRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      return res.status(500).json({ error: 'Failed to get Auth0 token', details: err });
    }

    const { access_token } = await tokenRes.json();

    const usersRes = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users?per_page=100&page=0`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!usersRes.ok) {
      const err = await usersRes.json();
      return res.status(500).json({ error: 'Failed to fetch Auth0 users', details: err });
    }

    const auth0Users = await usersRes.json();

    const results = [];
    for (const u of auth0Users) {
      const result = await client.query(
        `INSERT INTO users (auth0_id, name, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (auth0_id) DO UPDATE
           SET name = EXCLUDED.name,
               email = EXCLUDED.email,
               updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [u.user_id, u.name || u.nickname || u.email, u.email]
      );
      results.push(result.rows[0]);
    }

    res.json({
      status: 'All users synced',
      count: results.length,
      users: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync or create user from Auth0 (called after login)
app.post('/api/auth/sync-user', async (req, res) => {
  try {
    const { auth0_id, name, email } = req.body;

    if (!auth0_id || !email) {
      return res.status(400).json({ error: 'auth0_id and email are required' });
    }

    const existingUser = await client.query(
      'SELECT * FROM users WHERE auth0_id = $1',
      [auth0_id]
    );

    let result;
    if (existingUser.rows.length > 0) {
      result = await client.query(
        'UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE auth0_id = $3 RETURNING *',
        [name, email, auth0_id]
      );
    } else {
      result = await client.query(
        'INSERT INTO users (auth0_id, name, email) VALUES ($1, $2, $3) RETURNING *',
        [auth0_id, name, email]
      );
    }

    res.status(201).json({
      status: 'User synced',
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error syncing user',
      error: error.message,
    });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await client.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, password || '']
    );

    res.status(201).json({
      status: 'User created',
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error creating user',
      error: error.message,
    });
  }
});

// Get a specific user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      status: 'User retrieved',
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error retrieving user',
      error: error.message,
    });
  }
});

// Get user by auth0_id
app.get('/api/users/auth0/:auth0_id', async (req, res) => {
  try {
    const { auth0_id } = req.params;
    const result = await client.query(
      'SELECT id, auth0_id, name, email, created_at FROM users WHERE auth0_id = $1',
      [auth0_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      status: 'User retrieved',
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error retrieving user',
      error: error.message,
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({
      status: 'Users retrieved',
      users: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error retrieving users',
      error: error.message,
    });
  }
});

// ===== TASK ENDPOINTS =====

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { user_id, title, description, status, due_date } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const result = await client.query(
      `INSERT INTO tasks (user_id, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        user_id,
        title,
        description || '',
        status || 'pending',
        due_date || null,
      ]
    );

    res.status(201).json({
      status: 'Task created',
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error creating task',
      error: error.message,
    });
  }
});

// Get all tasks for a specific user
app.get('/api/tasks/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await client.query(
      `SELECT *
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      status: 'Tasks retrieved',
      tasks: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error retrieving tasks',
      error: error.message,
    });
  }
});

// Get a specific task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      status: 'Task retrieved',
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error retrieving task',
      error: error.message,
    });
  }
});

// Update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, due_date } = req.body;

    const result = await client.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           due_date = COALESCE($4, due_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, status, due_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      status: 'Task updated',
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error updating task',
      error: error.message,
    });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      status: 'Task deleted',
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error deleting task',
      error: error.message,
    });
  }
});

// ===== AI HELPERS =====

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'this', 'these', 'those', 'my', 'your', 'our', 'their', 'his',
  'her', 'its', 'do', 'does', 'did', 'done', 'get', 'got'
]);

const CONCEPT_GROUPS = {
  build: ['build', 'create', 'develop', 'implement', 'construct', 'setup', 'assemble'],
  fix: ['fix', 'debug', 'repair', 'resolve', 'troubleshoot', 'patch', 'correct'],
  auth: ['auth', 'authentication', 'authorize', 'authorization', 'login', 'signin', 'session', 'token', 'credential', 'oauth'],
  user: ['user', 'users', 'account', 'accounts', 'profile', 'profiles', 'member', 'members'],
  ui: ['ui', 'ux', 'interface', 'layout', 'design', 'screen', 'page', 'view', 'component', 'navbar', 'dashboard', 'form'],
  api: ['api', 'endpoint', 'route', 'routes', 'request', 'response', 'backend', 'server', 'controller'],
  data: ['data', 'database', 'db', 'schema', 'query', 'queries', 'table', 'tables', 'postgres', 'postgresql', 'neon'],
  test: ['test', 'tests', 'testing', 'verify', 'validation', 'validate', 'qa', 'check', 'checks'],
  docs: ['docs', 'documentation', 'readme', 'guide', 'comment', 'comments', 'manual', 'writeup'],
  deploy: ['deploy', 'deployment', 'release', 'launch', 'publish', 'hosting', 'vercel', 'netlify'],
  plan: ['plan', 'planning', 'organize', 'organizing', 'schedule', 'timeline', 'milestone', 'roadmap', 'deadline'],
  present: ['presentation', 'present', 'slides', 'demo', 'speaker', 'talk', 'pitch'],
  study: ['study', 'studying', 'learn', 'learning', 'review', 'practice', 'exam', 'quiz', 'midterm', 'assignment'],
  team: ['team', 'group', 'partner', 'collaborate', 'collaboration', 'assign', 'assigned', 'member'],
  security: ['security', 'secure', 'vulnerability', 'audit', 'permission', 'permissions', 'access', 'risk'],

  event: ['event', 'wedding', 'party', 'ceremony', 'reception', 'celebration', 'bridal', 'groom', 'marriage'],
  venue: ['venue', 'location', 'hall', 'church', 'site', 'place'],
  guest: ['guest', 'guests', 'invite', 'invitation', 'rsvp', 'attendee', 'family', 'friend'],
  budget: ['budget', 'cost', 'price', 'expense', 'payment', 'deposit', 'vendor'],
  vendor: ['vendor', 'vendors', 'catering', 'photographer', 'dj', 'florist', 'bakery', 'planner'],
  schedule: ['date', 'timeline', 'schedule', 'booking', 'reservation', 'deadline'],
};

function normalizeWord(word) {
  let w = word.toLowerCase().trim();
  w = w.replace(/[^a-z0-9]/g, '');

  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);

  return w;
}

function buildConceptIndex() {
  const index = {};

  for (const [concept, words] of Object.entries(CONCEPT_GROUPS)) {
    const normalizedConcept = normalizeWord(concept);

    if (!index[normalizedConcept]) {
      index[normalizedConcept] = new Set();
    }

    index[normalizedConcept].add(normalizedConcept);

    for (const word of words) {
      const normalizedWord = normalizeWord(word);
      if (!normalizedWord) continue;

      if (!index[normalizedWord]) {
        index[normalizedWord] = new Set();
      }

      index[normalizedWord].add(normalizedConcept);
      index[normalizedConcept].add(normalizedWord);
    }
  }

  return index;
}

const CONCEPT_INDEX = buildConceptIndex();

function tokenizeText(text) {
  if (!text) return [];

  return text
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word && !STOP_WORDS.has(word));
}

function expandTokens(text) {
  const rawTokens = tokenizeText(text);
  const expanded = new Set();

  for (const token of rawTokens) {
    expanded.add(token);

    if (CONCEPT_INDEX[token]) {
      for (const linked of CONCEPT_INDEX[token]) {
        expanded.add(linked);
      }
    }
  }

  return expanded;
}

function scoreTaskSimilarity(currentTask, otherTask) {
  const currentText = `${currentTask.title || ''} ${currentTask.description || ''}`;
  const otherText = `${otherTask.title || ''} ${otherTask.description || ''}`;

  const currentTokens = expandTokens(currentText);
  const otherTokens = expandTokens(otherText);

  let overlap = 0;
  for (const token of currentTokens) {
    if (otherTokens.has(token)) {
      overlap += 1;
    }
  }

  let statusBonus = 0;
  if (otherTask.status === 'in-progress') statusBonus += 2;
  if (otherTask.status === 'pending') statusBonus += 1;
  if (otherTask.status === 'completed') statusBonus += 0.5;

  const currentTitleTokens = expandTokens(currentTask.title || '');
  const otherTitleTokens = expandTokens(otherTask.title || '');

  let titleOverlap = 0;
  for (const token of currentTitleTokens) {
    if (otherTitleTokens.has(token)) {
      titleOverlap += 2;
    }
  }

  return overlap + titleOverlap + statusBonus;
}

function getMostRelatedTasks(currentTask, allTasks, limit = 5) {
  return allTasks
    .filter((task) => String(task.id) !== String(currentTask.id))
    .map((task) => ({
      ...task,
      similarityScore: scoreTaskSimilarity(currentTask, task),
    }))
    .filter((task) => task.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

function fallbackNextStepSuggestions(currentTask, relatedTasks) {
  const suggestions = new Set();
  const contextText = `${currentTask.title || ''} ${currentTask.description || ''} ${relatedTasks
    .map((t) => `${t.title || ''} ${t.description || ''}`)
    .join(' ')}`.toLowerCase();

  const concepts = expandTokens(contextText);

  if (concepts.has('event')) {
    suggestions.add('Create a guest list');
    suggestions.add('Set a wedding or event budget');
    suggestions.add('Research and compare venues');
    suggestions.add('Choose a date and draft a timeline');
    suggestions.add('List vendors needed for the event');
  }

  if (concepts.has('venue')) {
    suggestions.add('Compare venue options and pricing');
    suggestions.add('Check venue availability for preferred dates');
    suggestions.add('List venue requirements and restrictions');
  }

  if (concepts.has('guest')) {
    suggestions.add('Draft the full guest list');
    suggestions.add('Organize guests by family, friends, and priority');
    suggestions.add('Plan invitation and RSVP tracking');
  }

  if (concepts.has('budget')) {
    suggestions.add('Create a detailed budget breakdown');
    suggestions.add('Estimate costs for major categories');
    suggestions.add('Track deposits and payment deadlines');
  }

  if (concepts.has('vendor')) {
    suggestions.add('Research vendors and compare quotes');
    suggestions.add('Prioritize which vendors to book first');
    suggestions.add('Create a checklist for vendor follow-up');
  }

  if (concepts.has('schedule')) {
    suggestions.add('Choose key deadlines for major decisions');
    suggestions.add('Create a timeline for the next month');
    suggestions.add('Schedule the next planning milestone');
  }

  if (concepts.has('auth')) {
    suggestions.add('Test login and logout flow end to end');
    suggestions.add('Protect private pages with authentication checks');
    suggestions.add('Verify user session persists after refresh');
  }

  if (concepts.has('ui')) {
    suggestions.add('Connect the interface to the related data flow');
    suggestions.add('Review the layout and improve component consistency');
    suggestions.add('Test the UI with realistic user interactions');
  }

  if (concepts.has('api')) {
    suggestions.add('Verify the API route works with real request data');
    suggestions.add('Handle error responses and edge cases');
    suggestions.add('Test backend integration from the frontend');
  }

  if (concepts.has('data')) {
    suggestions.add('Validate database reads and writes for this workflow');
    suggestions.add('Review schema fields required for the next step');
    suggestions.add('Check stored data against expected task behavior');
  }

  if (suggestions.size === 0) {
    suggestions.add('Break the task into smaller actionable steps');
    suggestions.add('Identify the most immediate dependency for this task');
    suggestions.add('Test the current progress before moving forward');
    suggestions.add('Document what is finished and what remains');
    suggestions.add('Choose the next implementation step and schedule it');
  }

  return Array.from(suggestions).slice(0, 5);
}

function buildAnalyzePrompt(currentTask, relatedTasks) {
  const relatedText =
    relatedTasks.length > 0
      ? relatedTasks
          .map(
            (task, index) =>
              `${index + 1}. ${task.title} - ${task.description || 'No description'} (${task.status})`
          )
          .join('\n')
      : 'No strongly related tasks found.';

  return `You are a task planning assistant.

Current task:
${currentTask.title || 'Untitled task'}

Description:
${currentTask.description || 'No description provided.'}

Status:
${currentTask.status || 'pending'}

Most related tasks:
${relatedText}

Suggest 3 to 5 concrete, specific next-step tasks for this exact task.
Avoid generic advice like "break it down" or "set a deadline" unless there is no better option.
Return only short actionable task suggestions, one per line.`;
}

function buildCombinedTaskFromSelection(selectedTasks) {
  const combinedTitle = selectedTasks.map((task) => task.title || 'Untitled task').join(' + ');
  const combinedDescription = selectedTasks
    .map((task) => task.description || '')
    .filter(Boolean)
    .join(' ');

  const normalizedStatuses = selectedTasks.map((task) => (task.status || '').toLowerCase());
  let combinedStatus = 'pending';

  if (normalizedStatuses.some((status) => status.includes('progress'))) {
    combinedStatus = 'in-progress';
  } else if (normalizedStatuses.every((status) => status.includes('done') || status.includes('complete'))) {
    combinedStatus = 'completed';
  }

  return {
    id: selectedTasks.map((task) => task.id).join('-'),
    title: combinedTitle,
    description: combinedDescription,
    status: combinedStatus,
  };
}

function buildPromptModePrompt(prompt) {
  return `You are a task planning assistant.

User goal:
${prompt}

Suggest 3 to 5 concrete, specific tasks for this goal.
Avoid generic advice unless there is no better option.
Return only short actionable task suggestions, one per line.`;
}

function parseSuggestionsFromModel(text) {
  if (!text) return [];

  const rawParts = text
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/[;•]/))
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => line.length > 3 && line.length < 120)
    .filter((line) => !/^current task/i.test(line))
    .filter((line) => !/^description/i.test(line))
    .filter((line) => !/^status/i.test(line))
    .filter((line) => !/^most related tasks/i.test(line))
    .filter((line) => !/^suggest/i.test(line));

  return Array.from(new Set(rawParts)).slice(0, 5);
}

async function generateHostedSuggestions(prompt) {
  const response = await hf.chatCompletion({
    model: HUGGINGFACE_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a task management assistant. Suggest concrete, logical next-step tasks. Avoid vague advice unless no better option exists. Return only short actionable task suggestions, one per line.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 180,
    temperature: 0.5,
  });

  return response.choices?.[0]?.message?.content || '';
}

async function analyzeTaskSuggestions(currentTask, candidateRelatedTasks) {
  const relatedTasks = getMostRelatedTasks(currentTask, candidateRelatedTasks, 5);
  let suggestions = [];

  try {
    const aiPrompt = buildAnalyzePrompt(currentTask, relatedTasks);
    const generatedText = await generateHostedSuggestions(aiPrompt);
    suggestions = parseSuggestionsFromModel(generatedText);
  } catch (error) {
    console.error('AI analyze mode failed:', error.message);
  }

  if (suggestions.length === 0) {
    suggestions = fallbackNextStepSuggestions(currentTask, relatedTasks);
  }

  return {
    currentTask,
    relatedTasks,
    suggestions,
  };
}

// ===== AI ENDPOINT =====

app.post('/api/ai/suggest-tasks', async (req, res) => {
  try {
    const { mode, prompt, userId, currentTaskId, currentTaskIds, tasks } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!HF_TOKEN) {
      return res.status(500).json({ error: 'HF_TOKEN is missing in backend .env' });
    }

    if (mode === 'analyze') {
      let userTasks = Array.isArray(tasks) ? tasks : [];

      if (userTasks.length === 0) {
        const tasksResult = await client.query(
          'SELECT id, title, description, status, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        userTasks = tasksResult.rows;
      }

      if (userTasks.length === 0 && !prompt?.trim()) {
        return res.status(404).json({ error: 'No tasks found for analysis' });
      }

      const requestedTaskIds = Array.isArray(currentTaskIds)
        ? currentTaskIds.map((id) => String(id).trim())
        : currentTaskId
          ? [String(currentTaskId).trim()]
          : [];
      let tasksToAnalyze = [];

      if (requestedTaskIds.length > 0) {
        tasksToAnalyze = requestedTaskIds
          .map((requestedId) =>
            userTasks.find((task) => String(task.id).trim() === requestedId)
          )
          .filter(Boolean);

        if (tasksToAnalyze.length === 0) {
          return res.status(400).json({
            error: 'Selected tasks were not found. Please reselect and try again.',
          });
        }
      }

      if (tasksToAnalyze.length === 0 && prompt?.trim()) {
        tasksToAnalyze = [
          {
            id: 'prompt-task',
            title: prompt.trim(),
            description: '',
            status: 'pending',
          },
        ];
      }

      if (tasksToAnalyze.length === 0) {
        const fallbackTask =
          userTasks.find((task) => task.status === 'in-progress') ||
          userTasks.find((task) => task.status === 'pending') ||
          userTasks[0];

        if (fallbackTask) {
          tasksToAnalyze = [fallbackTask];
        }
      }

      const suggestionsByTask = [];

      for (const taskToAnalyze of tasksToAnalyze) {
        const candidateRelatedTasks = userTasks.filter(
          (task) => String(task.id) !== String(taskToAnalyze.id)
        );

        const analysis = await analyzeTaskSuggestions(taskToAnalyze, candidateRelatedTasks);
        suggestionsByTask.push(analysis);
      }

      const primaryTaskId = requestedTaskIds[0];
      const primaryResult =
        (primaryTaskId
          ? suggestionsByTask.find(
              (result) => String(result.currentTask?.id).trim() === primaryTaskId
            )
          : suggestionsByTask[0]) || {
        currentTask: null,
        relatedTasks: [],
        suggestions: [],
      };

      return res.json({
        status: 'Suggestions generated',
        mode: 'analyze',
        currentTask: primaryResult.currentTask,
        relatedTasks: primaryResult.relatedTasks,
        suggestions: primaryResult.suggestions,
        suggestionsByTask,
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required for prompt mode' });
    }

    let suggestions = [];

    try {
      const aiPrompt = buildPromptModePrompt(prompt.trim());
      const generatedText = await generateHostedSuggestions(aiPrompt);
      suggestions = parseSuggestionsFromModel(generatedText);
    } catch (error) {
      console.error('AI prompt mode failed:', error.message);
    }

    if (suggestions.length === 0) {
      suggestions = fallbackNextStepSuggestions(
        {
          id: 'prompt-task',
          title: prompt.trim(),
          description: '',
          status: 'pending',
        },
        []
      );
    }

    res.json({
      status: 'Suggestions generated',
      mode: 'prompt',
      suggestions,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({
      status: 'Error generating suggestions',
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend ready on http://localhost:${PORT}`);
});
