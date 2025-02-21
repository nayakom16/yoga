// Check for authentication
const adminToken = localStorage.getItem('adminToken');
if (!adminToken) {
    window.location.href = '/company-admin/login.html';
}

// Add token to all API requests
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
};

// Navigation
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        showPage(page);
    });
});

function showPage(pageId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageId}Page`).classList.add('active');
    loadPageData(pageId);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/company-admin/login.html';
});

// Load Dashboard Data
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/company-admin/dashboard', { headers });
        const data = await response.json();
        
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('pendingVerifications').textContent = data.pendingVerifications;
        document.getElementById('pendingArticles').textContent = data.pendingArticles;
        document.getElementById('activeEvents').textContent = data.upcomingEvents;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load User Management Data
async function loadUserData() {
    try {
        const response = await fetch('/api/company-admin/verify-authors', { headers });
        const authors = await response.json();
        
        const authorsList = document.getElementById('pendingAuthors');
        authorsList.innerHTML = authors.map(author => `
            <div class="author-card">
                <h4>${author.name}</h4>
                <p>Email: ${author.email}</p>
                <div class="action-buttons">
                    <button onclick="verifyAuthor('${author._id}', 'approved')">Approve</button>
                    <button onclick="verifyAuthor('${author._id}', 'rejected')">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Verify Author
async function verifyAuthor(authorId, status) {
    try {
        await fetch(`/api/company-admin/verify-authors/${authorId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status })
        });
        loadUserData();
    } catch (error) {
        console.error('Error verifying author:', error);
    }
}

// Load Articles Data
async function loadArticlesData() {
    try {
        const response = await fetch('/api/company-admin/articles', { headers });
        const articles = await response.json();
        
        const articlesList = document.getElementById('pendingArticlesList');
        articlesList.innerHTML = articles.map(article => `
            <div class="article-card">
                <h4>${article.title}</h4>
                <p>Author: ${article.author.name}</p>
                <div class="action-buttons">
                    <button onclick="reviewArticle('${article._id}', 'published')">Publish</button>
                    <button onclick="reviewArticle('${article._id}', 'rejected')">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading articles:', error);
    }
}

// Review Article
async function reviewArticle(articleId, status) {
    try {
        await fetch(`/api/company-admin/articles/${articleId}/review`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status })
        });
        loadArticlesData();
    } catch (error) {
        console.error('Error reviewing article:', error);
    }
}

// Event Management
const eventModal = document.getElementById('eventModal');
const addEventBtn = document.getElementById('addEventBtn');
const closeModal = document.querySelector('.close');

addEventBtn.onclick = () => eventModal.style.display = "block";
closeModal.onclick = () => eventModal.style.display = "none";

window.onclick = (event) => {
    if (event.target == eventModal) {
        eventModal.style.display = "none";
    }
}

// Load Events Data
async function loadEventsData() {
    try {
        const response = await fetch('/api/company-admin/events', { headers });
        const events = await response.json();
        
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = events.map(event => `
            <div class="event-card">
                <h4>${event.title}</h4>
                <p>Date: ${new Date(event.date).toLocaleDateString()}</p>
                <p>Location: ${event.location}</p>
                <div class="action-buttons">
                    <button onclick="editEvent('${event._id}')">Edit</button>
                    <button onclick="deleteEvent('${event._id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Page Load Handler
function loadPageData(page) {
    switch(page) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'users':
            loadUserData();
            break;
        case 'articles':
            loadArticlesData();
            break;
        case 'events':
            loadEventsData();
            break;
    }
}

// Initial load
loadDashboardStats();
