import urllib.request
import json
import ssl

# Ignore SSL warnings for localhost
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://localhost:8000/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer fake.token.header.payload.signature" 
}
data = json.dumps({
    "message": "hi", 
    "history": [],
    # Pydantic expect geo_context as optional, empty is fine
    "user_role": "Analyst", # Just in case
    "user_permissions": []
}).encode("utf-8")

print(f"Sending POST to {url}...")
req = urllib.request.Request(url, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(f"Status: {response.getcode()}")
        print(f"Response: {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Error Detail: {e.read().decode()}")
except Exception as e:
    print(f"Connection Error: {e}")
