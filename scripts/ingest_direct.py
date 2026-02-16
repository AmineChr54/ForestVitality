import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from backend_app.services.ingest_service import IngestService

def run_ingest(product_id):
    service = IngestService()
    print(f"Starting direct ingestion for: {product_id}")
    try:
        service.ingest_by_product_id(product_id)
        print("Ingestion successful.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_ingest(sys.argv[1])
    else:
        # Example Product ID
        run_ingest("S2B_MSIL2A_20260127T101301_N0511_R022_T33UVP_20260127T123225")
