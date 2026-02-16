import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from backend_app.services.vegetation_service import get_vegetation_index

def test_analysis(scene_id):
    print(f"Triggering analysis for scene: {scene_id}")
    result = get_vegetation_index(scene_id)
    
    if "error" in result:
        print(f"FAILED: {result['error']}")
    else:
        print("SUCCESS! Analysis results:")
        for index, value in result.items():
            print(f" - {index.upper()}: {value:.4f}")

if __name__ == "__main__":
    # Test with a known ingested scene ID
    target_id = "S2B_MSIL2A_20260127T101301_N0511_R022_T33UVP_20260127T123225"
    test_analysis(target_id)
