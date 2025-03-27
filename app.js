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
    // Load Supabase client
    const { createClient } = supabase;
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

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Get or create user in mapping table
            let { data: localUser, error: lookupError } = await supabaseClient
                .from('users')
                .select('id')
                .eq('supabase_uid', user.id)
                .single();

            if (lookupError || !localUser) {
                const { data: newUser, error: createError } = await supabaseClient
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

            const { error } = await supabaseClient
                .from('trips')
                .insert([{
                    user_id: localUser.id,
                    distance,
                    petrol_price: petrolPrice,
                    total_cost: parseFloat(totalCost.toFixed(2))
                }]);

            if (error) throw error;

            displayMessage(elements.resultDisplay, `Trip recorded: R${totalCost.toFixed(2)}`);
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

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError) throw userError;

            let query = supabaseClient
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (!currentUser.isAdmin) {
                query = query.eq('user_id', 
                    supabaseClient.from('users')
                    .select('id')
                    .eq('supabase_uid', user.id)
                );
            }

            const { data: trips, error } = await query;
            if (error) throw error;

            if (!trips || trips.length === 0) {
                elements.tripsContainer.innerHTML = '<div class="empty-state">No trips recorded yet</div>';
                elements.totalSpentDisplay.textContent = 'R0.00';
                return;
            }

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
            
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError) throw userError;

            const { data: localUser, error: lookupError } = await supabaseClient
                .from('users')
                .select('id')
                .eq('supabase_uid', user.id)
                .single();

            if (lookupError || !localUser) throw lookupError || new Error('User not found');

            const { error } = await supabaseClient
                .from('trips')
                .delete()
                .eq('user_id', localUser.id);

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
                .neq('id', 0);

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