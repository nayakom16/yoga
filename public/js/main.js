// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFeaturedArticles();
    loadUpcomingEvents();
});

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('token');
    const authLinks = document.getElementById('authLinks');
    const userProfile = document.getElementById('userProfile');
    
    if (token) {
        authLinks.classList.add('hidden');
        userProfile.classList.remove('hidden');
        
        // Load user data
        fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(user => {
            // Update UI with user data if needed
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    } else {
        authLinks.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
}

// Load featured articles
function loadFeaturedArticles() {
    const articlesContainer = document.getElementById('featuredArticles');
    if (!articlesContainer) return;

    fetch('/api/articles')
        .then(res => res.json())
        .then(articles => {
            const featuredArticles = articles.slice(0, 3);
            articlesContainer.innerHTML = featuredArticles.map(article => `
                <div class="article-card">
                    <img src="${article.image || '/images/default-article.jpg'}" alt="${article.title}">
                    <div class="article-content">
                        <h3>${article.title}</h3>
                        <p>${article.content.substring(0, 150)}...</p>
                        <a href="/article.html?id=${article._id}" class="btn">Read More</a>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading articles:', error);
            articlesContainer.innerHTML = '<p>Error loading articles. Please try again later.</p>';
        });
}

// Load upcoming events
function loadUpcomingEvents() {
    const eventsContainer = document.getElementById('upcomingEvents');
    if (!eventsContainer) return;

    fetch('/api/events')
        .then(res => res.json())
        .then(events => {
            const upcomingEvents = events; // Use all upcoming events
            eventsContainer.innerHTML = upcomingEvents.map(event => `
                <div class="event-card">
                    <img src="${event.image || '/images/default-event.jpg'}" alt="${event.title}">
                    <div class="event-content">
                        <h3>${event.title}</h3>
                        <p>${event.description.substring(0, 150)}...</p>
                        <div class="event-meta">
                            <span>${new Date(event.date).toLocaleDateString()}</span>
                            <span>${event.location.city}</span>
                        </div>
                        <a href="/event.html?id=${event._id}" class="btn">Learn More</a>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading events:', error);
            eventsContainer.innerHTML = '<p>Error loading events. Please try again later.</p>';
        });
}

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });
}

// Handle article sharing (for verified authors)
async function handleArticleShare(formData) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('articleMessage', 'Please log in to share articles', 'error');
            return;
        }

        const user = await getCurrentUser();
        if (!user.isVerified) {
            showMessage('articleMessage', 'Your account needs to be verified before you can post articles. Please contact support.', 'error');
            return;
        }

        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('articleMessage', 'Article submitted successfully! It will be reviewed before publishing.', 'success');
            document.getElementById('articleForm').reset();
        } else {
            showMessage('articleMessage', data.message || 'Error submitting article', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('articleMessage', 'Error submitting article', 'error');
    }
}

function showMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        messageElement.style.display = 'block';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

async function getCurrentUser() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/users/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
}

// Handle event booking
function handleEventBooking(eventId, formData) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    fetch(`/api/events/${eventId}/book`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(booking => {
        alert('Event booked successfully! Check your email for tickets.');
        window.location.href = '/profile.html';
    })
    .catch(error => {
        console.error('Error booking event:', error);
        alert('Error booking event. Please try again.');
    });
}

// Handle user verification request
function handleVerificationRequest(formData) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    fetch('/api/auth/verify-author', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(response => {
        alert('Verification request submitted successfully!');
        window.location.href = '/profile.html';
    })
    .catch(error => {
        console.error('Error submitting verification request:', error);
        alert('Error submitting request. Please try again.');
    });
}
