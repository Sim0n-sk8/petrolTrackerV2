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
            return;
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
