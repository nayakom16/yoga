// Check if admin is logged in
const adminToken = localStorage.getItem('adminToken');
if (!adminToken) {
    window.location.href = '/company-admin/login.html';
}

// Add authorization header to all fetch requests
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
};

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Show selected section
        const sectionId = this.getAttribute('data-section');
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(sectionId).classList.remove('d-none');

        // Load section data
        if (sectionId === 'verifications') loadPendingVerifications();
        else if (sectionId === 'articles') loadArticles();
        else if (sectionId === 'dashboard') loadDashboardStats();
    });
});

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/company-admin/dashboard-stats', { 
            method: 'GET',
            headers 
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load dashboard stats');
        }
        
        const stats = await response.json();
        
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('pendingVerifications').textContent = stats.pendingVerifications || 0;
        document.getElementById('totalArticles').textContent = stats.totalArticles || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('error', error.message);
    }
}

// Load pending verifications
async function loadPendingVerifications() {
    try {
        const response = await fetch('/api/company-admin/pending-verifications', { 
            method: 'GET',
            headers 
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load pending verifications');
        }
        
        const users = await response.json();
        const container = document.getElementById('pendingVerificationsContainer');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No pending verifications</div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">${user.name}</h5>
                    <p class="card-text">Email: ${user.email}</p>
                    <div class="mb-3">
                        <h6>Yoga Background:</h6>
                        <p class="mb-1"><strong>Experience:</strong> ${user.yogaBackground?.experience || 'Not provided'}</p>
                        <p class="mb-1"><strong>Teaching Experience:</strong> ${user.yogaBackground?.teachingExperience || 'Not provided'}</p>
                        <p class="mb-1"><strong>Certifications:</strong> ${user.yogaBackground?.certifications?.join(', ') || 'None'}</p>
                        <p class="mb-1"><strong>Specializations:</strong> ${user.yogaBackground?.specializations?.join(', ') || 'None'}</p>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success me-2" onclick="approveUser('${user._id}')">
                            Approve
                        </button>
                        <button class="btn btn-danger" onclick="rejectUser('${user._id}')">
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading verifications:', error);
        showToast('error', error.message);
    }
}

// Load articles
async function loadArticles() {
    try {
        const response = await fetch('/api/company-admin/articles', { 
            method: 'GET',
            headers 
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load articles');
        }
        
        const articles = await response.json();
        const container = document.getElementById('articlesContainer');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No articles found</div>';
            return;
        }
        
        container.innerHTML = articles.map(article => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${article.imageUrl}" class="img-fluid rounded" alt="Article image">
                        </div>
                        <div class="col-md-9">
                            <h5 class="card-title">${article.title}</h5>
                            <p class="card-text mb-1">
                                <strong>Author:</strong> ${article.author?.name || 'Unknown'} 
                                (${article.author?.email || 'No email'})
                            </p>
                            <p class="card-text mb-2">
                                <strong>Category:</strong> ${article.category}
                                <span class="badge bg-${getStatusBadgeColor(article.status)} ms-2">${article.status}</span>
                            </p>
                            <div class="article-content mb-3">
                                ${article.content.substring(0, 200)}...
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-primary me-2" onclick='viewArticle(${JSON.stringify(article).replace(/'/g, "\\'")})'">
                                    View Full Article
                                </button>
                                ${article.status === 'pending' ? `
                                    <button class="btn btn-success me-2" onclick="approveArticle('${article._id}')">
                                        Approve
                                    </button>
                                    <button class="btn btn-danger me-2" onclick="rejectArticle('${article._id}')">
                                        Reject
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger" onclick="deleteArticle('${article._id}')">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading articles:', error);
        showToast('error', error.message);
    }
}

// View article details
function viewArticle(article) {
    const modalHtml = `
        <div class="modal fade" id="articleModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${article.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <img src="${article.imageUrl}" class="img-fluid rounded mb-3" alt="Article image">
                        <p class="text-muted mb-1">
                            <strong>Author:</strong> ${article.author?.name || 'Unknown'} 
                            (${article.author?.email || 'No email'})
                        </p>
                        <p class="mb-3">
                            <strong>Category:</strong> ${article.category}
                            <span class="badge bg-${getStatusBadgeColor(article.status)} ms-2">${article.status}</span>
                        </p>
                        <div class="article-content">
                            ${article.content}
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${article.status === 'pending' ? `
                            <button class="btn btn-success me-2" onclick="approveArticle('${article._id}')" data-bs-dismiss="modal">
                                Approve Article
                            </button>
                            <button class="btn btn-danger me-2" onclick="rejectArticle('${article._id}')" data-bs-dismiss="modal">
                                Reject Article
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('articleModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('articleModal'));
    modal.show();
}

// Get status badge color
function getStatusBadgeColor(status) {
    switch (status) {
        case 'published':
            return 'success';
        case 'pending':
            return 'warning';
        case 'rejected':
            return 'danger';
        default:
            return 'secondary';
    }
}

// Approve user
async function approveUser(userId) {
    try {
        const response = await fetch(`/api/company-admin/approve-verification/${userId}`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to approve user');
        }
        
        showToast('success', 'User approved successfully');
        await loadPendingVerifications();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error approving user:', error);
        showToast('error', error.message);
    }
}

// Reject user
async function rejectUser(userId) {
    try {
        const response = await fetch(`/api/company-admin/reject-verification/${userId}`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reject user');
        }
        
        showToast('success', 'User rejected successfully');
        await loadPendingVerifications();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error rejecting user:', error);
        showToast('error', error.message);
    }
}

// Approve article
async function approveArticle(articleId) {
    try {
        const response = await fetch(`/api/company-admin/approve-article/${articleId}`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to approve article');
        }
        
        showToast('success', 'Article approved successfully');
        await loadArticles();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error approving article:', error);
        showToast('error', error.message);
    }
}

// Reject article
async function rejectArticle(articleId) {
    try {
        const response = await fetch(`/api/company-admin/reject-article/${articleId}`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reject article');
        }
        
        showToast('success', 'Article rejected successfully');
        await loadArticles();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error rejecting article:', error);
        showToast('error', error.message);
    }
}

// Delete article
async function deleteArticle(articleId) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
        const response = await fetch(`/api/company-admin/articles/${articleId}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete article');
        }
        
        showToast('success', 'Article deleted successfully');
        await loadArticles();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error deleting article:', error);
        showToast('error', error.message);
    }
}

// Show toast notification
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Logout function
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/company-admin/login.html';
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadPendingVerifications();
    
    // Add click handlers for tabs
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (this.getAttribute('data-bs-target') === '#articles') {
                loadArticles();
            } else if (this.getAttribute('data-bs-target') === '#verifications') {
                loadPendingVerifications();
            }
        });
    });
});
