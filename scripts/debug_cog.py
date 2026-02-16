
import os
import boto3
import rasterio
from rasterio.io import MemoryFile
from botocore.client import Config
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "admin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "admin123")
BUCKET_NAME = os.getenv("MINIO_BUCKET", "sentinel-bands")

print(f"Connecting to MinIO at {MINIO_ENDPOINT}...")

s3 = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4"),
)

def inspect_cog():
    try:
        # List objects to find a scene
        response = s3.list_objects_v2(Bucket=BUCKET_NAME)
        
        if "Contents" not in response:
            print("Bucket is empty!")
            return

        # Find the most recent scene.tif
        scenes = [obj["Key"] for obj in response["Contents"] if obj["Key"].endswith("scene.tif")]
        
        if not scenes:
            print("No 'scene.tif' files found in bucket.")
            return

        latest_scene = scenes[-1] # Pick the last one (likely most recent)
        print(f"\nInspecting COG: {latest_scene}")

        # Download to memory
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=latest_scene)
        data = obj["Body"].read()

        with MemoryFile(data) as memfile:
            with memfile.open() as src:
                print("-" * 30)
                print(f"Driver: {src.driver}")
                print(f"Size: {src.width} x {src.height}")
                print(f"Count: {src.count} bands")
                print(f"CRS: {src.crs}")
                print(f"Bounds: {src.bounds}")
                print(f"Transform:\n{src.transform}")
                print("-" * 30)
                
                # Check for nodata
                print(f"Nodata: {src.nodata}")
                
                # Check profile
                print(f"Block Size: {src.profile.get('blockxsize')}x{src.profile.get('blockysize')}")
                print(f"Tiled: {src.profile.get('tiled')}")
                print(f"Compress: {src.profile.get('compress')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Redirect stdout to file
    import sys
    with open("debug_result.txt", "w", encoding="utf-8") as f:
        sys.stdout = f
        inspect_cog()
