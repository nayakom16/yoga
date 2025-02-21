document.addEventListener('DOMContentLoaded', () => {
    const articleForm = document.getElementById('articleForm');
    const verificationRequestForm = document.getElementById('verificationRequestForm');
    const verificationStatus = document.getElementById('verificationStatus');
    const verificationRequestSection = document.getElementById('verificationRequestSection');
    const loginMessage = document.getElementById('loginMessage');

    // Check user authentication and verification status
    checkUserStatus();

    async function checkUserStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showLoginMessage();
                return;
            }

            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const user = await response.json();
            handleUserStatus(user);
        } catch (error) {
            console.error('Error checking user status:', error);
            showLoginMessage();
        }
    }

    function handleUserStatus(user) {
        verificationStatus.classList.remove('d-none');
        
        if (user.role === 'verified_author' || user.role === 'admin') {
            // Show article form for verified authors and admins
            verificationStatus.classList.add('alert-success');
            verificationStatus.textContent = 'You are a verified author. You can submit articles.';
            articleForm.classList.remove('d-none');
            verificationRequestSection.classList.add('d-none');
        } else if (user.verificationStatus === 'pending') {
            // Show pending message
            verificationStatus.classList.add('alert-warning');
            verificationStatus.textContent = 'Your author verification request is pending review.';
            articleForm.classList.add('d-none');
            verificationRequestSection.classList.add('d-none');
        } else if (user.verificationStatus === 'rejected') {
            // Show rejected message with option to reapply
            verificationStatus.classList.add('alert-danger');
            verificationStatus.textContent = 'Your previous verification request was rejected. You can submit a new request.';
            articleForm.classList.add('d-none');
            verificationRequestSection.classList.remove('d-none');
        } else {
            // Show verification request form for unverified users
            verificationStatus.classList.add('alert-info');
            verificationStatus.textContent = 'Please submit your verification request to become an author.';
            articleForm.classList.add('d-none');
            verificationRequestSection.classList.remove('d-none');
        }
    }

    function showLoginMessage() {
        verificationStatus.classList.add('d-none');
        articleForm.classList.add('d-none');
        verificationRequestSection.classList.add('d-none');
        loginMessage.classList.remove('d-none');
    }

    // Handle verification request submission
    if (verificationRequestForm) {
        verificationRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = {
                    experience: document.getElementById('experience').value,
                    certifications: document.getElementById('certifications').value.split(',').map(cert => cert.trim()),
                    teachingExperience: document.getElementById('teachingExperience').value,
                    specializations: document.getElementById('specializations').value.split(',').map(spec => spec.trim())
                };

                const token = localStorage.getItem('token');
                const response = await fetch('/api/users/request-verification', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to submit verification request');
                }

                alert('Verification request submitted successfully! Our team will review your request.');
                window.location.reload();
            } catch (error) {
                console.error('Error submitting verification request:', error);
                alert('Error submitting verification request. Please try again.');
            }
        });
    }

    // Handle article submission
    if (articleForm) {
        articleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = new FormData();
                formData.append('title', document.getElementById('title').value);
                formData.append('category', document.getElementById('category').value);
                formData.append('content', document.getElementById('content').value);
                
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
                    throw new Error('Failed to submit article');
                }

                alert('Article submitted successfully! It will be reviewed by our team.');
                articleForm.reset();
            } catch (error) {
                console.error('Error submitting article:', error);
                alert('Error submitting article. Please try again.');
            }
        });
    }
});
