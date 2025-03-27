// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    FUEL_EFFICIENCY: 11.47,
    ADMIN_USERS: ['simon']
};

class PetrolCostTracker {
    constructor() {
        // DOM Element References
        this.elements = {
            authContainer: document.getElementById('auth-container'),
            appContainer: document.getElementById('app-container'),
            loginForm: document.getElementById('login-form'),
            loginBtn: document.getElementById('login-btn'),
            loginError: document.getElementById('login-error'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            
            currentUsername: document.getElementById('current-username'),
            adminBadge: document.getElementById('admin-badge'),
            logoutBtn: document.getElementById('logout-btn'),
            
            tripForm: document.getElementById('trip-form'),
            distanceInput: document.getElementById('distance'),
            petrolPriceInput: document.getElementById('petrolPrice'),
            
            resultContainer: document.getElementById('result'),
            loadingIndicator: document.getElementById('loading'),
            tripsContainer: document.getElementById('trips'),
            totalSpentDisplay: document.getElementById('total'),
            
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            adminClearAllBtn: document.getElementById('admin-clear-all-btn')
        };

        this.currentUser = null;
        this.supabaseClient = null;

        this.initializeEventListeners();
    }

    async initialize() {
        // Initialize Supabase client
        this.supabaseClient = supabase.createClient(
            CONFIG.SUPABASE_URL, 
            CONFIG.SUPABASE_ANON_KEY
        );

        // Check initial authentication state
        await this.checkAuthState();
    }

    initializeEventListeners() {
        this.elements.loginBtn.addEventListener('click', this.handleLogin.bind(this));
        this.elements.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        this.elements.tripForm.addEventListener('submit', this.handleTripSubmission.bind(this));
        this.elements.clearHistoryBtn.addEventListener('click', this.clearUserHistory.bind(this));
        this.elements.adminClearAllBtn.addEventListener('click', this.adminClearAllHistory.bind(this));
    }

    // Toggle visibility of elements
    toggleVisibility(element, isVisible) {
        if (element) {
            element.classList.toggle('hidden', !isVisible);
        }
    }

    // Display error messages
    displayError(message) {
        this.elements.loginError.textContent = message;
        this.toggleVisibility(this.elements.loginError, true);
    }

    // Handle user login
    async handleLogin() {
        const username = this.elements.usernameInput.value.trim().toLowerCase();
        const password = this.elements.passwordInput.value;

        // Basic validation
        if (!username || !password) {
            this.displayError('Please enter both username and password');
            return;
        }

        try {
            // Attempt Supabase authentication
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: `${username}@petroltracker.com`,
                password: password
            });

            if (error) throw error;

            // Set current user
            this.currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: CONFIG.ADMIN_USERS.includes(username)
            };

