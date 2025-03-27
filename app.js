// Configuration (ideally moved to a separate, secure backend in production)
const CONFIG = {
    SUPABASE_URL: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    FUEL_EFFICIENCY: 11.47
};

// Main Application Class
class PetrolTrackerApp {
    constructor() {
        // DOM Element Caching
        this.elements = {
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

        // User authentication state
        this.currentUser = null;

        // Supabase client (will be initialized in setup)
        this.supabaseClient = null;

        // Bind methods to maintain correct context
        this.bindMethods();

        // Verify DOM elements
        this.validateDOMElements();
    }

    // Bind methods to maintain correct 'this' context
    bindMethods() {
        this.handleLogin = this.handleLogin.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.handleTripSubmit = this.handleTripSubmit.bind(this);
        this.handleClearHistory = this.handleClearHistory.bind(this);
        this.handleAdminClearAll = this.handleAdminClearAll.bind(this);
    }

    // Validate that all required DOM elements exist
    validateDOMElements() {
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.error(`Missing DOM element: ${key}`);
                throw new Error(`Missing DOM element: ${key}`);
            }
        }
    }

    // Initialize the application
    async init() {
        // Initialize Supabase client
        this.supabaseClient = supabase.createClient(
            CONFIG.SUPABASE_URL, 
            CONFIG.SUPABASE_ANON_KEY
        );

        // Setup event listeners
        this.setupEventListeners();

        // Check initial authentication state
        await this.checkAuthState();
    }

    // Setup all event listeners
    setupEventListeners() {
        this.elements.loginForm.addEventListener('submit', this.handleLogin);
        this.elements.logoutButton.addEventListener('click', this.handleLogout);
        this.elements.tripForm.addEventListener('submit', this.handleTripSubmit);
        this.elements.clearHistoryButton.addEventListener('click', this.handleClearHistory);
        this.elements.adminClearAllButton.addEventListener('click', this.handleAdminClearAll);
    }

    // Utility method to show/hide elements
    toggleElementVisibility(element, show = true) {
        element.classList.toggle('hidden', !show);
    }

    // Display messages to user
    displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? '#d32f2f' : '#4a6cf7';
        this.toggleElementVisibility(element, true);
        
        if (!isError) {
            setTimeout(() => this.toggleElementVisibility(element, false), 5000);
        }
    }

    // Handle user login
    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.elements.usernameInput.value.trim().toLowerCase();
        const password = this.elements.passwordInput.value;

        // Basic validation
        if (!username || !password) {
            this.displayMessage(this.elements.loginError, 'Please enter both username and password', true);
            return;
        }

        try {
            this.toggleElementVisibility(this.elements.loadingIndicator, true);
            this.elements.loginError.textContent = '';

            // Attempt Supabase authentication
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: `${username}@petroltracker.com`,
                password: password
            });

            if (error) throw error;

            // Set current user
            this.currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: this.isUserAdmin(username)
            };
            
            // Show app screen
            this.showAppScreen();
            
        } catch (error) {
            console.error('Login error:', error);
            const message = error.message.includes('Invalid login credentials') 
                ? 'Invalid username or password' 
                : 'Login failed: ' + error.message;
            this.displayMessage(this.elements.loginError, message, true);
        } finally {
            this.toggleElementVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Check if user is an admin (simplified for this example)
    isUserAdmin(username) {
        const adminUsers = ['simon'];
        return adminUsers.includes(username);
    }

    // Handle user logout
    async handleLogout() {
        try {
            await this.supabaseClient.auth.signOut();
            this.currentUser = null;
            this.showAuthScreen();
        } catch (error) {
            console.error('Logout failed:', error);
            this.displayMessage(this.elements.resultDisplay, 'Logout failed. Please try again.', true);
        }
    }

    // Submit a new trip
    async handleTripSubmit(e) {
        e.preventDefault();
        
        const distance = parseFloat(this.elements.distanceInput.value);
        const petrolPrice = parseFloat(this.elements.petrolPriceInput.value);

        // Validate inputs
        if (isNaN(distance) || distance <= 0) {
            this.displayMessage(this.elements.resultDisplay, 'Please enter a valid distance', true);
            return;
        }

        if (isNaN(petrolPrice) || petrolPrice <= 0) {
            this.displayMessage(this.elements.resultDisplay, 'Please enter a valid petrol price', true);
            return;
        }

        try {
            this.toggleElementVisibility(this.elements.loadingIndicator, true);
            
            // Calculate total cost
            const totalCost = (distance / CONFIG.FUEL_EFFICIENCY) * petrolPrice;

            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Insert trip record
            const { error } = await this.supabaseClient
                .from('trips')
                .insert({
                    user_id: user.id,
                    distance,
                    petrol_price: petrolPrice,
                    total_cost: parseFloat(totalCost.toFixed(2))
                });

            if (error) throw error;

            // Success message and reset form
            this.displayMessage(this.elements.resultDisplay, `Trip recorded: R${totalCost.toFixed(2)}`);
            this.elements.distanceInput.value = '';
            this.elements.petrolPriceInput.value = '';
            
            // Reload trips
            await this.loadTrips();

        } catch (error) {
            console.error('Error saving trip:', error);
            this.displayMessage(this.elements.resultDisplay, 'Error saving trip: ' + error.message, true);
        } finally {
            this.toggleElementVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Load user trips
    async loadTrips() {
        if (!this.currentUser) return;

        try {
            this.toggleElementVisibility(this.elements.loadingIndicator, true);
            this.elements.tripsContainer.innerHTML = '';

            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Prepare query based on admin status
            let query = this.supabaseClient
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (!this.currentUser.isAdmin) {
                query = query.eq('user_id', user.id);
            }

            // Execute query
            const { data: trips, error } = await query;
            if (error) throw error;

            // Handle empty state
            if (!trips || trips.length === 0) {
                this.elements.tripsContainer.innerHTML = '<div class="empty-state">No trips recorded yet</div>';
                this.elements.totalSpentDisplay.textContent = 'R0.00';
                return;
            }

            // Render trips
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
                this.elements.tripsContainer.appendChild(tripElement);
            });

            // Calculate and display total spent
            const totalSpent = trips.reduce((sum, trip) => sum + trip.total_cost, 0);
            this.elements.totalSpentDisplay.textContent = `R${totalSpent.toFixed(2)}`;

        } catch (error) {
            console.error('Error loading trips:', error);
            this.elements.tripsContainer.innerHTML = '<div class="error-state">Error loading trips</div>';
        } finally {
            this.toggleElementVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Clear user's trip history
    async handleClearHistory() {
        if (!this.currentUser || !confirm('Are you sure you want to clear your trip history?')) return;

        try {
            this.toggleElementVisibility(this.elements.loadingIndicator, true);
            
            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Delete user's trips
            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            this.displayMessage(this.elements.resultDisplay, 'Your trip history has been cleared');
            await this.loadTrips();

        } catch (error) {
            console.error('Error clearing history:', error);
            this.displayMessage(this.elements.resultDisplay, 'Error clearing history', true);
        } finally {
            this.toggleElementVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Admin function to clear all trips
    async handleAdminClearAll() {
        if (!this.currentUser?.isAdmin || !confirm('Are you sure you want to clear ALL trip history?')) return;

        try {
            this.toggleElementVisibility(this.elements.loadingIndicator, true);
            
            // Delete all trips
            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .neq('id', 0);

            if (error) throw error;

            this.displayMessage(this.elements.resultDisplay, 'All trip history has been cleared');
            await this.loadTrips();

        } catch (error) {
            console.error('Error clearing all history:', error);
            this.displayMessage(this.elements.resultDisplay, 'Error clearing all history', true);
        } finally {
            this.toggleElementVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Show authentication screen
    showAuthScreen() {
        this.toggleElementVisibility(this.elements.authContainer, true);
        this.toggleElementVisibility(this.elements.appContainer, false);
        this.elements.usernameInput.value = '';
        this.elements.passwordInput.value = '';
        this.elements.loginError.textContent = '';
    }

    // Show application screen
    showAppScreen() {
        this.toggleElementVisibility(this.elements.authContainer, false);
        this.toggleElementVisibility(this.elements.appContainer, true);
        this.elements.currentUserDisplay.textContent = this.currentUser.username;
        this.toggleElementVisibility(this.elements.adminBadge, this.currentUser.isAdmin);
        this.toggleElementVisibility(this.elements.adminClearAllButton, this.currentUser.isAdmin);
        this.loadTrips();
    }

    // Check initial authentication state
    async checkAuthState() {
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        
        if (user) {
            const username = user.email.split('@')[0].toLowerCase();
            
            this.currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: this.isUserAdmin(username)
            };
            this.showAppScreen();
        } else {
            this.showAuthScreen();
        }
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create and initialize the application
        const app = new PetrolTrackerApp();
        await app.init();
    } catch (error) {
        console.error('Application initialization failed:', error);
        alert('Failed to initialize the application. Please reload the page.');
    }
});