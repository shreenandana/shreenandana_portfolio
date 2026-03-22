const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'alive',
        time: new Date().toISOString(),
        env: process.env.NODE_ENV,
        supabaseConnected: !!supabaseUrl && !!supabaseKey
    });
});

// Fallback for root / to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Authentication Middleware
const checkAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API ENDPOINTS ---

// Site Content
app.get('/api/content', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('section_key, content');

        if (error) throw error;

        const content = {};
        data.forEach(row => {
            content[row.section_key] = row.content;
        });
        res.json(content);
    } catch (err) {
        console.error('Error fetching content:', err.message);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.put('/api/content', checkAuth, async (req, res) => {
    const updates = req.body; 
    const rows = Object.entries(updates).map(([key, val]) => ({ section_key: key, content: val }));

    try {
        const { error } = await supabase
            .from('site_content')
            .upsert(rows);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating content:', err.message);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Skills
app.get('/api/skills', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching skills:', err.message);
        res.status(500).json({ error: 'Failed to fetch skills' });
    }
});

app.post('/api/skills', checkAuth, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name required' });

    try {
        const { data, error } = await supabase
            .from('skills')
            .insert([{ name }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error adding skill:', err.message);
        res.status(500).json({ error: 'Failed to add skill' });
    }
});

app.delete('/api/skills/:id', checkAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('skills')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting skill:', err.message);
        res.status(500).json({ error: 'Failed to delete skill' });
    }
});

// Projects
app.get('/api/projects', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching projects:', err.message);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', checkAuth, async (req, res) => {
    const { title, description, image_url, code_url, live_url } = req.body;

    try {
        const { data, error } = await supabase
            .from('projects')
            .insert([{ 
                title, 
                description, 
                image_url: image_url || '', 
                code_url: code_url || '', 
                live_url: live_url || '' 
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error adding project:', err.message);
        res.status(500).json({ error: 'Failed to add project' });
    }
});

app.put('/api/projects/:id', checkAuth, async (req, res) => {
    const { title, description, image_url, code_url, live_url } = req.body;

    try {
        const { error } = await supabase
            .from('projects')
            .update({ title, description, image_url, code_url, live_url })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating project:', err.message);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

app.delete('/api/projects/:id', checkAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting project:', err.message);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Please provide name, email, and message.' });
    }

    try {
        const { data, error } = await supabase
            .from('contacts')
            .insert([{ name, email, message }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Message saved successfully',
            id: data.id
        });
    } catch (err) {
        console.error('Error saving contact message:', err.message);
        res.status(500).json({ error: 'Failed to save message.' });
    }
});

// Messages (Admin only)
app.get('/api/messages', checkAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching messages:', err.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