            // Show app screen
            this.showAppScreen();
            
        } catch (error) {
            console.error('Login error:', error);
            this.displayError('Invalid username or password');
        }
    }

    // Handle user logout
    async handleLogout() {
        try {
            await this.supabaseClient.auth.signOut();
            this.currentUser = null;
            this.showAuthScreen();
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    }

    // Show authentication screen
    showAuthScreen() {
        this.toggleVisibility(this.elements.authContainer, true);
        this.toggleVisibility(this.elements.appContainer, false);
        
        // Reset login form
        this.elements.usernameInput.value = '';
        this.elements.passwordInput.value = '';
        this.elements.loginError.textContent = '';
    }

    // Show application screen
    showAppScreen() {
        this.toggleVisibility(this.elements.authContainer, false);
        this.toggleVisibility(this.elements.appContainer, true);

        // Update user info
        this.elements.currentUsername.textContent = this.currentUser.username;
        this.toggleVisibility(this.elements.adminBadge, this.currentUser.isAdmin);
        this.toggleVisibility(this.elements.adminClearAllBtn, this.currentUser.isAdmin);

        // Load trip history
        this.loadTripHistory();
    }

    // Handle trip submission
    async handleTripSubmission(event) {
        event.preventDefault();
        
        const distance = parseFloat(this.elements.distanceInput.value);
        const petrolPrice = parseFloat(this.elements.petrolPriceInput.value);

        // Validate inputs
        if (isNaN(distance) || distance <= 0) {
            this.displayTripError('Please enter a valid distance');
            return;
        }

        if (isNaN(petrolPrice) || petrolPrice <= 0) {
            this.displayTripError('Please enter a valid petrol price');
            return;
        }

        try {
            // Calculate trip cost
            const literesUsed = distance / CONFIG.FUEL_EFFICIENCY;
            const totalCost = literesUsed * petrolPrice;

            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Save trip to database
            const { error } = await this.supabaseClient
                .from('trips')
                .insert({
                    user_id: user.id,
                    distance,
                    petrol_price: petrolPrice,
                    total_cost: parseFloat(totalCost.toFixed(2)),
                    litres_used: parseFloat(literesUsed.toFixed(2))
                });

            if (error) throw error;

            // Display result
            this.elements.resultContainer.innerHTML = `
                <p>Trip Cost: R${totalCost.toFixed(2)}</p>
                <p>Distance: ${distance} km</p>
                <p>Petrol Price: R${petrolPrice.toFixed(2)}/L</p>
                <p>Litres Used: ${literesUsed.toFixed(2)} L</p>
            `;

            // Reset form
            this.elements.distanceInput.value = '';
            this.elements.petrolPriceInput.value = '';

            // Reload trip history
            await this.loadTripHistory();

        } catch (error) {
            console.error('Trip submission error:', error);
            this.displayTripError('Failed to record trip. Please try again.');
        }
    }

    // Display trip-related errors
    displayTripError(message) {
        this.elements.resultContainer.innerHTML = `<p class="error">${message}</p>`;
    }

    // Load trip history
    async loadTripHistory() {
        try {
            // Show loading indicator
            this.toggleVisibility(this.elements.loadingIndicator, true);
            this.elements.tripsContainer.innerHTML = '';

            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Prepare query
            let query = this.supabaseClient
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by user if not admin
            if (!this.currentUser.isAdmin) {
                query = query.eq('user_id', user.id);
            }

            // Execute query
            const { data: trips, error } = await query;
            if (error) throw error;

            // Handle empty state
            if (!trips || trips.length === 0) {
                this.elements.tripsContainer.innerHTML = '<p>No trips recorded</p>';
                this.elements.totalSpentDisplay.textContent = 'Total Spent: R0.00';
                return;
            }

            // Render trips
            let totalSpent = 0;
            trips.forEach(trip => {
                const tripElement = document.createElement('div');
                tripElement.classList.add('trip-item');
                tripElement.innerHTML = `
                    <div class="trip-date">${new Date(trip.created_at).toLocaleDateString()}</div>
                    <div class="trip-details">
                        <span>${trip.distance} km</span>
                        <span>@ R${trip.petrol_price.toFixed(2)}/L</span>
                    </div>
                    <div class="trip-cost">R${trip.total_cost.toFixed(2)}</div>
                `;
                this.elements.tripsContainer.appendChild(tripElement);
                totalSpent += trip.total_cost;
            });

            // Update total spent
            this.elements.totalSpentDisplay.textContent = `Total Spent: R${totalSpent.toFixed(2)}`;

        } catch (error) {
            console.error('Failed to load trip history:', error);
            this.elements.tripsContainer.innerHTML = '<p class="error">Failed to load trip history</p>';
        } finally {
            // Hide loading indicator
            this.toggleVisibility(this.elements.loadingIndicator, false);
        }
    }

    // Clear user's trip history
    async clearUserHistory() {
        if (!confirm('Are you sure you want to clear your trip history?')) return;

        try {
            // Get current user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError) throw userError;

            // Delete user's trips
            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            // Reload trip history
            await this.loadTripHistory();
            alert('Your trip history has been cleared');

        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear trip history');
        }
    }

    // Admin function to clear all trips
    async adminClearAllHistory() {
        if (!this.currentUser.isAdmin || !confirm('Are you sure you want to clear ALL trip history?')) return;

        try {
            // Delete all trips
            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .neq('id', 0);

            if (error) throw error;

            // Reload trip history
            await this.loadTripHistory();
            alert('All trip history has been cleared');

        } catch (error) {
            console.error('Failed to clear all history:', error);
            alert('Failed to clear all trip history');
        }
    }

    // Check initial authentication state
    async checkAuthState() {
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        
        if (user) {
            const username = user.email.split('@')[0].toLowerCase();
            
            this.currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: CONFIG.ADMIN_USERS.includes(username)
            };
            this.showAppScreen();
        } else {
            this.showAuthScreen();
        }
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    const tracker = new PetrolCostTracker();
    await tracker.initialize();
});