document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Get All DOM Elements ---
  const form = document.getElementById("price-form");
  const datetimeInput = document.getElementById("datetime");
  const currentTimeCheckbox = document.getElementById("use-current-time");
  const rideCards = document.querySelectorAll(".ride-card");

  // --- Results elements (new IDs from Claude's HTML) ---
  const resultsSection = document.getElementById("results");
  const loadingSpinner = document.getElementById("loading-spinner");
  const errorMessage = document.getElementById("error-message");
  const errorText = document.getElementById("error-text");
  const priceDisplay = document.getElementById("price-display");
  const priceAmount = document.getElementById("price-amount");
  const baseFareValue = document.getElementById("base-fare-value");
  const surgeValue = document.getElementById("surge-value");
  const explanationText = document.getElementById("explanation-text");

  // --- 2. State ---
  let selectedRideType = "Standard"; // Default to Standard

  // --- 3. Initialize ---
  function init() {
    // Select first ride card by default
    rideCards[0].classList.add("ride-card-selected");
  }

  // --- 4. Event Listeners ---
  currentTimeCheckbox.addEventListener("change", () => {
    if (currentTimeCheckbox.checked) {
      datetimeInput.value = getFormattedLocalTime();
      datetimeInput.disabled = true;
    } else {
      datetimeInput.value = "";
      datetimeInput.disabled = false;
    }
  });

  rideCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectedRideType = card.dataset.value;
      rideCards.forEach((c) => c.classList.remove("ride-card-selected"));
      card.classList.add("ride-card-selected");
    });
  });

  form.addEventListener("submit", async (e) => {
    // Stop the page from reloading
    e.preventDefault();

    const datetime_str = datetimeInput.value;
    if (!datetime_str) {
      showError("Please select a date and time.");
      return;
    }

    // Show the spinner
    showLoading();

    // --- 5. THE API CONTRACT (INPUT) ---
    // This is the "Order" we send to the "Kitchen"
    // This FIXES THE BUG by including 'ride_type'
    const requestBody = {
      pickup_location: document.getElementById("pickup-location").value,
      dropoff_location: document.getElementById("dropoff-location").value,
      datetime_str: datetime_str,
      passenger_count: parseInt(
        document.getElementById("passenger-count").value
      ),
      ride_type: selectedRideType, // <-- BUG IS FIXED HERE
    };

    // --- 6. THE API CALL ---
    try {
      // "await" pauses the code and waits for the network
      const response = await fetch("http://127.0.0.1:8000/get_price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody), // Send the "Order"
      });

      // If the kitchen sends an error (like 422)
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      // Get the "Food" (price data) from the kitchen
      const data = await response.json();

      // Deliver the food to the table
      showPrice(data);
    } catch (error) {
      // If the waiter drops the food (network error)
      console.error("Fetch error:", error);
      showError(
        "Unable to calculate price. Please check your connection and try again."
      );
    }
  });

  // --- 7. Helper Functions (Waiter's Tools) ---

  // Tool 1: Get Local Time
  function getFormattedLocalTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Tool 2: Show the Spinner
  function showLoading() {
    resultsSection.classList.remove("hidden");
    loadingSpinner.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    priceDisplay.classList.add("hidden");
  }

  // Tool 3: Show the Final Price (using new HTML IDs)
  function showPrice(data) {
    priceAmount.textContent = data.estimated_price.toFixed(2);

    // --- THIS IS THE JAVASCRIPT BUG FIX ---
    // Removed the "$" symbol to match your request
    baseFareValue.textContent = data.base_fare.toFixed(2);
    // --- END OF FIX ---

    surgeValue.textContent = `${data.surge_multiplier}x`;
    explanationText.textContent = data.explanation;

    resultsSection.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
    errorMessage.classList.add("hidden");
    priceDisplay.classList.remove("hidden");
  }

  // Tool 4: Show an Error (using new HTML IDs)
  function showError(message) {
    errorText.textContent = message;
    resultsSection.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
    priceDisplay.classList.add("hidden");
    errorMessage.classList.remove("hidden");
  }

  // --- 8. Initialize the App ---
  init();
});
