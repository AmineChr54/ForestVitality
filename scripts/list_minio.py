import boto3
import os
from botocore.client import Config
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
backend_dir = Path(__file__).resolve().parent.parent / "backend"
load_dotenv(backend_dir / ".env")

def list_all():
    endpoint = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "admin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "admin123")
    bucket_name = os.getenv("MINIO_BUCKET", "forest-vitality")

    s3 = boto3.resource(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'
    )

    bucket = s3.Bucket(bucket_name)
    print(f"Listing all objects in '{bucket_name}':")
    count = 0
    for obj in bucket.objects.all():
        print(f" - {obj.key}")
        count += 1
    print(f"Total objects found: {count}")

if __name__ == "__main__":
    list_all()
