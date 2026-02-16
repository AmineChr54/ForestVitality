import boto3
import os
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
backend_dir = Path(__file__).resolve().parent.parent / "backend"
load_dotenv(backend_dir / ".env")

def cleanup():
    endpoint = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "admin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "admin123")
    bucket_name = os.getenv("MINIO_BUCKET", "forest-vitality")

    s3 = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name='us-east-1'
    )

    print(f"Starting cleanup in bucket: {bucket_name}")
    
    # List all objects
    paginator = s3.get_paginator('list_objects_v2')
    deleted_count = 0
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' not in page:
            continue
            
        for obj in page['Contents']:
            key = obj['Key']
            # Search for suffixes _10m or _20m
            if "_10m" in key or "_20m" in key:
                print(f"Deleting suffixed file: {key}")
                s3.delete_object(Bucket=bucket_name, Key=key)
                deleted_count += 1
                
    print(f"Cleanup finished. Total deleted: {deleted_count}")

if __name__ == "__main__":
    cleanup()
