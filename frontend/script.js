// We wrap all our code in 'DOMContentLoaded' to make sure
// the HTML is fully loaded before we try to find elements.
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Get All DOM Elements ---
  // We get all our HTML elements once and store them in constants.
  const mapElement = "map";
  const pickupBtn = document.getElementById("set-pickup");
  const dropoffBtn = document.getElementById("set-dropoff");
  const getPriceBtn = document.getElementById("get-price");

  const resultsDiv = document.getElementById("results");
  const loadingSpinner = document.getElementById("loading-spinner");
  const errorMessage = document.getElementById("error-message");
  const priceDisplay = document.getElementById("price-display");

  const priceText = document.getElementById("price-text");
  const surgeText = document.getElementById("surge-text");
  const waitText = document.getElementById("wait-text");
  const distanceText = document.getElementById("distance-text"); // <-- NEW element

  // --- 2. Initialize State ---

  // --- Back to New York City ---
  const map = L.map(mapElement).setView([40.7128, -74.006], 13); // New York

  // Add the map "tiles" (the actual map image) from OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // App state variables
  let mode = "pickup"; // 'pickup' or 'dropoff'
  let pickupCoords = null;
  let dropoffCoords = null;

  // Marker variables
  let pickupMarker = null;
  let dropoffMarker = null;

  // Custom icons for markers
  const greenIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const redIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Start with buttons in a clean state
  updateButtonState();
  getPriceBtn.disabled = true; // Disabled until coords are set

  // --- 3. UI Helper Functions ---

  // Manages the visual state of the 'pickup' and 'dropoff' buttons
  function updateButtonState() {
    if (mode === "pickup") {
      pickupBtn.classList.add("btn-active");
      dropoffBtn.classList.remove("btn-active");
    } else {
      dropoffBtn.classList.add("btn-active");
      pickupBtn.classList.remove("btn-active");
    }

    // Enable 'Get Price' button ONLY if both coords are set
    getPriceBtn.disabled = !(pickupCoords && dropoffCoords);
  }

  // Creates or moves the green pickup marker
  function setPickup(latlng) {
    pickupCoords = latlng;
    if (pickupMarker) {
      pickupMarker.setLatLng(latlng); // Move existing marker
    } else {
      // Create new marker
      pickupMarker = L.marker(latlng, { icon: greenIcon }).addTo(map);
    }
    pickupMarker
      .bindPopup(
        `<b>Pickup Location</b><br>${latlng.lat.toFixed(
          4
        )}, ${latlng.lng.toFixed(4)}`
      )
      .openPopup();

    // UX: Automatically switch to dropoff mode
    mode = "dropoff";
    updateButtonState();
  }

  // Creates or moves the red dropoff marker
  function setDropoff(latlng) {
    dropoffCoords = latlng;
    if (dropoffMarker) {
      dropoffMarker.setLatLng(latlng); // Move existing marker
    } else {
      // Create new marker
      dropoffMarker = L.marker(latlng, { icon: redIcon }).addTo(map);
    }
    dropoffMarker
      .bindPopup(
        `<b>Dropoff Location</b><br>${latlng.lat.toFixed(
          4
        )}, ${latlng.lng.toFixed(4)}`
      )
      .openPopup();
    updateButtonS;
    tate();
  }

  // --- UI State Changers (Loading, Error, Success) ---

  function showLoading() {
    resultsDiv.classList.remove("hidden");
    priceDisplay.classList.add("hidden");
    errorMessage.classList.add("hidden");
    loadingSpinner.classList.remove("hidden");
  }

  // Update showPrice to display distance
  function showPrice(data) {
    priceText.innerText = `$${data.estimated_price.toFixed(2)}`;
    distanceText.innerText = `${data.distance_km} km`; // <-- NEW
    surgeText.innerText = `${data.surge_multiplier}x`;
    waitText.innerText = `${data.estimated_wait_time_minutes} min`;

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

  // --- 4. Event Listeners ---

  // Set mode to 'pickup'
  pickupBtn.addEventListener("click", () => {
    mode = "pickup";
    updateButtonState();
  });

  // Set mode to 'dropoff'
  dropoffBtn.addEventListener("click", () => {
    mode = "dropoff";
    updateButtonS;
    tate();
  });

  // Handle map clicks
  map.on("click", (e) => {
    if (mode === "pickup") {
      setPickup(e.latlng);
    } else {
      setDropoff(e.latlng);
    }
  });

  // --- 5. THE API CALL (v2.0) ---
  // This is the main event when 'Get Price' is clicked
  getPriceBtn.addEventListener("click", async () => {
    if (!pickupCoords || !dropoffCoords) {
      showError("Please set both pickup and dropoff locations.");
      return;
    }

    showLoading();

    // Add timestamp to the request
    const requestBody = {
      pickup_lat: pickupCoords.lat,
      pickup_lon: pickupCoords.lng,
      dropoff_lat: dropoffCoords.lat,
      dropoff_lon: dropoffCoords.lng,
      timestamp: new Date().toISOString(), // <-- NEW
    };

    try {
      // We 'fetch' data from our backend API.
      // Make sure your backend (main.py) is running!
      const response = await fetch("http://127.0.0.1:8000/get_price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Handle server errors (like 422 validation or 500)
      if (!response.ok) {
        const errorData = await response.json();
        // 'errorData.detail' is what FastAPI sends
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      // This is the "API Contract" (Output)
      // We get the JSON data back from the backend.
      const data = await response.json();

      // Success! Show the price.
      showPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
      showError(`Failed to get price. ${error.message}`);
    }
  });
});
