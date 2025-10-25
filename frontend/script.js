document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Get All DOM Elements ---
  const form = document.getElementById("price-form");
  const getPriceBtn = document.getElementById("get-price");
  const datetimeInput = document.getElementById("datetime");
  const currentTimeCheckbox = document.getElementById("use-current-time");

  // (Result elements are the same)
  const resultsDiv = document.getElementById("results");
  const loadingSpinner = document.getElementById("loading-spinner");
  const errorMessage = document.getElementById("error-message");
  const priceDisplay = document.getElementById("price-display");

  const priceText = document.getElementById("price-text");
  const baseFareText = document.getElementById("base-fare-text");
  const surgeText = document.getElementById("surge-text");
  const explanationText = document.getElementById("explanation-text");

  // --- 2. Event Listeners ---

  // --- NEW v5.3 LOGIC ---
  // This listener now fills in the time input
  currentTimeCheckbox.addEventListener("change", () => {
    if (currentTimeCheckbox.checked) {
      // If checked, fill the input with the current time
      datetimeInput.value = getFormattedLocalTime();
      datetimeInput.disabled = true;
    } else {
      // If unchecked, clear it and re-enable it
      datetimeInput.value = "";
      datetimeInput.disabled = false;
    }
  });
  // --- END OF CHANGE ---

  // The main submit listener (no changes)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    // --- 3. Get Form Data ---
    const datetime_str = datetimeInput.value; // Just read the value

    // Check if it's empty
    if (!datetime_str) {
      showError("Please select a date and time.");
      return;
    }

    // --- 4. THE API CONTRACT (INPUT) ---
    const requestBody = {
      pickup_location: document.getElementById("pickup-location").value,
      dropoff_location: document.getElementById("dropoff-location").value,
      datetime_str: datetime_str,
      passenger_count: parseInt(
        document.getElementById("passenger-count").value
      ),
      weather: document.getElementById("weather").value,
      ride_type: document.getElementById("ride-type").value,
    };

    // --- 5. THE API CALL (no changes) ---
    try {
      const response = await fetch("http://127.0.0.1:8000/get_price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      showPrice(data);
    } catch (error) {
      console.error("Fetch error details:", error);
      showError(`Failed to get price. Check console (F12) for details.`);
    }
  });

  // --- 4. Helper Functions ---

  // --- NEW v5.3 HELPER FUNCTION ---
  // This function creates the 'YYYY-MM-DDTHH:MM' string
  // from the user's *local* time.
  function getFormattedLocalTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  // --- END OF CHANGE ---

  // --- UI State Changers (no changes) ---
  function showLoading() {
    resultsDiv.classList.remove("hidden");
    priceDisplay.classList.add("hidden");
    errorMessage.classList.add("hidden");
    loadingSpinner.classList.remove("hidden");
  }

  function showPrice(data) {
    priceText.innerText = data.estimated_price.toFixed(2);
    baseFareText.innerText = data.base_fare.toFixed(2);
    surgeText.innerText = `${data.surge_multiplier}x`;
    explanationText.innerText = data.explanation;

    resultsDiv.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
    errorMessage.classList.add("hidden");
    priceDisplay.classList.remove("hidden");
  }

  function showError(message) {
    errorMessage.innerText = message;
    resultsDiv.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
    priceDisplay.classList.add("hidden");
    errorMessage.classList.remove("hidden");
  }
});
