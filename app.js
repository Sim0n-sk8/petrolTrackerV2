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

// =============== INITIALIZE SUPABASE CLIENT ===============
const supabase = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// =============== DOM ELEMENTS ===============
const getElement = (id) => {
    const el = document.getElementById(id);
    if (!el) console.error(`Element with ID ${id} not found`);
    return el;
};

const elements = {
    authContainer: getElement('auth-container'),
    appContainer: getElement('app-container'),
    loginForm: getElement('login-form'),
    usernameInput: getElement('username'),
    passwordInput: getElement('password'),
    loginError: getElement('login-error'),
    currentUserDisplay: getElement('current-user'),
    adminBadge: getElement('admin-badge'),
    logoutButton: getElement('logout-btn'),
    distanceInput: getElement('distance'),
    petrolPriceInput: getElement('petrol-price'),
    tripForm: getElement('trip-form'),
    resultDisplay: getElement('result'),
    tripsContainer: getElement('trips-container'),
    totalSpentDisplay: getElement('total-spent'),
    loadingIndicator: getElement('loading-indicator'),
    clearHistoryButton: getElement('clear-history-btn'),
    adminClearAllButton: getElement('admin-clear-all-btn')
};

// =============== UTILITY FUNCTIONS ===============
function showElement(element, show = true) {
    if (!element) return;
    element.classList.toggle('hidden', !show);
}

function displayMessage(element, message, isError = false) {
    if (!element) return;
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
    
    const username = elements.usernameInput?.value.trim().toLowerCase();
    const password = elements.passwordInput?.value;

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
        if (elements.loginError) elements.loginError.textContent = '';

        const email = `${username}@petroltracker.com`;
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        currentUser = {
            username: username.charAt(0).toUpperCase() + username.slice(1),
            isAdmin: CONFIG.users[username].isAdmin
        };
        
        showAppScreen();
        
    } catch (error) {
        console.error('Login error:', error);
        const message = error.message.includes('Invalid login credentials') 
            ? 'Invalid password. Please try again.' 
            : 'Login failed: ' + error.message;
        displayMessage(elements.loginError, message, true);
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
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
    
    const distance = parseFloat(elements.distanceInput?.value);
    const petrolPrice = parseFloat(elements.petrolPriceInput?.value);

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

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        let { data: localUser, error: lookupError } = await supabase
            .from('users')
            .select('id')
            .eq('supabase_uid', user.id)
            .single();

        if (lookupError || !localUser) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    supabase_uid: user.id,
                    username: user.email.split('@')[0],
                    is_admin: CONFIG.users[user.email.split('@')[0]]?.isAdmin || false
                }])
                .select()
                .single();

            if (createError) throw createError;
            localUser = newUser;
        }

        const { error } = await supabase
            .from('trips')
            .insert([{
                user_id: localUser.id,
                distance,
                petrol_price: petrolPrice,
                total_cost: parseFloat(totalCost.toFixed(2))
            }]);

        if (error) throw error;

        displayMessage(elements.resultDisplay, `Trip recorded: R${totalCost.toFixed(2)}`);
        if (elements.distanceInput) elements.distanceInput.value = '';
        if (elements.petrolPriceInput) elements.petrolPriceInput.value = '';
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
        if (elements.tripsContainer) elements.tripsContainer.innerHTML = '';

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        let query = supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (!currentUser.isAdmin) {
            query = query.eq('user_id', 
                supabase.from('users')
                .select('id')
                .eq('supabase_uid', user.id)
            );
        }

        const { data: trips, error } = await query;
        if (error) throw error;

        if (!trips || trips.length === 0) {
            if (elements.tripsContainer) {
                elements.tripsContainer.innerHTML = '<div class="empty-state">No trips recorded yet</div>';
            }
            if (elements.totalSpentDisplay) {
                elements.totalSpentDisplay.textContent = 'R0.00';
            }
            return;
        }

        if (elements.tripsContainer) {
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
        }

        const totalSpent = trips.reduce((sum, trip) => sum + trip.total_cost, 0);
        if (elements.totalSpentDisplay) {
            elements.totalSpentDisplay.textContent = `R${totalSpent.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        if (elements.tripsContainer) {
            elements.tripsContainer.innerHTML = '<div class="error-state">Error loading trips</div>';
        }
    } finally {
        showElement(elements.loadingIndicator, false);
    }
}

// =============== SCREEN MANAGEMENT ===============
function showAuthScreen() {
    showElement(elements.authContainer, true);
    showElement(elements.appContainer, false);
    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.passwordInput) elements.passwordInput.value = '';
    if (elements.loginError) elements.loginError.textContent = '';
}

function showAppScreen() {
    showElement(elements.authContainer, false);
    showElement(elements.appContainer, true);
    if (elements.currentUserDisplay && currentUser) {
        elements.currentUserDisplay.textContent = currentUser.username;
    }
    showElement(elements.adminBadge, currentUser?.isAdmin);
    showElement(elements.adminClearAllButton, currentUser?.isAdmin);
    loadTrips();
}

// =============== EVENT LISTENERS ===============
function setupEventListeners() {
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', handleLogout);
    }
    if (elements.tripForm) {
        elements.tripForm.addEventListener('submit', handleTripSubmit);
    }
    if (elements.clearHistoryButton) {
        elements.clearHistoryButton.addEventListener('click', handleClearHistory);
    }
    if (elements.adminClearAllButton) {
        elements.adminClearAllButton.addEventListener('click', handleAdminClearAll);
    }
}

// =============== APPLICATION INITIALIZATION ===============
async function initializeApp() {
    // Verify all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Missing required element: ${key}`);
            return;
        }
    }

    setupEventListeners();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const username = user.email.split('@')[0].toLowerCase();
            
            if (CONFIG.users[username]) {
                currentUser = {
                    username: username.charAt(0).toUpperCase() + username.slice(1),
                    isAdmin: CONFIG.users[username].isAdmin
                };
                showAppScreen();
            } else {
                await supabase.auth.signOut();
                showAuthScreen();
            }
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showAuthScreen();
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);