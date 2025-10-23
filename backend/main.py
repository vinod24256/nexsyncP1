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

# --- 1. The API Contract (v3.0) ---
# We now accept the REAL distance and duration from the frontend
class RideRequest(BaseModel):
    pickup_lat: float = Field(..., ge=-90, le=90)
    pickup_lon: float = Field(..., ge=-180, le=180)
    dropoff_lat: float = Field(..., ge=-90, le=90)
    dropoff_lon: float = Field(..., ge=-180, le=180)
    timestamp: str  
    
    # --- NEW FIELDS ---
    distance_km: float = Field(..., gt=0)
    duration_minutes: float = Field(..., gt=0)

# --- 2. The API Endpoint ---
@app.post("/get_price")
async def get_price(request: RideRequest):
    
    # --- 3. Mock Logic ---
    # The ML team will replace this.
    # We NO LONGER calculate haversine. We use the real data.
    
    print(f"[LOG] Received request for ride at {request.timestamp}")
    print(f"  Real Distance: {request.distance_km:.2f} km")
    print(f"  Real Duration: {request.duration_minutes:.2f} min")
    
    # Let's invent a fake pricing model
    base_fare = 3.00           # $3.00 to start
    cost_per_km = 1.50         # $1.50 per km
    cost_per_minute = 0.40     # $0.40 per minute (for traffic)
    
    random_surge = random.uniform(0.9, 1.5)
    
    # (The ML team will use the 'timestamp' to predict a *real* surge)
    
    # This price is now based on REAL route data!
    price = (base_fare + (cost_per_km * request.distance_km) + (cost_per_minute * request.duration_minutes)) * random_surge
    
    # --- END MOCK LOGIC ---
    
    
    # --- 4. The API Response (v3.0) ---
    return {
        "estimated_price": round(price, 2),
        "surge_multiplier": round(random_surge, 2),
        "estimated_wait_time_minutes": random.randint(3, 8),
        "distance_km": round(request.distance_km, 2)
    }

# A simple root endpoint to check if the server is running
@app.get("/")
def read_root():
    return {"status": "Mock pricing server (v3.0) is running!"}