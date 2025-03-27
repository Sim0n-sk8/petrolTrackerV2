// ======================
// CONFIGURATION
// ======================
const CONFIG = {
    // Replace with your actual Supabase URL
    supabaseUrl: 'https://your-project-ref.supabase.co',
    // Replace with your actual anon/public key
    supabaseKey: 'your-anon-key-here',
    fuelEfficiency: 11.47, // km per liter
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
    // Auth elements
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginError: document.getElementById('login-error'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    currentUsername: document.getElementById('current-username'),
    adminBadge: document.getElementById('admin-badge'),
    
    // Trip form elements
    distanceInput: document.getElementById('distance'),
    petrolPriceInput: document.getElementById('petrolPrice'),
    resultElement: document.getElementById('result'),
    tripForm: document.getElementById('trip-form'),
    
    // History elements
    tripsContainer: document.getElementById('trips'),
    totalElement: document.getElementById('total'),
    loadingElement: document.getElementById('loading'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    adminClearAllBtn: document.getElementById('admin-clear-all-btn'),
    
    // Other
    logoutBtn: document.getElementById('logout-btn')
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
// SUPABASE INITIALIZATION
// ======================
async function initializeSupabase() {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
        try {
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded');
            }
            
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
                            'Apikey': CONFIG.supabaseKey
                        }
                    }
                }
            );
            
            // Test connection
            const { error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error(`Supabase init attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                throw new Error('Failed to connect to Supabase after multiple attempts');
            }
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        }
    }
}

// ======================
// AUTHENTICATION FUNCTIONS
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

        const loginPromise = supabaseClient.auth.signInWithPassword({
            email: `${username}@petroltracker.com`,
            password: password
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout')), 15000)
        );

        const { error } = await Promise.race([loginPromise, timeoutPromise]);

        if (error) {
            if (error.message.includes('Failed to fetch')) {
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
        if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Network issues detected. Please check:';
            errorMessage += '\n1. Your internet connection';
            errorMessage += '\n2. If you\'re behind a firewall/proxy';
            errorMessage += '\n3. The Supabase project URL is correct';
        } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid username or password';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Server is not responding. Please try again later.';
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
// EVENT LISTENERS
// ======================
function setupEventListeners() {
    // Auth listeners
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Trip listeners
    elements.tripForm.addEventListener('submit', handleTripSubmit);
    elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
    elements.adminClearAllBtn.addEventListener('click', handleAdminClearAll);
}

// ======================
// INITIALIZATION
// ======================
async function initializeApp() {
    try {
        // Check if running on file protocol
        if (window.location.protocol === 'file:') {
            showError(elements.loginError, 
                'This app must be run on a web server (not file://).\n' +
                'Use VS Code Live Server or similar.');
            return;
        }

        // Initialize Supabase
        await initializeSupabase();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check auth state
        await checkAuthState();
    } catch (error) {
        console.error('App initialization failed:', error);
        showError(elements.loginError, 
            'Failed to initialize application.\n' +
            'Please check your network connection and refresh the page.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);