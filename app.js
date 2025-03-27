// =============== CONFIGURATION ===============
const CONFIG = {
    supabaseUrl: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    fuelEfficiency: 11.47,
    users: {
        'Simon': { password: '@Ngrybirds71', isAdmin: true },
        'Jaric': { password: 'pH0tos', isAdmin: false },
        'Dornel': { password: 'suNfl0wer', isAdmin: false },
        'Charl': { password: 'g0Lf1ng', isAdmin: false },
        'Michael': { password: 'f1Shing', isAdmin: false }
    }
};

// =============== DOM ELEMENTS ===============
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
    adminClearAllBtn: document.getElementById('admin-clear-all-btn'),
    networkStatus: document.createElement('div')
};

// =============== APP STATE ===============
let currentUser = null;
let supabaseClient = null;
let isOnline = navigator.onLine;

// =============== UTILITY FUNCTIONS ===============
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

// =============== NETWORK HANDLING ===============
function setupNetworkMonitoring() {
    elements.networkStatus.style.position = 'fixed';
    elements.networkStatus.style.bottom = '10px';
    elements.networkStatus.style.right = '10px';
    elements.networkStatus.style.padding = '8px 12px';
    elements.networkStatus.style.borderRadius = '4px';
    elements.networkStatus.style.zIndex = '1000';
    document.body.appendChild(elements.networkStatus);
    updateNetworkStatus();

    window.addEventListener('online', () => {
        isOnline = true;
        updateNetworkStatus();
        hideError(elements.loginError);
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateNetworkStatus();
        showError(elements.loginError, 'You are offline. Please check your connection.');
    });
}

function updateNetworkStatus() {
    elements.networkStatus.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
    elements.networkStatus.style.backgroundColor = isOnline ? '#4CAF50' : '#f44336';
    elements.networkStatus.style.color = 'white';
}

async function testSupabaseConnection() {
    try {
        // Test with a simple REST endpoint
        const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: { 
                'apikey': CONFIG.supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        
        // More detailed error diagnostics
        if (error.message.includes('Failed to fetch')) {
            console.error('Network error - likely CORS or DNS issue');
        } else if (error.message.includes('timed out')) {
            console.error('Request timed out - server might be slow or unreachable');
        }
        
        return false;
    }
}

// =============== AUTH FUNCTIONS ===============
async function initializeSupabase() {
    try {
        if (!isOnline) throw new Error('Offline');
        
        // Load Supabase client if not already loaded
        if (typeof supabase === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
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
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': CONFIG.supabaseKey
                    }
                }
            }
        );

        // Test connection with timeout
        const isConnected = await withTimeout(testSupabaseConnection(), 5000);
        if (!isConnected) throw new Error('Cannot reach Supabase');

        return true;
    } catch (error) {
        console.error('Supabase init failed:', error);
        
        let errorMessage = 'Failed to connect to database. ';
        if (error.message.includes('Failed to fetch') || error.message.includes('timed out')) {
            errorMessage += 'Network error detected. Please check:\n';
            errorMessage += '1. Your internet connection\n';
            errorMessage += '2. VPN/Firewall settings (if any)\n';
            errorMessage += '3. Try refreshing the page\n';
            errorMessage += '4. The Supabase instance might be down';
        } else {
            errorMessage += error.message;
        }
        
        showError(elements.loginError, errorMessage);
        return false;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function withTimeout(promise, ms) {
    let timeout;
    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Timeout')), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeout);
    }
}

async function checkAuthState() {
    try {
        if (!supabaseClient) {
            showAuth();
            return;
        }

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
        console.error('Auth check failed:', error);
        showAuth();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    if (!isOnline) {
        showError(elements.loginError, 'You are offline. Please connect to the internet.');
        return;
    }

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

        // Add retry with exponential backoff
        const { error } = await withRetry(
            () => supabaseClient.auth.signInWithPassword({
                email: `${username}@petroltracker.com`,
                password: password
            }),
            3,  // 3 retries
            1000 // Initial 1 second delay
        );

        if (error) throw error;

        currentUser = {
            username,
            isAdmin: CONFIG.users[username].isAdmin
        };
        showApp();
    } catch (error) {
        console.error('Login failed:', error);
        
        let errorMessage = 'Login failed. ';
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            errorMessage += 'Network error. Please check:\n';
            errorMessage += '1. Your internet connection\n';
            errorMessage += '2. VPN/Firewall settings\n';
            errorMessage += '3. Try a different network';
        } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid username or password';
        }
        
        showError(elements.loginError, errorMessage);
    } finally {
        showElement(elements.loadingElement, false);
    }
}

async function withRetry(fn, retries, delay) {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
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

// =============== TRIP FUNCTIONS ===============
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

        // For demo purposes, we'll skip the user lookup since we're using auth.users
        const { error } = await supabaseClient
            .from('trips')
            .insert([{
                user_id: (await supabaseClient.auth.getUser()).data.user.id,
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

        let query = supabaseClient
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (!currentUser.isAdmin) {
            query = query.eq('user_id', (await supabaseClient.auth.getUser()).data.user.id);
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
        
        const { error } = await supabaseClient
            .from('trips')
            .delete()
            .eq('user_id', (await supabaseClient.auth.getUser()).data.user.id);

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

// =============== INITIALIZATION ===============
async function initializeApp() {
    try {
        // Check if running on file protocol
        if (window.location.protocol === 'file:') {
            showError(elements.loginError, 
                'This app must be run on a web server (not file://). ' +
                'Use VS Code Live Server extension.');
            return;
        }

        // Setup network monitoring
        setupNetworkMonitoring();

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
            'Please check console and refresh the page.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);