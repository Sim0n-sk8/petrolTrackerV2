// =============== CONFIGURATION ===============
const CONFIG = {
    supabaseUrl: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    fuelEfficiency: 11.47,
    users: {
        'simon': { password: '@Ngrybirds71', isAdmin: true },
        'jaric': { password: 'pH0tos', isAdmin: false },
        'dornel': { password: 'suNfl0wer', isAdmin: false },
        'charl': { password: 'g0Lf1ng', isAdmin: false },
        'michael': { password: 'f1Shing', isAdmin: false }
    }
};

// =============== INITIALIZATION ===============
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure Supabase is available
    if (!window.supabase) {
        console.error("Supabase is not loaded. Ensure you have included the Supabase script.");
        return;
    }

    // Load Supabase client
    const { createClient } = window.supabase;
    const supabaseClient = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

    // =============== DOM ELEMENTS ===============
    const elements = {
        authContainer: document.getElementById('auth-container'),
        appContainer: document.getElementById('app-container'),
        loginForm: document.getElementById('login-form'),
        usernameInput: document.getElementById('username'),
        passwordInput: document.getElementById('password'),
        loginError: document.getElementById('login-error'),
        currentUserDisplay: document.getElementById('current-user'),
        adminBadge: document.getElementById('admin-badge'),
        logoutButton: document.getElementById('logout-btn'),
        distanceInput: document.getElementById('distance'),
        petrolPriceInput: document.getElementById('petrol-price'),
        tripForm: document.getElementById('trip-form'),
        resultDisplay: document.getElementById('result'),
        tripsContainer: document.getElementById('trips-container'),
        totalSpentDisplay: document.getElementById('total-spent'),
        loadingIndicator: document.getElementById('loading-indicator'),
        clearHistoryButton: document.getElementById('clear-history-btn'),
        adminClearAllButton: document.getElementById('admin-clear-all-btn')
    };

    // Verify all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Missing DOM element: ${key}`);
            return;
        }
    }

    // =============== UTILITY FUNCTIONS ===============
    function showElement(element, show = true) {
        element.classList.toggle('hidden', !show);
    }

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? '#d32f2f' : '#4a6cf7';
        showElement(element, true);
        if (!isError) {
            setTimeout(() => showElement(element, false), 5000);
        }
    }

    // =============== AUTHENTICATION FUNCTIONS ===============
    async function handleLogin(e) {
        e.preventDefault();
        
        const username = elements.usernameInput.value.trim().toLowerCase();
        const password = elements.passwordInput.value;

        if (!username || !password) {
            displayMessage(elements.loginError, 'Please enter both username and password', true);
            return;
        }

        if (!CONFIG.users[username]) {
            displayMessage(elements.loginError, 'Invalid username', true);
            return;
        }

        try {
            showElement(elements.loadingIndicator, true);
            elements.loginError.textContent = '';

            const email = `${username}@petroltracker.com`;
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) throw error;

            currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: CONFIG.users[username].isAdmin
            };
            
            showAppScreen();
            
        } catch (error) {
            console.error('Login error:', error);
            displayMessage(elements.loginError, 'Login failed: ' + error.message, true);
        } finally {
            showElement(elements.loadingIndicator, false);
        }
    }

    async function handleLogout() {
        try {
            await supabaseClient.auth.signOut();
            currentUser = null;
            showAuthScreen();
        } catch (error) {
            console.error('Logout failed:', error);
            displayMessage(elements.resultDisplay, 'Logout failed. Please try again.', true);
        }
    }

    // =============== SCREEN MANAGEMENT ===============
    function showAuthScreen() {
        showElement(elements.authContainer, true);
        showElement(elements.appContainer, false);
        elements.usernameInput.value = '';
        elements.passwordInput.value = '';
        elements.loginError.textContent = '';
    }

    function showAppScreen() {
        showElement(elements.authContainer, false);
        showElement(elements.appContainer, true);
        elements.currentUserDisplay.textContent = currentUser.username;
        showElement(elements.adminBadge, currentUser.isAdmin);
        showElement(elements.adminClearAllButton, currentUser.isAdmin);
    }

    // =============== EVENT LISTENERS ===============
    function setupEventListeners() {
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.logoutButton.addEventListener('click', handleLogout);
    }

    // =============== APPLICATION STATE ===============
    let currentUser = null;

    // =============== INITIALIZATION ===============
    setupEventListeners();

    // Check auth state on load
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user) {
        const username = user.email.split('@')[0].toLowerCase();
        
        if (CONFIG.users[username]) {
            currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: CONFIG.users[username].isAdmin
            };
            showAppScreen();
        } else {
            await supabaseClient.auth.signOut();
            showAuthScreen();
        }
    }
});
