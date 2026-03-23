document.addEventListener('DOMContentLoaded', () => {
    // State
    let authToken = null;
    let projectsData = [];

    // DOM Elements
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');

    const adminDashboard = document.getElementById('admin-dashboard');
    const logoutBtn = document.getElementById('logout-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const currentSectionTitle = document.getElementById('current-section-title');
    const saveStatus = document.getElementById('save-status');

    // Forms & Lists
    const contentForm = document.getElementById('content-form');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectForm = document.getElementById('project-form');
    const cancelProjectBtn = document.getElementById('cancel-project-btn');
    const projectsList = document.getElementById('projects-list');

    const skillForm = document.getElementById('skill-form');
    const skillsList = document.getElementById('skills-list');

    const messagesTableBody = document.getElementById('messages-table-body');

    // --- AUTHENTICATION ---

    // Check if initially logged in (using sessionStorage for simplicity)
    const storedToken = sessionStorage.getItem('adminToken');
    if (storedToken) {
        authToken = storedToken;
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = passwordInput.value;

        // Test auth by trying to fetch protected resource
        try {
            const res = await fetch('/api/messages', {
                headers: { 'x-admin-password': pwd }
            });

            if (res.ok) {
                authToken = pwd;
                sessionStorage.setItem('adminToken', pwd);
                showDashboard();
            } else {
                loginError.textContent = 'Invalid password.';
            }
        } catch (err) {
            loginError.textContent = 'Error connecting to server.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        authToken = null;
        sessionStorage.removeItem('adminToken');
        adminDashboard.style.display = 'none';
        loginScreen.style.display = 'flex';
        passwordInput.value = '';
        loginError.textContent = '';
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        adminDashboard.style.display = 'flex';
        loadAllData();
    }

    // --- NAVIGATION ---

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active content
            tabContents.forEach(c => c.classList.remove('active'));
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update header title
            currentSectionTitle.textContent = btn.textContent.trim();
        });
    });

    // --- UTILS ---

    function showStatus(message, isError = false) {
        saveStatus.textContent = message;
        saveStatus.className = 'status-indicator ' + (isError ? 'error' : 'success');

        setTimeout(() => {
            saveStatus.style.opacity = '0';
            setTimeout(() => {
                saveStatus.className = 'status-indicator';
                saveStatus.style.opacity = '';
            }, 300);
        }, 3000);
    }

    async function fetchWithAuth(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'x-admin-password': authToken,
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            logoutBtn.click(); // Force logout if token invalid
            throw new Error('Unauthorized');
        }
        return response;
    }

    // --- DATA LOADING & SAVING ---

    function loadAllData() {
        loadContent();
        loadProjects();
        loadSkills();
        loadMessages();
    }

    // Site Content
    async function loadContent() {
        try {
            const res = await fetch('/api/content');
            const data = await res.json();

            // Populate form fields
            Object.keys(data).forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = data[key];
            });
        } catch (err) {
            showStatus('Failed to load content', true);
        }
    }

    contentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contentForm);
        const updates = Object.fromEntries(formData.entries());

        try {
            const res = await fetchWithAuth('/api/content', {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                showStatus('Content saved successfully');
            } else {
                throw new Error();
            }
        } catch (err) {
            showStatus('Failed to save content', true);
        }
    });

    // Projects
    async function loadProjects() {
        try {
            const res = await fetch('/api/projects');
            projectsData = await res.json();
            renderProjectsList();
        } catch (err) {
            showStatus('Failed to load projects', true);
        }
    }

    function renderProjectsList() {
        projectsList.innerHTML = '';

        if (projectsData.length === 0) {
            projectsList.innerHTML = '<div class="list-item"><span class="text-muted">No projects found.</span></div>';
            return;
        }

        projectsData.forEach(p => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span class="list-item-title">${p.title}</span>
                <div class="list-item-actions">
                    <button class="edit-btn" data-id="${p.id}" title="Edit"><i data-lucide="edit-2"></i></button>
                    <button class="delete-btn" data-id="${p.id}" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            projectsList.appendChild(div);
        });

        // Re-initialize icons for new elements
        lucide.createIcons();

        // Add event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editProject(parseInt(id));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this project?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    await deleteProject(parseInt(id));
                }
            });
        });
    }

    function editProject(id) {
        const project = projectsData.find(p => p.id === id);
        if (!project) return;

        document.getElementById('project-editor-title').textContent = 'Edit Project';
        document.getElementById('project_id').value = project.id;
        document.getElementById('project_title').value = project.title;
        document.getElementById('project_description').value = project.description;
        document.getElementById('project_image').value = project.image_url || '';
        document.getElementById('project_code').value = project.code_url || '';
        document.getElementById('project_live').value = project.live_url || '';

        // Highlight active item
        document.querySelectorAll('.list-item').forEach(el => el.classList.remove('selected'));
        event.currentTarget.closest('.list-item').classList.add('selected');
    }

    addProjectBtn.addEventListener('click', () => {
        document.getElementById('project-editor-title').textContent = 'Add New Project';
        projectForm.reset();
        document.getElementById('project_id').value = '';
        document.querySelectorAll('.list-item').forEach(el => el.classList.remove('selected'));
    });

    cancelProjectBtn.addEventListener('click', () => {
        addProjectBtn.click();
    });

    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(projectForm);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/projects/${id}` : '/api/projects';

        try {
            const res = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showStatus(id ? 'Project updated' : 'Project added');
                loadProjects();
                addProjectBtn.click(); // Reset form
            } else {
                throw new Error();
            }
        } catch (err) {
            showStatus('Failed to save project', true);
        }
    });

    async function deleteProject(id) {
        try {
            const res = await fetchWithAuth(`/api/projects/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showStatus('Project deleted');
                loadProjects();
                if (document.getElementById('project_id').value == id) {
                    addProjectBtn.click(); // Reset form if deleting currently edited project
                }
            } else {
                throw new Error();
            }
        } catch (err) {
            showStatus('Failed to delete project', true);
        }
    }

    // Skills
    async function loadSkills() {
        try {
            const res = await fetch('/api/skills');
            const data = await res.json();

            skillsList.innerHTML = '';
            data.forEach(skill => {
                const span = document.createElement('span');
                span.className = 'admin-skill-tag';
                span.innerHTML = `
                    ${skill.name}
                    <button data-id="${skill.id}" title="Remove"><i data-lucide="x"></i></button>
                `;
                skillsList.appendChild(span);
            });

            lucide.createIcons();

            // Delete skill listeners
            document.querySelectorAll('.admin-skill-tag button').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    try {
                        const res = await fetchWithAuth(`/api/skills/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            loadSkills();
                            showStatus('Skill removed');
                        }
                    } catch (err) {
                        showStatus('Failed to remove skill', true);
                    }
                });
            });

        } catch (err) {
            showStatus('Failed to load skills', true);
        }
    }

    skillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new-skill-name');
        const name = input.value.trim();

        if (!name) return;

        try {
            const res = await fetchWithAuth('/api/skills', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            if (res.ok) {
                input.value = '';
                loadSkills();
                showStatus('Skill added');
            }
        } catch (err) {
            showStatus('Failed to add skill', true);
        }
    });

    // Messages
    async function loadMessages() {
        try {
            const res = await fetchWithAuth('/api/messages');
            const data = await res.json();

            messagesTableBody.innerHTML = '';

            if (data.length === 0) {
                messagesTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No messages found.</td></tr>';
                return;
            }

            data.forEach(msg => {
                const date = new Date(msg.created_at).toLocaleString();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="white-space: nowrap;">${date}</td>
                    <td>${msg.name}</td>
                    <td><a href="mailto:${msg.email}">${msg.email}</a></td>
                    <td title="${msg.message}">${msg.message}</td>
                `;
                messagesTableBody.appendChild(tr);
            });
        } catch (err) {
            messagesTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444;">Failed to load messages.</td></tr>';
        }
    }
});
