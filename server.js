const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// MySQL Database configuration
let pool;
try {
    const dbOptions = {
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        ssl: {
            rejectUnauthorized: true
        }
    };

    if (process.env.DATABASE_URL) {
        // If it's a URL (like mysql://...), use it directly as the first argument
        console.log('Using DATABASE_URL for pool creation');
        pool = mysql.createPool(process.env.DATABASE_URL);
        // Note: We might need to manually set pool options after or use a specific format
    } else {
        console.log('Using individual DB environment variables');
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'portfolio_db',
            ...dbOptions
        });
    }
} catch (err) {
    console.error('CRITICAL: Failed to create MySQL pool:', err.message);
}

// Health Check (To test if the function is alive without DB)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'alive',
        time: new Date().toISOString(),
        env: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL
    });
});


// Fallback for root / to serve index.html if hit directly
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Middleware to ensure DB is initialized
let dbInitialized = false;
async function ensureDb() {
    if (dbInitialized) return;

    let connection;
    try {
        console.log('Lazy-initializing database...');
        connection = await pool.getConnection();

        // Create tables if they don't exist
        await connection.query(`CREATE TABLE IF NOT EXISTS contacts (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS site_content (section_key VARCHAR(100) PRIMARY KEY, content TEXT NOT NULL)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS skills (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL)`);
        await connection.query(`CREATE TABLE IF NOT EXISTS projects (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT NOT NULL, image_url VARCHAR(255) DEFAULT '', code_url VARCHAR(255) DEFAULT '', live_url VARCHAR(255) DEFAULT '')`);

        // Insert default content if empty
        const [contentRows] = await connection.query('SELECT COUNT(*) as count FROM site_content');
        if (contentRows[0].count === 0) {
            const defaultContent = [['hero_greeting', "Hi, I'm"], ['hero_name', 'Sanjana'], ['hero_role', 'Web Developer'], ['hero_description', 'Love creating beautiful websites.'], ['about_p1', 'CS student.'], ['about_p2', 'Passionate developer.']];
            for (const [key, val] of defaultContent) {
                await connection.query('INSERT IGNORE INTO site_content (section_key, content) VALUES (?, ?)', [key, val]);
            }
        }

        dbInitialized = true;
        console.log('Database initialization complete.');
    } catch (err) {
        console.error('CRITICAL: Database initialization failed:', err.message);
        throw err; // Re-throw so the request fails visibly
    } finally {
        if (connection) connection.release();
    }
}

// Add ensureDb to all API routes
app.use('/api', async (req, res, next) => {
    try {
        await ensureDb();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// Global crash protection for serverless initialization errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


// API endpoint to handle form submissions
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Please provide name, email, and message.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
            [name, email, message]
        );

        res.status(201).json({
            success: true,
            message: 'Message saved successfully',
            id: result.insertId
        });
    } catch (err) {
        console.error('Error inserting data:', err.message);
        res.status(500).json({ error: 'Failed to save message due to a database error.' });
    }
});

// --- NEW API ENDPOINTS FOR DYNAMIC CONTENT ---

// Middleware for simple admin authentication
const checkAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Site Content
app.get('/api/content', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT section_key, content FROM site_content');
        const content = {};
        rows.forEach(row => {
            content[row.section_key] = row.content;
        });
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.put('/api/content', checkAuth, async (req, res) => {
    const updates = req.body; // Expects object: { hero_greeting: "Hello", ... }

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const [key, val] of Object.entries(updates)) {
            await connection.query(
                'INSERT INTO site_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
                [key, val, val]
            );
        }

        await connection.commit();
        connection.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Skills
app.get('/api/skills', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM skills');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch skills' });
    }
});

app.post('/api/skills', checkAuth, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name required' });

    try {
        const [result] = await pool.execute('INSERT INTO skills (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add skill' });
    }
});

app.delete('/api/skills/:id', checkAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM skills WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete skill' });
    }
});

// Projects
app.get('/api/projects', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', checkAuth, async (req, res) => {
    const { title, description, image_url, code_url, live_url } = req.body;

    try {
        const [result] = await pool.execute(
            'INSERT INTO projects (title, description, image_url, code_url, live_url) VALUES (?, ?, ?, ?, ?)',
            [title, description, image_url || '', code_url || '', live_url || '']
        );
        res.status(201).json({ id: result.insertId, title, description, image_url, code_url, live_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add project' });
    }
});

app.put('/api/projects/:id', checkAuth, async (req, res) => {
    const { title, description, image_url, code_url, live_url } = req.body;

    try {
        await pool.execute(
            'UPDATE projects SET title = ?, description = ?, image_url = ?, code_url = ?, live_url = ? WHERE id = ?',
            [title, description, image_url, code_url, live_url, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

app.delete('/api/projects/:id', checkAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Messages (Admin only)
app.get('/api/messages', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

