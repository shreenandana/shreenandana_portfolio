document.addEventListener('DOMContentLoaded', () => {
    // Init Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    document.getElementById('year').textContent = new Date().getFullYear();

    // Load Data
    fetchContent();
    fetchSkills();
    fetchProjects();

    // Form Handle
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', submitForm);
    }
});

async function fetchContent() {
    try {
        const res = await fetch('/api/content');
        if (!res.ok) return;
        const data = await res.json();

        if (data.hero_greeting && data.hero_name) {
            document.getElementById('hero-greeting').innerHTML = `${data.hero_greeting} <span id="hero-name">${data.hero_name}</span>`;
        }
        if (data.hero_role) document.getElementById('hero-role').textContent = data.hero_role;
        if (data.hero_description) document.getElementById('hero-description').textContent = data.hero_description;
        if (data.about_p1) document.getElementById('about-p1').textContent = data.about_p1;
        if (data.about_p2) document.getElementById('about-p2').textContent = data.about_p2;
    } catch (err) {
        console.error('Error fetching content:', err);
    }
}

async function fetchSkills() {
    try {
        const res = await fetch('/api/skills');
        if (!res.ok) return;
        const skills = await res.json();

        const container = document.getElementById('skills-container');
        if (skills && skills.length > 0) {
            container.innerHTML = '';
            skills.forEach(skill => {
                const sp = document.createElement('span');
                sp.textContent = skill.name;
                container.appendChild(sp);
            });
        }
    } catch (err) {
        console.error('Error fetching skills:', err);
    }
}

async function fetchProjects() {
    try {
        const res = await fetch('/api/projects');
        if (!res.ok) return;
        const projects = await res.json();

        const grid = document.getElementById('project-grid');
        if (projects && projects.length > 0) {
            grid.innerHTML = '';
            projects.forEach(p => {
                const card = document.createElement('div');
                card.className = 'project-card';

                let linksHTML = '';
                if (p.code_url) linksHTML += `<a href="${p.code_url}" target="_blank"><i data-lucide="github"></i> Code</a>`;
                if (p.live_url) linksHTML += `<a href="${p.live_url}" target="_blank"><i data-lucide="external-link"></i> Live</a>`;

                card.innerHTML = `
                    <div class="project-image">
                        <img src="${p.image_url || 'https://via.placeholder.com/400x200?text=Project'}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/400x200?text=Project'">
                    </div>
                    <div class="project-info">
                        <h3>${p.title}</h3>
                        <p>${p.description}</p>
                        <div class="project-links">${linksHTML}</div>
                    </div>
                `;
                grid.appendChild(card);
            });
            lucide.createIcons();
        } else {
            grid.innerHTML = '<p>No projects found.</p>';
        }
    } catch (err) {
        console.error('Error fetching projects:', err);
    }
}

async function submitForm(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const statusText = document.getElementById('form-status');

    btn.textContent = 'Sending...';
    btn.disabled = true;
    statusText.textContent = '';
    statusText.className = 'form-status';

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            })
        });

        if (res.ok) {
            e.target.reset();
            statusText.textContent = 'Message sent successfully!';
            statusText.classList.add('success');
        } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to send message.');
        }
    } catch (err) {
        statusText.textContent = err.message;
        statusText.classList.add('error');
    } finally {
        btn.textContent = 'Send Message';
        btn.disabled = false;
        setTimeout(() => { statusText.textContent = ''; }, 5000);
    }
}
