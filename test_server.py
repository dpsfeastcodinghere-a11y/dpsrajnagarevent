import urllib.request
import json

url = "http://localhost:8000/.netlify/functions/save_to_db"
data = {
    "enrollment_no": "TEST-LOCAL-002",
    "name": "Test User Local Lib",
    "category": "Student",
    "phone": "9876543210",
    "test_data": "some extra data"
}

try:
    print(f"Sending POST request to {url}...")
    req = urllib.request.Request(url, 
                                 data=json.dumps(data).encode('utf-8'),
                                 headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        body = response.read().decode('utf-8')
        print(f"Response Body: {body}")
        
        if response.getcode() == 200 and json.loads(body).get('success'):
            print("SUCCESS: Data saved to database via local server.")
        else:
            print("FAILURE: Could not save data.")
except Exception as e:
    print(f"Error: {e}")
