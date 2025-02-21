document.addEventListener('DOMContentLoaded', () => {
    // Load articles for each status
    loadArticles('published');
    loadArticles('pending');
    loadArticles('draft');

    // Handle article creation
    const createArticleForm = document.getElementById('createArticleForm');
    const submitArticleBtn = document.getElementById('submitArticle');

    submitArticleBtn.addEventListener('click', async () => {
        try {
            const formData = new FormData();
            formData.append('title', document.getElementById('title').value);
            formData.append('category', document.getElementById('category').value);
            formData.append('content', document.getElementById('content').value);
            formData.append('status', document.querySelector('input[name="status"]:checked').value);
            
            const imageFile = document.getElementById('image').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const token = localStorage.getItem('token');
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to create article');
            }

            const result = await response.json();
            alert('Article created successfully!');
            
            // Close modal and refresh articles
            const modal = bootstrap.Modal.getInstance(document.getElementById('createArticleModal'));
            modal.hide();
            createArticleForm.reset();
            
            // Reload appropriate tab
            loadArticles(result.status);
        } catch (error) {
            console.error('Error creating article:', error);
            alert('Error creating article. Please try again.');
        }
    });
});

// Load articles by status
async function loadArticles(status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/admin/list?status=${status}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        const articles = await response.json();
        const tableBody = document.querySelector(`#${status}ArticlesTable tbody`);
        tableBody.innerHTML = '';

        articles.forEach(article => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${article.title}</td>
                <td>${article.author ? article.author.name : 'System'}</td>
                <td>${article.category}</td>
                <td>${new Date(article.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewArticle('${article._id}')">View</button>
                    ${status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveArticle('${article._id}')">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectArticle('${article._id}')">Reject</button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteArticle('${article._id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error(`Error loading ${status} articles:`, error);
        alert(`Error loading ${status} articles. Please try again.`);
    }
}

// View article
function viewArticle(id) {
    window.location.href = `/article-detail.html?id=${id}`;
}

// Approve article
async function approveArticle(id) {
    try {
        const comments = prompt('Add any approval comments (optional):');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/admin/approve/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comments })
        });

        if (!response.ok) {
            throw new Error('Failed to approve article');
        }

        alert('Article approved successfully!');
        loadArticles('pending');
        loadArticles('published');
    } catch (error) {
        console.error('Error approving article:', error);
        alert('Error approving article. Please try again.');
    }
}

// Reject article
async function rejectArticle(id) {
    try {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/admin/reject/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        if (!response.ok) {
            throw new Error('Failed to reject article');
        }

        alert('Article rejected successfully!');
        loadArticles('pending');
        loadArticles('rejected');
    } catch (error) {
        console.error('Error rejecting article:', error);
        alert('Error rejecting article. Please try again.');
    }
}

// Delete article
async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete article');
        }

        alert('Article deleted successfully!');
        loadArticles('published');
        loadArticles('pending');
        loadArticles('draft');
    } catch (error) {
        console.error('Error deleting article:', error);
        alert('Error deleting article. Please try again.');
    }
}
