document.addEventListener('DOMContentLoaded', () => {
    const articlesGrid = document.getElementById('articles-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noArticlesMessage = document.getElementById('no-articles');
    const categoryFilter = document.getElementById('categoryFilter');
    const requestAuthorBtn = document.getElementById('requestAuthorBtn');
    const articleForm = document.getElementById('articleForm');

    // Handle article submission
    if (articleForm) {
        articleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = {
                    title: document.getElementById('title').value,
                    category: document.getElementById('category').value,
                    imageUrl: document.getElementById('imageUrl').value,
                    content: document.getElementById('content').value
                };

                const response = await fetch('/api/articles/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to submit article');
                }

                const result = await response.json();
                alert('Article submitted successfully! It will be reviewed by our team.');
                articleForm.reset();
            } catch (error) {
                console.error('Error submitting article:', error);
                alert('Error submitting article. Please try again later.');
            }
        });
    }

    // Function to fetch and display articles
    async function fetchArticles(category = '') {
        try {
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            noArticlesMessage.style.display = 'none';
            articlesGrid.innerHTML = '';

            // Fetch published articles
            const url = category ? `/api/articles?category=${category}` : '/api/articles';
            console.log('Fetching articles from:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const articles = await response.json();
            console.log('Fetched articles:', articles);

            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Check if no articles
            if (!articles || articles.length === 0) {
                noArticlesMessage.textContent = 'No articles found in this category.';
                noArticlesMessage.style.display = 'block';
                return;
            }

            // Render articles
            articles.forEach(article => {
                const articleCard = createArticleCard(article);
                articlesGrid.appendChild(articleCard);
            });
        } catch (error) {
            console.error('Error fetching articles:', error);
            loadingIndicator.style.display = 'none';
            noArticlesMessage.textContent = 'Error loading articles. Please try again later.';
            noArticlesMessage.style.display = 'block';
        }
    }

    // Function to create article card
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.classList.add('col');
        
        const placeholderImage = 'https://via.placeholder.com/300x200.png?text=Yoga+Article';
        const imageUrl = article.imageUrl || placeholderImage;
        const authorName = article.author ? article.author.name : 'Unknown Author';
        
        const cardHtml = `
            <div class="card article-card h-100" onclick="window.location.href='/article-detail.html?id=${article._id}'">
                <img src="${imageUrl}" class="card-img-top article-image" alt="${article.title}" onerror="this.src='${placeholderImage}'">
                <span class="article-category">${article.category}</span>
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${truncateText(article.content, 150)}</p>
                </div>
                <div class="card-footer">
                    <small class="text-muted">By ${authorName} • ${new Date(article.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `;
        
        card.innerHTML = cardHtml;
        return card;
    }

    // Function to truncate text
    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Handle category filter change
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            fetchArticles(e.target.value);
        });
    }

    // Handle request author button click
    if (requestAuthorBtn) {
        requestAuthorBtn.addEventListener('click', () => {
            window.location.href = '/request-author.html';
        });
    }

    // Fetch articles when page loads
    fetchArticles();
});
