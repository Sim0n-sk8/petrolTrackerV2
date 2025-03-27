// App Configuration
const CONFIG = {
    supabaseUrl: 'https://xovlfsqpxuvpbywtkrhc.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdmxmc3FweHV2cGJ5d3RrcmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNjkxNTAsImV4cCI6MjA1ODY0NTE1MH0.TyQwETGYoOlSOfCczvRKndnzWP7dlI0urgyFvF3fIG0',
    fuelEfficiency: 11.47, // km per liter
    users: {
        'Simon': { password: '@Ngrybirds71', isAdmin: true },
        'Jaric': { password: 'pH0tos', isAdmin: false },
        'Dornel': { password: 'suNfl0wer', isAdmin: false },
        'Charl': { password: 'g0Lf1ng', isAdmin: false },
        'Michael': { password: 'f1Shing', isAdmin: false }
    }
};

// DOM Elements
const elements = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginError: document.getElementById('login-error'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    currentUsername: document.getElementById('current-username'),
    adminBadge: document.getElementById('admin-badge'),
    distanceInput: document.getElementById('distance'),
    petrolPriceInput: document.getElementById('petrolPrice'),
    resultElement: document.getElementById('result'),
    tripsContainer: document.getElementById('trips'),
    totalElement: document.getElementById('total'),
    loadingElement: document.getElementById('loading'),
    tripForm: document.getElementById('trip-form'),
    logoutBtn: document.getElementById('logout-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    adminClearAllBtn: document.getElementById('admin-clear-all-btn')
};

// App State
let currentUser = null;
let supabaseClient = null;

// Utility Functions
function showElement(element, show = true) {
    element.classList.toggle('hidden', !show);
}

function showError(element, message) {
    element.textContent = message;
    showElement(element, true);
}

function hideError(element) {
    showElement(element, false);
}

function showResult(message, color = '#4a6cf7') {
    elements.resultElement.textContent = message;
    elements.resultElement.style.color = color;
    setTimeout(() => elements.resultElement.textContent = '', 5000);
}

// Supabase Initialization
async function initializeSupabase() {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
        try {
            if (!window.supabase) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                retryCount++;
                continue;
            }
            
            supabaseClient = window.supabase.createClient(
                CONFIG.supabaseUrl,
                CONFIG.supabaseKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );
            
            // Test connection
            await supabaseClient.auth.getSession();
            return true;
        } catch (error) {
            console.error(`Supabase init attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                throw new Error('Failed to connect to server after multiple attempts');
            }
        }
    }
}

// Authentication Functions
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) {
            showAuth();
            return;
        }

        const username = user.email.split('@')[0];
        if (CONFIG.users[username]) {
            currentUser = { 
                username, 
                isAdmin: CONFIG.users[username].isAdmin 
            };
            showApp();
        } else {
            await supabaseClient.auth.signOut();
            showAuth();
        }
    } catch (error) {
        console.error('Auth state check failed:', error);
        showAuth();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;

    if (!username || !password) {
        showError(elements.loginError, 'Please enter both username and password');
        return;
    }

    if (!CONFIG.users[username] || CONFIG.users[username].password !== password) {
        showError(elements.loginError, 'Invalid username or password');
        return;
    }

    try {
        showElement(elements.loadingElement, true);
        hideError(elements.loginError);

        const { error } = await supabaseClient.auth.signInWithPassword({
            email: `${username}@petroltracker.com`,
            password: password
        });

        if (error) throw error;

        currentUser = { 
            username, 
            isAdmin: CONFIG.users[username].isAdmin 
        };
        showApp();
    } catch (error) {
        console.error('Login failed:', error);
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection.';
        }
        showError(elements.loginError, errorMessage);
    } finally {
        showElement(elements.loadingElement, false);
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        showAuth();
    } catch (error) {
        console.error('Logout failed:', error);
        showResult('Logout failed. Please try again.', '#d32f2f');
    }
}

// Trip Functions
async function handleTripSubmit(e) {
    e.preventDefault();
    
    const distance = parseFloat(elements.distanceInput.value);
    const petrolPrice = parseFloat(elements.petrolPriceInput.value);

    if (isNaN(distance) || distance <= 0) {
        showResult('Please enter a valid distance', '#d32f2f');
        return;
    }

    if (isNaN(petrolPrice) || petrolPrice <= 0) {
        showResult('Please enter a valid petrol price', '#d32f2f');
        return;
    }

    try {
        showElement(elements.loadingElement, true);
        const totalCost = (distance / CONFIG.fuelEfficiency) * petrolPrice;

        // Get user ID from database
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

        // Save trip to database
        const { error } = await supabaseClient
            .from('trips')
            .insert([{
                user_id: userData.id,
                distance,
                petrol_price: petrolPrice,
                total_cost: parseFloat(totalCost.toFixed(2))
            }]);

        if (error) throw error;

        showResult(`Amount Owed: R${totalCost.toFixed(2)}`, '#4a6cf7');
        elements.distanceInput.value = '';
        elements.petrolPriceInput.value = '';
        await loadTrips();
    } catch (error) {
        console.error('Error saving trip:', error);
        showResult('Error saving trip. Please try again.', '#d32f2f');
    } finally {
        showElement(elements.loadingElement, false);
    }
}

async function loadTrips() {
    if (!currentUser) return;

    try {
        showElement(elements.loadingElement, true);
        elements.tripsContainer.innerHTML = '';

        // Get user ID from database
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

        // Build query based on user role
        let query = supabaseClient
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (!currentUser.isAdmin) {
            query = query.eq('user_id', userData.id);
        }

        const { data: trips, error } = await query;

        if (error) throw error;

        // Display trips
        if (!trips || trips.length === 0) {
            elements.tripsContainer.innerHTML = '<div class="history-item">No trips recorded yet</div>';
            elements.totalElement.textContent = 'Total Spent: R0';
            return;
        }

        trips.forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.classList.add('history-item');
            tripElement.innerHTML = `
                <div>${new Date(trip.created_at).toLocaleDateString()}<br>
                ${trip.distance} km @ R${trip.petrol_price}/L</div>
                <div>R${trip.total_cost.toFixed(2)}</div>
            `;
            elements.tripsContainer.appendChild(tripElement);
        });

        // Calculate and display total
        const totalSpend = trips.reduce((sum, trip) => sum + trip.total_cost, 0);
        elements.totalElement.textContent = `Total Spent: R${totalSpend.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading trips:', error);
        elements.tripsContainer.innerHTML = '<div class="history-item">Error loading trips</div>';
    } finally {
        showElement(elements.loadingElement, false);
    }
}

async function handleClearHistory() {
    if (!currentUser) return;

    try {
        showElement(elements.loadingElement, true);
        
        // Get user ID from database
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

        // Delete user's trips
        const { error } = await supabaseClient
            .from('trips')
            .delete()
            .eq('user_id', userData.id);

        if (error) throw error;

        showResult('Your trip history has been cleared', '#4CAF50');
        await loadTrips();
    } catch (error) {
        console.error('Error clearing history:', error);
        showResult('Error clearing history', '#d32f2f');
    } finally {
        showElement(elements.loadingElement, false);
    }
}

async function handleAdminClearAll() {
    if (!currentUser?.isAdmin) return;

    try {
        showElement(elements.loadingElement, true);
        
        // Delete all trips
        const { error } = await supabaseClient
            .from('trips')
            .delete()
            .neq('id', 0);

        if (error) throw error;

        showResult('All trip history has been cleared', '#4CAF50');
        await loadTrips();
    } catch (error) {
        console.error('Error clearing all history:', error);
        showResult('Error clearing all history', '#d32f2f');
    } finally {
        showElement(elements.loadingElement, false);
    }
}

// UI Functions
function showAuth() {
    elements.authContainer.classList.remove('hidden');
    elements.appContainer.classList.add('hidden');
    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
    hideError(elements.loginError);
}

function showApp() {
    elements.authContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
    elements.currentUsername.textContent = currentUser.username;
    showElement(elements.adminBadge, currentUser.isAdmin);
    showElement(elements.adminClearAllBtn, currentUser.isAdmin);
    loadTrips();
}

// Initialize Application
async function initializeApp() {
    try {
        // Check if running on file protocol
        if (window.location.protocol === 'file:') {
            showError(elements.loginError, 'This app must be run on a web server (not file://)');
            return;
        }

        // Initialize Supabase
        await initializeSupabase();
        
        // Setup event listeners
        document.getElementById('login-btn').addEventListener('click', handleLogin);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.tripForm.addEventListener('submit', handleTripSubmit);
        elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
        elements.adminClearAllBtn.addEventListener('click', handleAdminClearAll);
        
        // Check auth state
        await checkAuthState();
    } catch (error) {
        console.error('App initialization failed:', error);
        showError(elements.loginError, 'Failed to connect to server. Please check your internet connection and refresh the page.');
    }
}

// Start the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);