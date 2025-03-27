// ======================
// CONFIGURATION (UPDATE THESE VALUES)
// ======================
const CONFIG = {
    // Get these from your Supabase project settings
    supabaseUrl: 'https://xovlfsqpxuvpbywtkrhc.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdmxmc3FweHV2cGJ5d3RrcmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNjkxNTAsImV4cCI6MjA1ODY0NTE1MH0.TyQwETGYoOlSOfCczvRKndnzWP7dlI0urgyFvF3fIG0',
    fuelEfficiency: 11.47,
    users: {
        'Simon': { password: '@Ngrybirds71', isAdmin: true },
        'Jaric': { password: 'pH0tos', isAdmin: false },
        'Dornel': { password: 'suNfl0wer', isAdmin: false },
        'Charl': { password: 'g0Lf1ng', isAdmin: false },
        'Michael': { password: 'f1Shing', isAdmin: false }
    }
};

// ======================
// DOM ELEMENTS
// ======================
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

// ======================
// APPLICATION STATE
// ======================
let currentUser = null;
let supabaseClient = null;

// ======================
// UTILITY FUNCTIONS
// ======================
function showElement(element, show = true) {
    element.classList.toggle('hidden', !show);
}

function showError(element, message) {
    element.textContent = message;
    showElement(element, true);
}

function hideError(element) {
    element.textContent = '';
    showElement(element, false);
}

function showResult(message, color = '#4a6cf7') {
    elements.resultElement.textContent = message;
    elements.resultElement.style.color = color;
    setTimeout(() => elements.resultElement.textContent = '', 5000);
}

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

// ======================
// SUPABASE INITIALIZATION (UPDATED)
// ======================
async function initializeSupabase() {
    try {
        // Verify Supabase library is loaded
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded. Check your script tags.');
        }

        // Initialize with proper configuration
        supabaseClient = supabase.createClient(
            CONFIG.supabaseUrl,
            CONFIG.supabaseKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                },
                global: {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': CONFIG.supabaseKey
                    }
                }
            }
        );

        // Test the connection
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            throw new Error('Failed to connect to Supabase: ' + error.message);
        }

        return true;
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        showError(elements.loginError, 
            'Failed to connect to database. ' +
            'Please check your internet connection and refresh the page.');
        return false;
    }
}

// ======================
// AUTHENTICATION FUNCTIONS (UPDATED)
// ======================
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

        if (error) {
            // Handle specific error cases
            if (error.message.includes('Invalid API key')) {
                throw new Error('Server configuration error. Please contact support.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error - could not reach server');
            }
            throw error;
        }

        currentUser = {
            username,
            isAdmin: CONFIG.users[username].isAdmin
        };
        showApp();
    } catch (error) {
        console.error('Login failed:', error);
        
        let errorMessage = 'Login failed. ';
        if (error.message.includes('Invalid API key')) {
            errorMessage = 'Server configuration error. Please try again later.';
        } else if (error.message.includes('Network error')) {
            errorMessage += 'Network issues detected. Please check your connection.';
        } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid username or password';
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

// ======================
// TRIP FUNCTIONS
// ======================
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

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

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

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

        let query = supabaseClient
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (!currentUser.isAdmin) {
            query = query.eq('user_id', userData.id);
        }

        const { data: trips, error } = await query;

        if (error) throw error;

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
        
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('username', currentUser.username)
            .single();

        if (userError || !userData) throw userError || new Error('User not found');

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

// ======================
// INITIALIZATION
// ======================
async function initializeApp() {
    try {
        // Check if running on file protocol
        if (window.location.protocol === 'file:') {
            showError(elements.loginError, 
                'This app must be run on a web server (not file://). ' +
                'Use VS Code Live Server or similar.');
            return;
        }

        // Initialize Supabase
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) return;
        
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
        showError(elements.loginError, 
            'Application startup failed. ' +
            'Please check console for details and refresh the page.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);