document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Get All DOM Elements ---
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
  const distanceText = document.getElementById("distance-text");

  // --- 2. Initialize State ---
  const map = L.map(mapElement).setView([40.7128, -74.006], 13); // New York

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // App state variables
  let mode = "pickup";
  let pickupCoords = null;
  let dropoffCoords = null;

  let routingControl = null;
  let routeSummary = null;

  // --- (Marker icons are the same) ---
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

  // --- 3. NEW: Initialize Geocoder ---
  // This adds the search bar
  const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false, // We don't want its default pin
    placeholder: "Search for an address...",
    collapsed: false, // Keep it open by default
    geocoder: L.Control.Geocoder.nominatim(), // Use the free Nominatim geocoder
  })
    .on("markgeocode", function (e) {
      // --- THIS IS THE KEY ---
      // When a user selects an address, this function runs.
      const latlng = e.geocode.center;

      // We check our app's 'mode' and call the correct function
      if (mode === "pickup") {
        setPickup(latlng);
      } else {
        setDropoff(latlng);
      }
    })
    .addTo(map);

  // --- 4. UI Helper Functions ---

  updateButtonState();
  getPriceBtn.disabled = true;

  function updateButtonState() {
    if (mode === "pickup") {
      pickupBtn.classList.add("btn-active");
      dropoffBtn.classList.remove("btn-active");
    } else {
      dropoffBtn.classList.add("btn-active");
      pickupBtn.classList.remove("btn-active");
    }
    getPriceBtn.disabled = !routeSummary;
  }

  function drawRoute() {
    if (routingControl) {
      map.removeControl(routingControl);
    }
    if (!pickupCoords || !dropoffCoords) {
      return;
    }

    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(pickupCoords.lat, pickupCoords.lng),
        L.latLng(dropoffCoords.lat, dropoffCoords.lng),
      ],
      createMarker: function (i, waypoint, n) {
        const icon = i === 0 ? greenIcon : redIcon;
        const title = i === 0 ? "Pickup" : "Dropoff";
        return L.marker(waypoint.latLng, {
          icon: icon,
          title: title,
          draggable: false,
        });
      },
      show: false,
      addWaypoints: false,
      lineOptions: {
        styles: [{ color: "#2563EB", opacity: 0.8, weight: 6 }],
      },
    }).addTo(map);

    routingControl.on("routesfound", (e) => {
      routeSummary = e.routes[0].summary;
      console.log("Route found:", routeSummary);
      updateButtonState();
    });

    routingControl.on("routingerror", (e) => {
      showError("Could not find a route. Please try different locations.");
      routeSummary = null;
      updateButtonState();
    });
  }

  function setPickup(latlng) {
    pickupCoords = latlng;
    mode = "dropoff"; // Auto-switch to dropoff
    drawRoute();
    updateButtonState();
  }

  function setDropoff(latlng) {
    dropoffCoords = latlng;
    drawRoute();
    updateButtonState();
  }

  // --- (UI State Changers are the same) ---

  function showLoading() {
    resultsDiv.classList.remove("hidden");
    priceDisplay.classList.add("hidden");
    errorMessage.classList.add("hidden");
    loadingSpinner.classList.remove("hidden");
  }

  function showPrice(data) {
    priceText.innerText = `$${data.estimated_price.toFixed(2)}`;
    distanceText.innerText = `${data.distance_km} km`;
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

  // --- 5. Event Listeners ---
  pickupBtn.addEventListener("click", () => {
    mode = "pickup";
    updateButtonState();
  });

  dropoffBtn.addEventListener("click", () => {
    mode = "dropoff";
    updateButtonState();
  });

  // Clicking the map STILL WORKS
  map.on("click", (e) => {
    if (mode === "pickup") {
      setPickup(e.latlng);
    } else {
      setDropoff(e.latlng);
    }
  });

  // --- 6. THE API CALL (v4.0) ---
  // (This function is exactly the same as v3.0)
  getPriceBtn.addEventListener("click", async () => {
    if (!routeSummary) {
      showError("Please set pickup and dropoff to find a route first.");
      return;
    }

    showLoading();

    const requestBody = {
      pickup_lat: pickupCoords.lat,
      pickup_lon: pickupCoords.lng,
      dropoff_lat: dropoffCoords.lat,
      dropoff_lon: dropoffCoords.lng,
      timestamp: new Date().toISOString(),
      distance_km: routeSummary.totalDistance / 1000,
      duration_minutes: routeSummary.totalTime / 60,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/get_price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      showPrice(data);
    } catch (error) {
      console.error("Error fetching price:", error);
      showError(`Failed to get price. ${error.message}`);
    }
  });
});
