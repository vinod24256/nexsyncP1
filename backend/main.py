from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import random
from haversine import haversine, Unit

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

# --- 1. The API Contract (v2.0) ---
# We've added 'timestamp'
class RideRequest(BaseModel):
    pickup_lat: float = Field(..., ge=-90, le=90)
    pickup_lon: float = Field(..., ge=-180, le=180)
    dropoff_lat: float = Field(..., ge=-90, le=90)
    dropoff_lon: float = Field(..., ge=-180, le=180)
    timestamp: str  # <-- NEW: The frontend will send the current time as an ISO string

# --- 2. The API Endpoint ---
@app.post("/get_price")
async def get_price(request: RideRequest):
    
    # --- 3. Mock Logic ---
    # (The ML team will replace this whole section)
    
    print(f"[LOG] Received request for ride at {request.timestamp}")
    print(f"  Pickup: {request.pickup_lat}, {request.pickup_lon}")
    print(f"  Dropoff: {request.dropoff_lat}, {request.dropoff_lon}")
    
    pickup_point = (request.pickup_lat, request.pickup_lon)
    dropoff_point = (request.dropoff_lat, request.dropoff_lon)
    
    # Calculate the distance in kilometers
    distance_km = haversine(pickup_point, dropoff_point)
    print(f"[LOG] Calculated distance: {distance_km:.2f} km")
    
    # Let's invent a fake pricing model
    base_fare = 3.00       # $3.00 to start
    cost_per_km = 1.75     # $1.75 per km
    random_surge = random.uniform(0.9, 1.5)
    
    # (The ML team will use the 'request.timestamp' to predict a *real* surge)
    
    price = (base_fare + (cost_per_km * distance_km)) * random_surge
    
    # --- END MOCK LOGIC ---
    
    
    # --- 4. The API Response (v2.0) ---
    # We now also return the 'distance_km'
    return {
        "estimated_price": round(price, 2),
        "surge_multiplier": round(random_surge, 2),
        "estimated_wait_time_minutes": random.randint(3, 8),
        "distance_km": round(distance_km, 2)  # <-- NEW: Send the distance back
    }

# A simple root endpoint to check if the server is running
@app.get("/")
def read_root():
    return {"status": "Mock pricing server (v2.0) is running!"}