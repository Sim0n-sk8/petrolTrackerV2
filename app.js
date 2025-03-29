// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    FUEL_EFFICIENCY: 11.47,
    ADMIN_USERS: ['simon']
};

class PetrolCostTracker {
    // ... [previous constructor and methods remain the same until handleTripSubmission]

    async handleTripSubmission() {
        const distance = parseFloat(this.elements.distanceInput?.value);
        const petrolPrice = parseFloat(this.elements.petrolPriceInput?.value);

        if (isNaN(distance) || distance <= 0) {
            this.showError(this.elements.resultContainer, 'Please enter a valid distance (greater than 0)');
            return;
        }

        if (isNaN(petrolPrice) || petrolPrice <= 0) {
            this.showError(this.elements.resultContainer, 'Please enter a valid petrol price (greater than 0)');
            return;// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mtnjdjrlfamvpmnswumq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bmpkanJsZmFtdnBtbnN3dW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwOTY4NDUsImV4cCI6MjA1ODY3Mjg0NX0.IRS_oL_Jvkk0WEbozefFiZL5DIsFsVEgvmiljvzX_Ok',
    FUEL_EFFICIENCY: 11.47,
    ADMIN_USERS: ['simon'],
    ALLOWED_USERS: {
        'simon': '@Ngrybirds71',
        'jaric': 'pH0tos', 
        'michael': 'f1Shing',
        'dornel': 'fl0Wer',
        'charl': 'g0Lf'
    }
};

class AuthManager {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.elements = {
            authContainer: document.getElementById('auth-container'),
            loginForm: document.getElementById('login-form'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            authError: document.getElementById('auth-error'),
            logoutBtn: document.getElementById('logout-btn'),
            userDisplay: document.getElementById('user-display'),
            appContainer: document.getElementById('app-container')
        };
        
        this.initAuth();
    }

    async initAuth() {
        // Check existing session
        const { data: { user }, error } = await this.supabaseClient.auth.getUser();
        
        if (user) {
            this.handleSuccessfulAuth(user);
        } else {
            this.showAuthForms();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    async handleLogin() {
        const username = this.elements.emailInput.value.trim().toLowerCase();
        const password = this.elements.passwordInput.value;
        
        // Verify this is one of the allowed users
        if (!CONFIG.ALLOWED_USERS[username] || CONFIG.ALLOWED_USERS[username] !== password) {
            this.showAuthError('Invalid username or password');
            return;
        }

        // For allowed users, use a consistent email pattern
        const userEmail = `${username}@company.com`;
        
        try {
            // Try to sign in (will work if user already exists)
            let { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: userEmail,
                password: password
            });

            // If error, create the user first (first-time login)
            if (error) {
                const { error: signUpError } = await this.supabaseClient.auth.signUp({
                    email: userEmail,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            full_name: username.charAt(0).toUpperCase() + username.slice(1)
                        }
                    }
                });
                
                if (signUpError) throw signUpError;
                
                // Now sign in with the new user
                const { data: signInData, error: signInError } = await this.supabaseClient.auth.signInWithPassword({
                    email: userEmail,
                    password: password
                });
                
                if (signInError) throw signInError;
                
                data = signInData;
            }

            this.handleSuccessfulAuth(data.user);
        } catch (error) {
            this.showAuthError(error.message || 'Login failed. Please try again.');
            console.error('Login error:', error);
        }
    }

    handleSuccessfulAuth(user) {
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'none';
        }
        
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'block';
        }
        
        if (this.elements.userDisplay) {
            const username = user.email.split('@')[0];
            this.elements.userDisplay.textContent = `Logged in as ${username}`;
            
            if (CONFIG.ADMIN_USERS.includes(username.toLowerCase())) {
                this.elements.userDisplay.innerHTML += ' <span class="admin-badge">(Admin)</span>';
            }
        }
        
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.style.display = 'block';
        }
        
        // Initialize the main app
        new PetrolCostTracker(this.supabaseClient, user);
    }

    async handleLogout() {
        try {
            const { error } = await this.supabaseClient.auth.signOut();
            if (error) throw error;
            
            this.showAuthForms();
            if (this.elements.userDisplay) {
                this.elements.userDisplay.textContent = '';
            }
            if (this.elements.appContainer) {
                this.elements.appContainer.style.display = 'none';
            }
        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    showAuthForms() {
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'block';
        }
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.style.display = 'none';
        }
        this.clearAuthError();
    }

    showAuthError(message, type = 'error') {
        if (this.elements.authError) {
            this.elements.authError.textContent = message;
            this.elements.authError.className = `auth-message ${type}`;
            this.elements.authError.style.display = 'block';
        }
    }

    clearAuthError() {
        if (this.elements.authError) {
            this.elements.authError.style.display = 'none';
            this.elements.authError.textContent = '';
        }
    }
}

class PetrolCostTracker {
    constructor(supabaseClient, user) {
        this.supabaseClient = supabaseClient;
        this.user = user;
        this.initializeElements();
        this.setupEventListeners();
        this.loadTripHistory();
    }

    initializeElements() {
        this.elements = {
            distanceInput: document.getElementById('distance'),
            petrolPriceInput: document.getElementById('petrol-price'),
            submitBtn: document.getElementById('submit-trip'),
            resultContainer: document.getElementById('result-container'),
            historyContainer: document.getElementById('history-container'),
            loadingIndicator: document.getElementById('loading-indicator'),
            adminPanel: document.getElementById('admin-panel')
        };

        // Show admin panel if user is admin
        const username = this.user.email.split('@')[0].toLowerCase();
        if (this.elements.adminPanel && CONFIG.ADMIN_USERS.includes(username)) {
            this.elements.adminPanel.style.display = 'block';
        }
    }

