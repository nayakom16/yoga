document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Show loading
    document.querySelector('.loading').style.display = 'block';
    document.querySelector('.error-message').style.display = 'none';

    try {
        const response = await fetch('/api/company-admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('adminToken', data.adminToken);
        localStorage.setItem('adminUser', JSON.stringify(data.user));

        // Show success message
        document.querySelector('.success-message').style.display = 'block';
        document.querySelector('.success-message').textContent = 'Login successful! Redirecting...';

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/company-admin/dashboard.html';
        }, 1000);

    } catch (error) {
        // Show error message
        document.querySelector('.error-message').style.display = 'block';
        document.querySelector('.error-message').textContent = error.message || 'Login failed';
        
        // Log error for debugging
        console.error('Login error:', error);
        
        if (document.getElementById('debug')) {
            document.getElementById('debug').style.display = 'block';
            document.getElementById('debug').textContent = `Debug info: ${error.toString()}`;
        }
    } finally {
        // Hide loading
        document.querySelector('.loading').style.display = 'none';
    }
});
