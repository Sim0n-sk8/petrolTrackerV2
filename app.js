// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    FUEL_EFFICIENCY: 11.47,
    ADMIN_USERS: ['simon']
};

class PetrolCostTracker {
    constructor() {
        // Initialize DOM elements
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
            calculateBtn: document.getElementById('calculate-btn'),
            resultContainer: document.getElementById('result'),
            loadingIndicator: document.getElementById('loading'),
            tripsContainer: document.getElementById('trips'),
            totalSpentDisplay: document.getElementById('total'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            adminClearAllBtn: document.getElementById('admin-clear-all-btn')
        };

        this.currentUser = null;
        this.supabaseClient = null;

        // Initialize the application
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize Supabase client with enhanced session handling
            this.supabaseClient = supabase.createClient(
                CONFIG.SUPABASE_URL, 
                CONFIG.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storage: localStorage
                    }
                }
            );

            // Set up event listeners
            this.setupEventListeners();

            // Check initial auth state
            await this.checkAuthState();

        } catch (error) {
            console.error('Initialization failed:', error);
            this.showErrorScreen('Application failed to initialize. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Login button
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', this.handleLogin.bind(this));
        }

        // Trip form submission
        if (this.elements.tripForm) {
            this.elements.tripForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTripSubmission();
            });
        }

        // Calculate button (additional to form submission)
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.addEventListener('click', this.handleTripSubmission.bind(this));
        }

        // Logout button
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Clear history buttons
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', this.clearUserHistory.bind(this));
        }
        if (this.elements.adminClearAllBtn) {
            this.elements.adminClearAllBtn.addEventListener('click', this.adminClearAllHistory.bind(this));
        }
    }

    showErrorScreen(message) {
        // Fallback error display
        document.body.innerHTML = `
            <div class="error-container">
                <h2>Application Error</h2>
                <p>${message}</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
    }

    toggleElement(element, show) {
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    }

    showError(element, message) {
        if (element) {
            element.textContent = message;
            this.toggleElement(element, true);
        }
    }

    async handleLogin() {
        const username = this.elements.usernameInput?.value.trim().toLowerCase();
        const password = this.elements.passwordInput?.value;

        if (!username || !password) {
            this.showError(this.elements.loginError, 'Please enter both username and password');
            return;
        }

        try {
            this.toggleElement(this.elements.loadingIndicator, true);
            this.showError(this.elements.loginError, '');

            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: `${username}@petroltracker.com`,
                password: password
            });

            if (error) throw error;

            // Ensure session is properly set
            if (!data.session) {
                throw new Error('Login successful but no session returned');
            }

            this.currentUser = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                isAdmin: CONFIG.ADMIN_USERS.includes(username)
            };

            this.showAppScreen();

        } catch (error) {
            console.error('Login error:', error);
            this.showError(this.elements.loginError, 
                error.message.includes('Invalid') ? 'Invalid username or password' : 'Login failed');
        } finally {
            this.toggleElement(this.elements.loadingIndicator, false);
        }
    }

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

    showAuthScreen() {
        this.toggleElement(this.elements.authContainer, true);
        this.toggleElement(this.elements.appContainer, false);
        
        if (this.elements.usernameInput) this.elements.usernameInput.value = '';
        if (this.elements.passwordInput) this.elements.passwordInput.value = '';
        if (this.elements.loginError) this.elements.loginError.textContent = '';
    }

    showAppScreen() {
        this.toggleElement(this.elements.authContainer, false);
        this.toggleElement(this.elements.appContainer, true);

        if (this.elements.currentUsername) {
            this.elements.currentUsername.textContent = this.currentUser.username;
        }
        this.toggleElement(this.elements.adminBadge, this.currentUser.isAdmin);
        this.toggleElement(this.elements.adminClearAllBtn, this.currentUser.isAdmin);

        this.loadTripHistory();
    }

    async handleTripSubmission() {
        const distance = parseFloat(this.elements.distanceInput?.value);
        const petrolPrice = parseFloat(this.elements.petrolPriceInput?.value);

        if (isNaN(distance) || distance <= 0) {
            this.showError(this.elements.resultContainer, 'Please enter a valid distance');
            return;
        }

        if (isNaN(petrolPrice) || petrolPrice <= 0) {
            this.showError(this.elements.resultContainer, 'Please enter a valid petrol price');
            return;
        }

        try {
            this.toggleElement(this.elements.loadingIndicator, true);
            
            const litersUsed = distance / CONFIG.FUEL_EFFICIENCY;
            const totalCost = litersUsed * petrolPrice;

            // Get current session first
            const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();
            if (sessionError || !session) throw new Error('No valid session');

            // Then get user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError || !user) throw userError || new Error('No user found');

            // Prepare the data object with correct field names
            const tripData = {
                user_id: user.id,
                distance: distance,
                petrol_price: petrolPrice,
                total_cost: parseFloat(totalCost.toFixed(2)),
                litres_used: parseFloat(litersUsed.toFixed(2)),
                created_at: new Date().toISOString()  // Add timestamp
            };

            // Debug: Log the data being sent
            console.log('Submitting trip data:', tripData);

            const { data, error } = await this.supabaseClient
                .from('trips')
                .insert(tripData)
                .select();  // Add .select() to return the inserted record

            if (error) throw error;

            // Debug: Log the response
            console.log('Trip submission response:', data);

            if (this.elements.resultContainer) {
                this.elements.resultContainer.innerHTML = `
                    <div class="result-item">
                        <span>Distance:</span> ${distance} km
                    </div>
                    <div class="result-item">
                        <span>Petrol Price:</span> R${petrolPrice.toFixed(2)}/L
                    </div>
                    <div class="result-item">
                        <span>Litres Used:</span> ${litersUsed.toFixed(2)} L
                    </div>
                    <div class="result-total">
                        <span>Total Cost:</span> R${totalCost.toFixed(2)}
                    </div>
                `;
            }

            if (this.elements.distanceInput) this.elements.distanceInput.value = '';
            if (this.elements.petrolPriceInput) this.elements.petrolPriceInput.value = '';

            await this.loadTripHistory();

        } catch (error) {
            console.error('Trip submission error:', error);
            this.showError(this.elements.resultContainer, 'Failed to record trip. Please try again.');
        } finally {
            this.toggleElement(this.elements.loadingIndicator, false);
        }
    }

    async loadTripHistory() {
        try {
            this.toggleElement(this.elements.loadingIndicator, true);
            if (this.elements.tripsContainer) this.elements.tripsContainer.innerHTML = '';

            // First get session to ensure we're authenticated
            const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();
            if (sessionError || !session) throw new Error('No valid session');

            // Then get user
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError || !user) throw userError || new Error('No user found');

            let query = this.supabaseClient
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (!this.currentUser.isAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { data: trips, error } = await query;
            if (error) throw error;

            if (!trips || trips.length === 0) {
                if (this.elements.tripsContainer) {
                    this.elements.tripsContainer.innerHTML = '<div class="no-trips">No trips recorded yet</div>';
                }
                if (this.elements.totalSpentDisplay) {
                    this.elements.totalSpentDisplay.textContent = 'Total Spent: R0.00';
                }
                return;
            }

            let totalSpent = 0;
            trips.forEach(trip => {
                if (this.elements.tripsContainer) {
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
                }
                totalSpent += trip.total_cost;
            });

            if (this.elements.totalSpentDisplay) {
                this.elements.totalSpentDisplay.textContent = `Total Spent: R${totalSpent.toFixed(2)}`;
            }

        } catch (error) {
            console.error('Failed to load trip history:', error);
            if (this.elements.tripsContainer) {
                this.elements.tripsContainer.innerHTML = '<div class="error-message">Failed to load trip history</div>';
            }
        } finally {
            this.toggleElement(this.elements.loadingIndicator, false);
        }
    }

    async clearUserHistory() {
        if (!confirm('Are you sure you want to clear your trip history?')) return;

        try {
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError || !user) throw userError || new Error('No user found');

            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            await this.loadTripHistory();
            alert('Your trip history has been cleared');

        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear trip history');
        }
    }

    async adminClearAllHistory() {
        if (!this.currentUser?.isAdmin || !confirm('Are you sure you want to clear ALL trip history?')) return;

        try {
            const { error } = await this.supabaseClient
                .from('trips')
                .delete()
                .neq('id', 0);

            if (error) throw error;

            await this.loadTripHistory();
            alert('All trip history has been cleared');

        } catch (error) {
            console.error('Failed to clear all history:', error);
            alert('Failed to clear all trip history');
        }
    }

    async checkAuthState() {
        try {
            // First try to get the session
            const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();
            
            if (sessionError) throw sessionError;

            if (session) {
                const username = session.user.email.split('@')[0].toLowerCase();
                
                this.currentUser = {
                    username: username.charAt(0).toUpperCase() + username.slice(1),
                    isAdmin: CONFIG.ADMIN_USERS.includes(username)
                };
                this.showAppScreen();
                return;
            }

            // If no session, show auth screen
            this.showAuthScreen();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthScreen();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PetrolCostTracker();
});
