import requests
import os
from dotenv import load_dotenv

load_dotenv()

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
BASE_URL = "https://api.adzuna.com/v1/api/jobs"

def fetch_adzuna_jobs(country="gb", what="", where=""):
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        print("Warning: Adzuna credentials not found.")
        return []

    url = f"{BASE_URL}/{country}/search/1"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": 10,
        "what": what,
        "where": where,
        "content-type": "application/json"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as e:
        print(f"Error fetching from Adzuna: {e}")
        return []
