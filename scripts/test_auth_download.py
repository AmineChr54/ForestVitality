import os
import sys
import requests
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())

# Load .env explicitly
load_dotenv()

from backend_app.services.copernicus_api import CopernicusAPIClient

def test_class_auth():
    print("Initializing CopernicusAPIClient...")
    try:
        client = CopernicusAPIClient()
    except Exception as e:
        print(f"Failed to init client: {e}")
        return

    print("Client initialized. Checking token...")
    token = client.token
    print(f"Token obtained (len: {len(token)})")
    
    # URL that was failing
    url = "https://zipper.dataspace.copernicus.eu/odata/v1/Products(167c876d-5e06-416e-a84c-50a3ab4a423d)/Nodes(S2B_MSIL1C_20251010T102849_N0511_R108_T32UMA_20251010T124345.SAFE)/Nodes(GRANULE)/Nodes(L1C_T32UMA_A044893_20251010T102930)/Nodes(IMG_DATA)/Nodes(T32UMA_20251010T102849_B02.jp2)/$value"
    
    print(f"Testing access to: {url}")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        resp = requests.get(url, headers=headers, stream=True)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            print("✅ SUCCESS! 200 OK")
            # Read a small chunk
            chunk = next(resp.iter_content(chunk_size=1024))
            print(f"Read chunk of size: {len(chunk)}")
        elif resp.status_code == 401:
            print("❌ STIlL 401 Unauthorized")
            print(resp.text)
        else:
            print(f"⚠️ Other status: {resp.status_code}")
            print(resp.text[:200])
            
    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    test_class_auth()
