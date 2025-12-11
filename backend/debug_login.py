import requests
import json

BASE_URL = "http://localhost:8000"
EMAIL = "uresha498@gmail.com"
PASSWORD = "admin123"
SECRET = "200207"

def test_login():
    print("--- Test 1: Login without Secret ---")
    payload = {"email": EMAIL, "password": PASSWORD, "secret_key": None}
    try:
        res = requests.post(f"{BASE_URL}/login", json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Test 2: Login WITH Secret ---")
    payload = {"email": EMAIL, "password": PASSWORD, "secret_key": SECRET}
    try:
        res = requests.post(f"{BASE_URL}/login", json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
