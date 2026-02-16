import os
import requests
import json
from dotenv import load_dotenv

# Load .env explicitly
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

print(f"Client ID present: {bool(CLIENT_ID)}")
print(f"Client Secret present: {bool(CLIENT_SECRET)}")

def get_token():
    url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    resp = requests.post(url, data=data)
    if resp.status_code != 200:
        print(f"Token Error: {resp.status_code} {resp.text}")
        return None
    return resp.json()["access_token"]

def test():
    token = get_token()
    if not token:
        return

    print("Token obtained.")
    
    # Catalogue URL
    catalogue_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products(167c876d-5e06-416e-a84c-50a3ab4a423d)/Nodes(S2B_MSIL1C_20251010T102849_N0511_R108_T32UMA_20251010T124345.SAFE)/Nodes(GRANULE)/Nodes(L1C_T32UMA_A044893_20251010T102930)/Nodes(IMG_DATA)/Nodes(T32UMA_20251010T102849_B02.jp2)/$value"
    
    # STAC Search
    stac_url = "https://stac.dataspace.copernicus.eu/v1/search"
    print(f"Searching STAC: {stac_url}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [8.5, 49.8, 8.7, 50.0], # Darmstadt area approx
        "datetime": "2025-10-10T00:00:00Z/2025-10-10T23:59:59Z",
        "limit": 1
    }
    
    resp = requests.post(stac_url, json=payload, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"Scenes found: {len(data.get('features', []))}")
        if data.get('features'):
            feat = data['features'][0]
            print(f"ID: {feat['id']}")
            
    # Get S3 Credentials from CDSE
    creds_url = "https://zipper.dataspace.copernicus.eu/odata/v1/Credentials"
    print(f"Fetching S3 credentials from: {creds_url}")
    
    try:
        creds_resp = requests.get(creds_url, headers={"Authorization": f"Bearer {token}"})
        if creds_resp.status_code != 200:
            print(f"Failed to get S3 credentials: {creds_resp.status_code}")
            print(creds_resp.text)
            return

        creds = creds_resp.json()
        access_key = creds.get("access_key_id") or creds.get("accessKeyId")
        secret_key = creds.get("secret_access_key") or creds.get("secretAccessKey")
        session_token = creds.get("session_token") or creds.get("sessionToken")
        endpoint_url = "https://eodata.dataspace.copernicus.eu"

        print(f"Got S3 Creds! Access Key: {access_key}")
        
        # Try Boto3
        import boto3
        from botocore.client import Config
        
        s3 = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=session_token,
            endpoint_url=endpoint_url,
            config=Config(signature_version='s3v4'),
            region_name='default' # often required even if ignored
        )
        
        # Parse S3 path
        # s3://eodata/Sentinel-2/...
        if b02_asset:
            s3_href = b02_asset.get('href')
            if s3_href.startswith("s3://"):
                parts = s3_href.replace("s3://", "").split("/", 1)
                bucket = parts[0]
                key = parts[1]
                
                print(f"Trying to get object from Bucket: {bucket}, Key: {key}")
                
                try:
                    obj = s3.get_object(Bucket=bucket, Key=key)
                    # Read first byte
                    data = obj['Body'].read(100)
                    print(f"SUCCESS! Read {len(data)} bytes from S3.")
                except Exception as e:
                    print(f"Boto3 GetObject Error: {e}")

    except Exception as e:
        print(f"Credential/Boto3 Error: {e}")




    else:
        print(f"STAC Search failed: {resp.status_code}")
        print(resp.text[:500])



if __name__ == "__main__":
    test()