    setupEventListeners() {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.addEventListener('click', () => this.handleTripSubmission());
        }
    }

    async handleTripSubmission() {
        const distance = parseFloat(this.elements.distanceInput?.value);
        const petrolPrice = parseFloat(this.elements.petrolPriceInput?.value);

        if (isNaN(distance) || distance <= 0) {
            this.showError('Please enter a valid distance (greater than 0)');
            return;
        }

        if (isNaN(petrolPrice) || petrolPrice <= 0) {
            this.showError('Please enter a valid petrol price (greater than 0)');
            return;
        }

        try {
            this.toggleLoading(true);
            
            const litersUsed = distance / CONFIG.FUEL_EFFICIENCY;
            const totalCost = litersUsed * petrolPrice;

            const tripData = {
                user_id: this.user.id,
                username: this.user.email.split('@')[0],
                distance: parseFloat(distance.toFixed(2)),
                petrol_price: parseFloat(petrolPrice.toFixed(2)),
                litres_used: parseFloat(litersUsed.toFixed(2)),
                total_cost: parseFloat(totalCost.toFixed(2))
            };

            const { data, error } = await this.supabaseClient
                .from('trips')
                .insert(tripData)
                .select();

            if (error) throw error;

            // Display results
            if (this.elements.resultContainer) {
                this.elements.resultContainer.innerHTML = `
                    <div class="result-item">
                        <span>Distance:</span> ${distance.toFixed(1)} km
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

            // Clear form
            if (this.elements.distanceInput) this.elements.distanceInput.value = '';
            if (this.elements.petrolPriceInput) this.elements.petrolPriceInput.value = '';

            // Refresh history
            await this.loadTripHistory();

        } catch (error) {
            this.showError(`Failed to record trip: ${error.message}`);
            console.error('Trip submission failed:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    async loadTripHistory() {
        try {
            this.toggleLoading(true);
            
            let query = this.supabaseClient
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            // If not admin, only show user's trips
            const username = this.user.email.split('@')[0].toLowerCase();
            if (!CONFIG.ADMIN_USERS.includes(username)) {
                query = query.eq('user_id', this.user.id);
            }

            const { data, error } = await query;

            if (error) throw error;

            this.displayTripHistory(data);
        } catch (error) {
            this.showError(`Failed to load history: ${error.message}`);
            console.error('History load failed:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    displayTripHistory(trips) {
        if (!this.elements.historyContainer) return;

        if (!trips || trips.length === 0) {
            this.elements.historyContainer.innerHTML = '<p>No trip history found</p>';
            return;
        }

        const html = trips.map(trip => `
            <div class="trip-card">
                <div class="trip-header">
                    <span class="trip-date">${new Date(trip.created_at).toLocaleString()}</span>
                    ${CONFIG.ADMIN_USERS.includes(this.user.email.split('@')[0].toLowerCase()) ? 
                        `<span class="trip-user">User: ${trip.username || trip.user_id.substring(0, 8)}</span>` : ''}
                </div>
                <div class="trip-details">
                    <div><span>Distance:</span> ${trip.distance} km</div>
                    <div><span>Petrol Price:</span> R${trip.petrol_price}/L</div>
                    <div><span>Litres Used:</span> ${trip.litres_used} L</div>
                    <div class="trip-total"><span>Total Cost:</span> R${trip.total_cost}</div>
                </div>
            </div>
        `).join('');

        this.elements.historyContainer.innerHTML = html;
    }

    showError(message) {
        if (this.elements.resultContainer) {
            this.elements.resultContainer.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }

    toggleLoading(show) {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Initialize Auth Manager
    new AuthManager(supabaseClient);
});
        }

        try {
            this.toggleElement(this.elements.loadingIndicator, true);
            
            const litersUsed = distance / CONFIG.FUEL_EFFICIENCY;
            const totalCost = litersUsed * petrolPrice;

            // Get current user session
            const { data: { user }, error: userError } = await this.supabaseClient.auth.getUser();
            if (userError || !user) {
                throw new Error('User not found: ' + (userError?.message || 'No user data'));
            }

            // Prepare trip data with UUID user_id
            const tripData = {
                user_id: user.id, // Using UUID directly
                distance: parseFloat(distance.toFixed(2)),
                petrol_price: parseFloat(petrolPrice.toFixed(2)),
                litres_used: parseFloat(litersUsed.toFixed(2)),
                total_cost: parseFloat(totalCost.toFixed(2))
            };

            const { data, error } = await this.supabaseClient
                .from('trips')
                .insert(tripData)
                .select();

            if (error) throw error;

            // Display results and clear form
            if (this.elements.resultContainer) {
                this.elements.resultContainer.innerHTML = `
                    <div class="result-item">
                        <span>Distance:</span> ${distance.toFixed(1)} km
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

            // Clear form
            if (this.elements.distanceInput) this.elements.distanceInput.value = '';
            if (this.elements.petrolPriceInput) this.elements.petrolPriceInput.value = '';

            // Refresh history
            await this.loadTripHistory();

        } catch (error) {
            this.logError('Trip submission failed', error);
            this.showError(this.elements.resultContainer, 
                `Failed to record trip: ${error.message || 'Unknown error'}`);
        } finally {
            this.toggleElement(this.elements.loadingIndicator, false);
        }
    }

    // ... [rest of the methods remain the same]
}

document.addEventListener('DOMContentLoaded', () => {
    new PetrolCostTracker();
});
