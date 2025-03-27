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

// =============== APPLICATION STATE ===============
let currentUser = null;
let supabaseClient = null;

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

// =============== SUPABASE INITIALIZATION ===============
async function initializeSupabase() {
    try {
        // Load Supabase client if not already available
        if (typeof supabase === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // Create Supabase client
        supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        // Test connection
        const { error } = await supabaseClient.from('trips').select('*').limit(1);
        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        displayMessage(elements.loginError, 'Failed to connect to database. Please try again later.', true);
        return false;
    }
}

// =============== AUTHENTICATION FUNCTIONS ===============
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            showAuthScreen();
            return;
        }

        // Extract username from email
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
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = elements.usernameInput.value.trim().toLowerCase();
    const password = elements.passwordInput.value;

    // Validate input
    if (!username || !password) {
        displayMessage(elements.loginError, 'Please enter both username and password', true);
        return;
    }

    // Check if username exists in config
    if (!CONFIG.users[username]) {
        displayMessage(elements.loginError, 'Invalid username', true);
        return;
    }

    try {
        showElement(elements.loadingIndicator, true);
        hideError(elements.loginError);

        // Construct the exact email address
        const email = `${username}@petroltracker.com`;
        
        // Sign in with Supabase
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // If successful, proceed to app
        currentUser = {
            username: username.charAt(0).toUpperCase() + username.slice(1),
            isAdmin: CONFIG.users[username].isAdmin
        };
        
        showAppScreen();
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Specific error messages
        if (error.message.includes('Invalid login credentials')) {
            displayMessage(elements.loginError, 'Invalid password. Please try again.', true);
        } else if (error.message.includes('Email not confirmed')) {
            displayMessage(elements.loginError, 'Please verify your email first.', true);
        } else {
            displayMessage(elements.loginError, 'Login failed: ' + error.message, true);
        }
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

// =============== TRIP MANAGEMENT FUNCTIONS ===============
async function handleTripSubmit(e) {
    e.preventDefault();
    
    const distance = parseFloat(elements.distanceInput.value);
    const petrolPrice = parseFloat(elements.petrolPriceInput.value);

    if (isNaN(distance) || distance <= 0) {
        displayMessage(elements.resultDisplay, 'Please enter a valid distance', true);
        return;
    }

    if (isNaN(petrolPrice) || petrolPrice <= 0) {
        displayMessage(elements.resultDisplay, 'Please enter a valid petrol price', true);
        return;
    }

    try {
        showElement(elements.loadingIndicator, true);
        const totalCost = (distance / CONFIG.fuelEfficiency) * petrolPrice;

        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError) throw userError;

        // Insert the trip record
        const { error } = await supabaseClient
            .from('trips')
            .insert([{
                user_id: user.id, // Using UUID from auth
                distance: distance,
                petrol_price: petrolPrice,
                total_cost: parseFloat(totalCost.toFixed(2))
            }]);

        if (error) throw error;

        displayMessage(elements.resultDisplay, `Amount Owed: R${totalCost.toFixed(2)}`);
        elements.distanceInput.value = '';
        elements.petrolPriceInput.value = '';
        await loadTrips();
    } catch (error) {
        console.error('Error saving trip:', error);
        displayMessage(elements.resultDisplay, 'Error saving trip: ' + error.message, true);
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

async function loadTrips() {
    if (!currentUser) return;

    try {
        showElement(elements.loadingIndicator, true);
        elements.tripsContainer.innerHTML = '';

        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError) throw userError;

        let query = supabaseClient
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin, only show current user's trips
        if (!currentUser.isAdmin) {
            query = query.eq('user_id', user.id);
        }

        const { data: trips, error } = await query;
        if (error) throw error;

        if (!trips || trips.length === 0) {
            elements.tripsContainer.innerHTML = '<div class="empty-state">No trips recorded yet</div>';
            elements.totalSpentDisplay.textContent = 'R0.00';
            return;
        }

        // Display trips
        trips.forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.className = 'trip-item';
            tripElement.innerHTML = `
                <div class="trip-date">${new Date(trip.created_at).toLocaleDateString()}</div>
                <div class="trip-details">
                    <span>${trip.distance} km</span>
                    <span>@ R${trip.petrol_price.toFixed(2)}/L</span>
                </div>
                <div class="trip-cost">R${trip.total_cost.toFixed(2)}</div>
            `;
            elements.tripsContainer.appendChild(tripElement);
        });

        // Calculate and display total
        const totalSpent = trips.reduce((sum, trip) => sum + trip.total_cost, 0);
        elements.totalSpentDisplay.textContent = `R${totalSpent.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading trips:', error);
        elements.tripsContainer.innerHTML = '<div class="error-state">Error loading trips</div>';
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

async function handleClearHistory() {
    if (!currentUser || !confirm('Are you sure you want to clear your trip history?')) return;

    try {
        showElement(elements.loadingIndicator, true);
        
        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError) throw userError;

        const { error } = await supabaseClient
            .from('trips')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        displayMessage(elements.resultDisplay, 'Your trip history has been cleared');
        await loadTrips();
    } catch (error) {
        console.error('Error clearing history:', error);
        displayMessage(elements.resultDisplay, 'Error clearing history', true);
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

async function handleAdminClearAll() {
    if (!currentUser?.isAdmin || !confirm('Are you sure you want to clear ALL trip history?')) return;

    try {
        showElement(elements.loadingIndicator, true);
        
        const { error } = await supabaseClient
            .from('trips')
            .delete()
            .neq('id', 0); // Delete all trips

        if (error) throw error;

        displayMessage(elements.resultDisplay, 'All trip history has been cleared');
        await loadTrips();
    } catch (error) {
        console.error('Error clearing all history:', error);
        displayMessage(elements.resultDisplay, 'Error clearing all history', true);
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

// =============== SCREEN MANAGEMENT ===============
function showAuthScreen() {
    elements.authContainer.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
    elements.loginError.textContent = '';
}

function showAppScreen() {
    elements.authContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
    elements.currentUserDisplay.textContent = currentUser.username;
    showElement(elements.adminBadge, currentUser.isAdmin);
    showElement(elements.adminClearAllButton, currentUser.isAdmin);
    loadTrips();
}

// =============== EVENT LISTENERS ===============
function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutButton.addEventListener('click', handleLogout);
    elements.tripForm.addEventListener('submit', handleTripSubmit);
    elements.clearHistoryButton.addEventListener('click', handleClearHistory);
    elements.adminClearAllButton.addEventListener('click', handleAdminClearAll);
}

// =============== APPLICATION INITIALIZATION ===============
async function initializeApp() {
    try {
        // Initialize Supabase
        const supabaseReady = await initializeSupabase();
        if (!supabaseReady) return;

        // Setup event listeners
        setupEventListeners();

        // Check auth state
        await checkAuthState();
    } catch (error) {
        console.error('Application initialization failed:', error);
        displayMessage(elements.loginError, 'Application failed to initialize. Please refresh the page.', true);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);