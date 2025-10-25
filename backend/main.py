from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import random
import datetime

# This allows your frontend (running on a different port) to talk to this backend
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CORS Middleware (This is what prevents "Failed to fetch") ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (for a prototype)
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- 1. The NEW API Contract (INPUT) v5.0 ---
class RideRequest(BaseModel):
    pickup_location: str
    dropoff_location: str
    datetime_str: str  # We'll send a string, e.g., "2025-10-25T18:30"
    passenger_count: int
    weather: str
    ride_type: str

# --- 2. The NEW API Contract (OUTPUT) v5.0 ---
class RideResponse(BaseModel):
    surge_multiplier: float
    estimated_price: float
    base_fare: float
    explanation: str

# --- 3. The API Endpoint ---
@app.post("/get_price", response_model=RideResponse)
async def get_price(request: RideRequest):
    
    # --- 4. MOCK LOGIC (v5.0) ---
    # (This is what your ML team will replace)
    
    print(f"[LOG] Received request:")
    print(f"  Pickup: {request.pickup_location}")
    print(f"  Dropoff: {request.dropoff_location}")
    print(f"  Time: {request.datetime_str}")
    print(f"  Weather: {request.weather}")
    
    base_fare = 15.0
    surge_multiplier = 1.0
    explanation = "Price is normal."

    if request.ride_type == "Uber Black":
        base_fare = 25.0
        surge_multiplier *= 1.2
        explanation = "Uber Black has a higher base fare."
    
    if request.pickup_location == "Financial District":
        base_fare += 5.0
        surge_multiplier *= 1.1
        explanation = "High demand in Financial District."
        
    if request.weather == "Rainy":
        surge_multiplier *= 1.3
        explanation = "High demand due to rain."
    if request.weather == "Snow":
        surge_multiplier *= 1.5
        explanation = "High demand and poor conditions due to snow."
        
    try:
        trip_time = datetime.datetime.fromisoformat(request.datetime_str)
        if 17 <= trip_time.hour < 19: # 5:00 PM - 7:00 PM
            surge_multiplier *= 1.4
            explanation = "High demand during evening rush hour."
    except Exception as e:
        print(f"Could not parse time: {e}")
        
    estimated_price = base_fare * surge_multiplier
    
    # --- END MOCK LOGIC ---
    
    # --- 5. The API Response ---
    return RideResponse(
        surge_multiplier=round(surge_multiplier, 2),
        estimated_price=round(estimated_price, 2),
        base_fare=round(base_fare, 2),
        explanation=explanation
    )

@app.get("/")
def read_root():
    return {"status": "Mock pricing server (v5.1) is running!"}