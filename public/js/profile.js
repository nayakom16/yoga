document.addEventListener('DOMContentLoaded', () => {
    protectRoute();

    // Initialize elements
    const articleForm = document.getElementById('articleForm');
    const verificationStatusMessage = document.getElementById('verificationStatusMessage');
    const verificationMessageText = document.getElementById('verificationMessageText');
    const verificationWarning = document.getElementById('verificationWarning');
    const submitArticleBtn = document.getElementById('submitArticleBtn');

    // Handle author verification form submission
    const verificationForm = document.getElementById('authorVerificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            try {
                const formData = {
                    yogaBackground: {
                        experience: document.getElementById('experience').value,
                        certifications: document.getElementById('certifications').value.split(',').map(c => c.trim()),
                        teachingExperience: document.getElementById('teachingExperience').value,
                        specializations: document.getElementById('specializations').value.split(',').map(s => s.trim())
                    }
                };

                const token = localStorage.getItem('token');
                const response = await fetch('/api/users/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to submit verification request');
                }

                alert('Verification request submitted successfully! Our team will review your application.');
                verificationForm.reset();
                
                // Immediately check status after submission
                await checkVerificationStatus();
            } catch (error) {
                console.error('Error submitting verification:', error);
                alert('Error submitting verification request. Please try again.');
            }
        });
    }

    // Handle article form submission
    if (articleForm) {
        articleForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            try {
                const formData = new FormData();
                formData.append('title', document.getElementById('articleTitle').value);
                formData.append('category', document.getElementById('articleCategory').value);
                formData.append('content', document.getElementById('articleContent').value);
                
                const imageFile = document.getElementById('articleImage').files[0];
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
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to submit article');
                }

                alert('Article submitted successfully! It will be reviewed by our team.');
                articleForm.reset();
                loadUserArticles(); // Refresh the articles list
            } catch (error) {
                console.error('Error submitting article:', error);
                alert(error.message || 'Error submitting article. Please try again.');
            }
        });
    }

    // Check user verification status
    async function checkVerificationStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await fetch('/api/users/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch user data');
            }

            const userData = await response.json();
            console.log('User data:', userData); // For debugging
            console.log('User verification status:', userData.verificationStatus);
            console.log('User role:', userData.role);

            // Update UI based on verification status
            verificationStatusMessage.style.display = 'block';
            verificationForm.style.display = 'none'; // Hide form by default
            
            if (userData.role === 'verified_author' || userData.role === 'admin') {
                verificationStatusMessage.className = 'verification-message success';
                verificationMessageText.textContent = '✓ You are a Verified Author';
                verificationWarning.style.display = 'none';
                submitArticleBtn.disabled = false;
            } else if (userData.verificationStatus === 'pending') {
                verificationStatusMessage.className = 'verification-message warning';
                verificationMessageText.textContent = '⏳ Your verification request is pending review';
                verificationWarning.style.display = 'block';
                submitArticleBtn.disabled = true;
            } else if (userData.verificationStatus === 'rejected') {
                verificationStatusMessage.className = 'verification-message error';
                verificationMessageText.textContent = '✕ Your verification request was rejected. You can submit a new request.';
                verificationWarning.style.display = 'block';
                submitArticleBtn.disabled = true;
                verificationForm.style.display = 'block'; // Show form for rejected users
            } else {
                verificationStatusMessage.className = 'verification-message warning';
                verificationMessageText.textContent = 'Submit verification request to become an author';
                verificationWarning.style.display = 'block';
                submitArticleBtn.disabled = true;
                verificationForm.style.display = 'block'; // Show form for new users
            }
        } catch (error) {
            console.error('Error checking verification status:', error);
            verificationStatusMessage.style.display = 'block';
            verificationStatusMessage.className = 'verification-message error';
            verificationMessageText.textContent = error.message || 'Error checking verification status. Please try again later.';
            verificationWarning.style.display = 'block';
            submitArticleBtn.disabled = true;
        }
    }

    // Load user profile
    async function loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const user = await response.json();

            // Set form values
            document.getElementById('name').value = user.name || '';
            document.getElementById('email').value = user.email || '';

            // Update verification status
            updateVerificationStatus(user);

            // Display author details if user is verified
            const authorDetailsSection = document.getElementById('authorDetailsSection');
            if (user.yogaBackground && (user.verificationStatus === 'approved' || user.verificationStatus === 'pending')) {
                authorDetailsSection.style.display = 'block';
                
                // Update author details
                document.getElementById('authorExperience').textContent = user.yogaBackground.experience || 'Not specified';
                document.getElementById('authorCertifications').textContent = user.yogaBackground.certifications?.join(', ') || 'None';
                document.getElementById('authorTeaching').textContent = user.yogaBackground.teachingExperience || 'Not specified';
                document.getElementById('authorSpecializations').textContent = user.yogaBackground.specializations?.join(', ') || 'None';
                
                const statusSpan = document.getElementById('authorVerificationStatus');
                statusSpan.textContent = user.verificationStatus === 'approved' ? 'Verified' : 'Pending';
                statusSpan.className = user.verificationStatus === 'approved' ? 'verified' : 'pending';
            } else {
                authorDetailsSection.style.display = 'none';
            }

            // Show/hide verification form based on status
            const verificationForm = document.getElementById('verificationForm');
            if (verificationForm) {
                if (user.verificationStatus === 'pending' || user.verificationStatus === 'approved') {
                    verificationForm.style.display = 'none';
                } else {
                    verificationForm.style.display = 'block';
                }
            }

            // Enable/disable article submission based on verification status
            const submitArticleBtn = document.getElementById('submitArticleBtn');
            if (submitArticleBtn) {
                submitArticleBtn.disabled = user.verificationStatus !== 'approved';
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('error', 'Failed to load profile. Please try again later.');
        }
    }

    // Update verification status display
    function updateVerificationStatus(user) {
        const verificationStatus = document.getElementById('verificationStatus');
        if (!verificationStatus) return;

        let statusText = '';
        let statusClass = '';

        switch (user.verificationStatus) {
            case 'approved':
                statusText = '✓ You are a Verified Author';
                statusClass = 'success';
                break;
            case 'pending':
                statusText = '⏳ Your verification request is pending review';
                statusClass = 'warning';
                break;
            case 'rejected':
                statusText = '✕ Your verification request was rejected. You can submit a new request.';
                statusClass = 'error';
                break;
            default:
                statusText = 'Submit verification request to become an author';
                statusClass = '';
        }

        verificationStatus.textContent = statusText;
        verificationStatus.className = `verification-message ${statusClass}`;
    }

    // Load user's bookings
    async function loadUserBookings() {
        const bookingsContainer = document.getElementById('userBookings');
        if (!bookingsContainer) return;

        bookingsContainer.innerHTML = '<div class="loading">Loading your bookings...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/events/user/bookings', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load bookings');
            }

            const bookings = await response.json();

            if (bookings.length === 0) {
                bookingsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't booked any events yet.</p>
                        <p>Check out our upcoming events!</p>
                    </div>`;
                return;
            }

            bookingsContainer.innerHTML = bookings.map(booking => `
                <div class="booking-card">
                    <h4>${booking.event.title}</h4>
                    <p><strong>Date:</strong> ${new Date(booking.event.date).toLocaleDateString()}</p>
                    <p><strong>Tickets:</strong> ${booking.quantity} ${booking.ticketType}</p>
                    <p><strong>Status:</strong> <span class="status ${booking.status.toLowerCase()}">${booking.status}</span></p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading bookings:', error);
            bookingsContainer.innerHTML = '<div class="alert alert-danger">Error loading your bookings. Please try again later.</div>';
        }
    }

    // Load user's articles
    async function loadUserArticles() {
        const articlesContainer = document.getElementById('userArticles');
        if (!articlesContainer) return;

        articlesContainer.innerHTML = '<div class="loading">Loading your articles...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/articles/user', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load articles');
            }

            const articles = await response.json();

            if (articles.length === 0) {
                articlesContainer.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't written any articles yet.</p>
                        <p>Share your yoga knowledge with our community!</p>
                    </div>`;
                return;
            }

            articlesContainer.innerHTML = articles.map(article => `
                <div class="article-card">
                    <h4>${article.title}</h4>
                    <p class="status ${article.status}">${article.status}</p>
                    <p>${article.content.substring(0, 150)}...</p>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-primary" onclick="viewArticle('${article._id}')">View</button>
                        <button class="btn btn-sm btn-secondary" onclick="editArticle('${article._id}')">Edit</button>
                        ${article.status === 'draft' ? 
                            `<button class="btn btn-sm btn-success" onclick="submitForReview('${article._id}')">Submit for Review</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteArticle('${article._id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading articles:', error);
            articlesContainer.innerHTML = '<div class="alert alert-danger">Error loading your articles. Please try again later.</div>';
        }
    }

    // Initialize page
    checkVerificationStatus();
    loadUserProfile();
    loadUserBookings();
    loadUserArticles();

    // Check verification status every 10 seconds
    setInterval(checkVerificationStatus, 10000);
});

// Article management functions
function viewArticle(id) {
    window.location.href = `/article-detail.html?id=${id}`;
}

async function editArticle(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch article');
        }

        const article = await response.json();
        
        // Populate form with article data
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleCategory').value = article.category;
        document.getElementById('articleContent').value = article.content;
        
        // Change form submission to update instead of create
        const articleForm = document.getElementById('articleForm');
        articleForm.dataset.mode = 'edit';
        articleForm.dataset.articleId = id;
        document.getElementById('submitArticleBtn').textContent = 'Update Article';
        
        // Scroll to form
        articleForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading article for edit:', error);
        alert('Error loading article. Please try again.');
    }
}

async function submitForReview(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/articles/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'pending' })
        });

        if (!response.ok) {
            throw new Error('Failed to submit article for review');
        }

        alert('Article submitted for review successfully!');
        loadUserArticles();
    } catch (error) {
        console.error('Error submitting article for review:', error);
        alert('Error submitting article for review. Please try again.');
    }
}

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
        loadUserArticles();
    } catch (error) {
        console.error('Error deleting article:', error);
        alert('Error deleting article. Please try again.');
    }
}
