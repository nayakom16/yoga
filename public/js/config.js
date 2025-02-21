// Get port from server or default to 4000
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const API_URL = `http://localhost:${PORT}`;

// Export configuration
window.appConfig = {
    apiUrl: API_URL
};
