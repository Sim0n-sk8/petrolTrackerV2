// App Configuration
const CONFIG = {
    supabaseUrl: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
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
    connectionStatus: document.createElement('div'),
    tripForm: document.getElementById('trip-form'),
    logoutBtn: document.getElementById('logout-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    adminClearAllBtn: document.getElementById('admin-clear-all-btn')
};

// App State
let currentUser = null;
let supabaseClient = null;
let isOnline = navigator.onLine;

// Initialize Connection Status Indicator
function initConnectionStatus() {
    elements.connectionStatus.style.position = 'fixed';
    elements.connectionStatus.style.bottom = '10px';
    elements.connectionStatus.style.right = '10px';
    elements.connectionStatus.style.padding = '8px 12px';
    elements.connectionStatus.style.borderRadius = '4px';
    elements.connectionStatus.style.fontSize = '14px';
    updateConnectionStatus();
    document.body.appendChild(elements.connectionStatus);
}

function updateConnectionStatus() {
    if (isOnline) {
        elements.connectionStatus.textContent = 'Online';
        elements.connectionStatus.style.backgroundColor = '#4CAF50';
        elements.connectionStatus.style.color = 'white';
    } else {
        elements.connectionStatus.textContent = 'Offline';
        elements.connectionStatus.style.backgroundColor = '#f44336';
        elements.connectionStatus.style.color = 'white';
    }
}

// Network Event Listeners
window.addEventListener('online', () => {
    isOnline = true;
    updateConnectionStatus();
    hideError(elements.loginError);
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    isOnline = false;
    updateConnectionStatus();
    showError(elements.loginError, 'You are offline. Please check your connection.');
    console.log('Connection lost');
});

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

// Supabase Initialization with Enhanced Retry Logic
async function initializeSupabase() {
    const MAX_RETRIES = 5;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
        try {
            if (!window.supabase) {
                await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));
                retryCount++;
                continue;
            }
            
            const initPromise = window.supabase.createClient(
                CONFIG.supabaseUrl,
                CONFIG.supabaseKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
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
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );
            
            supabaseClient = await Promise.race([initPromise, timeoutPromise]);
            
            // Test connection with timeout
            const testPromise = supabaseClient.auth.getSession();
            const testTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection test timeout')), 8000)
            );
            
            await Promise.race([testPromise, testTimeout]);
            return true;
        } catch (error) {
            console.error(`Supabase init attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                throw new Error('Failed to connect to the server after multiple attempts. Please check your internet connection or try again later.');
            }
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
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

        const loginPromise = supabaseClient.auth.signInWithPassword({
            email: `${username}@petroltracker.com`,
            password: password
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout. Server is not responding.')), 15000)
        );

        const { error } = await Promise.race([loginPromise, timeoutPromise]);

        if (error) {
            if (error.status === 0) {
                throw new Error('Network error. Could not reach the server.');
            } else if (error.message.includes('Invalid')) {
                throw new Error('Invalid credentials');
            } else {
                throw error;
            }
        }

        currentUser = { 
            username, 
            isAdmin: CONFIG.users[username].isAdmin 
        };
        showApp();
    } catch (error) {
        console.error('Login failed:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('Network error') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('timeout')) {
            errorMessage = 'Network issue detected. Please check:';
            errorMessage += '\n1. Your internet connection';
            errorMessage += '\n2. If you\'re behind a firewall/proxy';
            errorMessage += '\n3. Try refreshing the page';
        } else if (error.message.includes('Invalid credentials')) {
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
        // Initialize connection status indicator
        initConnectionStatus();
        
        // Check online status
        if (!isOnline) {
            showError(elements.loginError, 'You are currently offline. Please connect to the internet.');
            return;
        }

        // Check if running on file protocol
        if (window.location.protocol === 'file:') {
            showError(elements.loginError, 'This app must be run on a web server (not file://). Try using Live Server in VS Code.');
            return;
        }

        // Check CORS availability
        try {
            const testResponse = await fetch(CONFIG.supabaseUrl, { method: 'HEAD' });
            if (!testResponse.ok) {
                throw new Error('Server not responding properly');
            }
        } catch (e) {
            showError(elements.loginError, 'Cannot connect to server. Possible network restrictions. Try: 1. Different browser 2. Different network 3. Disabling VPN');
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
        let errorMessage = 'Application error. Please refresh the page.';
        if (error.message.includes('CORS')) {
            errorMessage = 'Cross-origin error. Try:';
            errorMessage += '\n1. Using Chrome/Firefox';
            errorMessage += '\n2. Disabling browser extensions';
            errorMessage += '\n3. Checking your network settings';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Server is not responding. Try again later.';
        }
        showError(elements.loginError, errorMessage);
    }
}

// Start the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);