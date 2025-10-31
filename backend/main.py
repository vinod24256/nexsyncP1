from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import random
import datetime
import httpx  # Don't forget: pip install httpx

# This allows your frontend (running on a different port) to talk to this backend
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (for a prototype)
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- 1. The API Contract (INPUT) ---
class RideRequest(BaseModel):
    pickup_location: str
    dropoff_location: str
    datetime_str: str
    passenger_count: int
    ride_type: str # This is the "Standard", "Comfort", or "Black"

# --- 2. The API Contract (OUTPUT) ---
class RideResponse(BaseModel):
    surge_multiplier: float
    estimated_price: float
    base_fare: float
    explanation: str

# --- 3. Location Coordinates Helper ---
LOCATION_COORDINATES = {
    "Financial District": {"lat": 40.7075, "lon": -74.0089},
    "Back Bay": {"lat": 42.3503, "lon": -71.0810}, # This is Boston, but OK for demo
    "Theatre District": {"lat": 40.7570, "lon": -73.9875},
    "Airport": {"lat": 40.6413, "lon": -73.7781}, # JFK
    "Midtown": {"lat": 40.7549, "lon": -73.9840}
}

# --- 4. Weather Fetcher Helper ---
async def get_weather_data(lat: float, lon: float, time_str: str) -> dict:
    try:
        dt = datetime.datetime.fromisoformat(time_str)
        date = dt.strftime("%Y-%m-%d")
        hour = dt.hour

        weather_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat, "longitude": lon,
            "hourly": "precipitation,snowfall",
            "start_date": date, "end_date": date, "timezone": "auto"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(weather_url, params=params)
            response.raise_for_status() 
            data = response.json()
            
            precipitation = data["hourly"]["precipitation"][hour]
            snowfall = data["hourly"]["snowfall"][hour]
            
            print(f"[LOG] Real weather found: {precipitation}mm rain, {snowfall}cm snow")
            return {"precipitation": precipitation, "snowfall": snowfall}
            
    except Exception as e:
        print(f"[ERROR] Weather API failed: {e}")
        return {"precipitation": 0.0, "snowfall": 0.0}

# --- 5. The API Endpoint ---
@app.post("/get_price", response_model=RideResponse)
async def get_price(request: RideRequest):
    
    # --- 6. MOCK LOGIC (This is what your ML team replaces) ---
    print(f"[LOG] Received request:")
    print(f"  Pickup: {request.pickup_location}, Ride Type: {request.ride_type}")
    print(f"  Time: {request.datetime_str}")

    coords = LOCATION_COORDINATES.get(request.pickup_location, {"lat": 40.7128, "lon": -74.0060})
    weather = await get_weather_data(coords["lat"], coords["lon"], request.datetime_str)

    # --- This is our FAKE ML Model ---
    base_fare = 15.0
    surge_multiplier = 1.0
    explanation_parts = ["Price is normal."] # Use a list to build the explanation

    # Rule 1: Ride Type
    if request.ride_type == "Comfort":
        base_fare = 20.0 # Higher base for Comfort
        surge_multiplier *= 1.2
        explanation_parts = ["Comfort ride has a higher base fare."]
    elif request.ride_type == "Black":
        base_fare = 25.0 # Higher base for Black
        surge_multiplier *= 1.5
        explanation_parts = ["Black ride has a higher base fare."]
    
    # Rule 2: Location
    if request.pickup_location == "Financial District":
        base_fare += 5.0
        surge_multiplier *= 1.1
        explanation_parts.append("High demand in Financial District.")
        
    # Rule 3: Weather (from our API)
    if weather["precipitation"] > 1.0:
        surge_multiplier *= 1.3
        explanation_parts.append(f"High demand due to rain.")
    if weather["snowfall"] > 0.5:
        surge_multiplier *= 1.5
        explanation_parts.append(f"High demand due to snow.")
        
    # Rule 4: Time
    try:
        trip_time = datetime.datetime.fromisoformat(request.datetime_str)
        if 17 <= trip_time.hour < 19: # 5:00 PM - 7:00 PM
            surge_multiplier *= 1.4
            explanation_parts.append("High demand during evening rush hour.")
    except Exception as e:
        print(f"Could not parse time: {e}")
        
    # Clean up the explanation
    if len(explanation_parts) > 1 and explanation_parts[0] == "Price is normal.":
        explanation_parts.pop(0) # Remove "Price is normal."
    
    explanation = " ".join(explanation_parts)
    estimated_price = base_fare * surge_multiplier
    
    # --- END MOCK LOGIC ---
    
    # --- 7. The API Response ---
    return RideResponse(
        surge_multiplier=round(surge_multiplier, 2),
        estimated_price=round(estimated_price, 2),
        base_fare=round(base_fare, 2),
        explanation=explanation
    )

@app.get("/")
def read_root():
    return {"status": "Mock pricing server (v9.0) is running!"}