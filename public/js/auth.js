// Handle user registration
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/profile.html';
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message);
    }
}

// Handle user login
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/profile.html';
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
    }
}

// Update user profile
async function updateProfile(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value
    };

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Profile updated successfully!');
            location.reload();
        } else {
            throw new Error(data.error || 'Profile update failed');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        alert(error.message);
    }
}

// Load user profile data
async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const user = await response.json();
        
        if (response.ok) {
            // Update profile form fields
            document.getElementById('name').value = user.name;
            document.getElementById('email').value = user.email;
            
            // Update verification status if applicable
            const verificationStatus = document.getElementById('verificationStatus');
            if (verificationStatus) {
                if (user.isVerified) {
                    verificationStatus.textContent = 'Verified Author';
                    verificationStatus.classList.add('verified');
                } else if (user.verificationStatus === 'pending') {
                    verificationStatus.textContent = 'Verification Pending';
                    verificationStatus.classList.add('pending');
                }
            }
            
            // Show/hide article sharing section based on verification status
            const articleSection = document.getElementById('articleSection');
            if (articleSection) {
                if (user.isVerified) {
                    articleSection.classList.remove('hidden');
                } else {
                    articleSection.classList.add('hidden');
                }
            }
        } else {
            throw new Error(user.error || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Profile loading error:', error);
        alert(error.message);
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Protect routes that require authentication
function protectRoute() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

// Add event listeners to forms if they exist
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
        loadProfile();
    }
});
