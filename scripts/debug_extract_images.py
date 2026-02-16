import requests
import os
import urllib.parse
import sys

# Add backend to path to import services
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend_app.services.copernicus_api import CopernicusAPIClient
from backend_app.services.conversion_service import convert_raw_to_scene_metadata
from backend_app.services.band_fetch_service import process_scene_bands
from backend_app.services.ingest_service import REQUIRED_BANDS

# Config
TITILER_URL = "http://localhost:8082"
OUTPUT_DIR = "debug_images_darmstadt"

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def verify_copernicus_auth():
    print("Verifying Copernicus Credentials...")
    # Read .env manually
    env_vars = {}
    try:
        with open("backend/.env", "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()
    except Exception as e:
        print(f"Could not read .env: {e}")
        return

    client_id = env_vars.get("COPERNICUS_CLIENT_ID")
    client_secret = env_vars.get("COPERNICUS_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("Missing credentials in .env")
        return

    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }
    
    try:
        resp = requests.post(token_url, data=data)
        if resp.status_code == 200:
            print("✅ Copernicus Auth Successful!")
        else:
            print(f"❌ Copernicus Auth Failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Copernicus Auth Error: {e}")

def process_and_download(feature, bbox, date_str):
    print(f"\nProcessing scene for {date_str}...")
    
    # 1. Convert to SceneMetadata
    try:
        scene = convert_raw_to_scene_metadata(feature)
    except Exception as e:
        print(f"Failed to convert feature: {e}")
        return

    # 2. Extract Band URLs
    band_urls = {
        band.name: band.href
        for band in scene.bands
        if band.name in REQUIRED_BANDS
    }
    
    # 3. Process Bands (Download -> Stack -> Upload MinIO)
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    
    client = CopernicusAPIClient()
    
    print(f"Ingesting bands for {scene.id}...")
    try:
        cog_result = process_scene_bands(
            band_urls=band_urls,
            token=client.token,
            scene_id=scene.id,
            resolution=20 # Default
        )
    except Exception as e:
        print(f"Failed to process bands: {e}")
        import traceback
        traceback.print_exc()
        return

    scene_path = cog_result.get("scene_path")
    if not scene_path:
        print(f"No scene path generated: {cog_result.get('error')}")
        return
        
    print(f"Generated COG: {scene_path}")
    
    # 4. Download Renders using TiTiler
    # Indices to check
    INDICES = {
        "NDVI": {"expr": "(b4-b3)/(b4+b3)", "cmap": "rdylgn"},
        "EVI":  {"expr": "2.5*(b4-b3)/(b4+6*b3-7.5*b1+1)", "cmap": "rdylgn"},
        "NDWI": {"expr": "(b2-b4)/(b2+b4)", "cmap": "blues"},
    }
    
    minx, miny, maxx, maxy = bbox
    
    for name, config in INDICES.items():
        print(f"  Rendering {name}...")
        
        # NOTE: scene_path is s3://...
        encoded_path = list(urllib.parse.quote(part) for part in [scene_path])
        # Only encode the param value
        encoded_url_param = urllib.parse.quote(scene_path)
        encoded_expr = urllib.parse.quote(config['expr'])
        
        url = (
            f"{TITILER_URL}/cog/bbox/{minx},{miny},{maxx},{maxy}.png"
            f"?url={encoded_url_param}"
            f"&expression={encoded_expr}"
            f"&rescale=-1,1"
            f"&colormap_name={config['cmap']}"
            f"&width=800&height=800"
        )
        
        try:
            resp = requests.get(url)
            if resp.status_code == 200:
                filename = f"{OUTPUT_DIR}/{date_str}_{name}.png"
                with open(filename, "wb") as f:
                    f.write(resp.content)
                print(f"  Saved {filename}")
            else:
                print(f"  Failed TiTiler render {name}: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"  Error calling TiTiler: {e}")

def main():
    ensure_dir(OUTPUT_DIR)
    
    # 0. Verify credentials
    verify_copernicus_auth()

    # 1. Get Geometry
    # Hardcoded fallback BBox for Darmstadt (approx)
    bbox = [8.62, 49.84, 8.68, 49.90] 
        
    # 2. Search Scenes using direct client
    # Needs env vars loaded.
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    
    try:
        client = CopernicusAPIClient()
        # date_from, date_to
        result = client.search_scenes(bbox, "2023-01-01", "2023-12-31")
        if not result:
            print("No result from Copernicus Client")
            return
        
        features = result.get('features', [])
        print(f"Found {len(features)} scenes.")
        
        if not features:
            return

        # Select 3 distinct days (scenes)
        scenes_by_date = {}
        for feature in features:
            # properties: { datetime: "2023-08-01T..." }
            props = feature.get('properties', {})
            dt = props.get('datetime', '')
            if not dt: continue
            
            date = dt.split('T')[0]
            cloud_cover = props.get('eo:cloud_cover', 100)
            
            if date not in scenes_by_date:
                scenes_by_date[date] = feature
            else:
                current_cc = scenes_by_date[date]['properties'].get('eo:cloud_cover', 100)
                if cloud_cover < current_cc:
                    scenes_by_date[date] = feature
                    
        sorted_dates = sorted(scenes_by_date.keys())
        selected_dates = sorted_dates[:3]
        
        print(f"Selected dates: {selected_dates}")
        
        for date in selected_dates:
            process_and_download(scenes_by_date[date], bbox, date)
            
    except Exception as e:
        print(f"Error in main: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
