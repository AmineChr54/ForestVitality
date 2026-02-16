from backend_app.models.scene_metadata import SceneMetadata, Band


def extract_product_id_from_assets(assets: dict) -> str:
    """
    Extracts product UUID from any band asset URL.
    """
    for asset in assets.values():
        if not isinstance(asset, dict):
            continue

        alt = asset.get("alternate", {})
        https_info = alt.get("https", {})
        href = https_info.get("href")

        if not href or "Products(" not in href:
            continue

        start = href.find("Products(") + len("Products(")
        end = href.find(")", start)
        if start > 0 and end > start:
            return href[start:end]

    return None


def convert_raw_to_scene_metadata(raw: dict) -> SceneMetadata:
    props = raw.get("properties", {})
    assets = raw.get("assets", {})

    # PRODUCT ID
    product_id = extract_product_id_from_assets(assets)
    if not product_id:
        raise ValueError("Could not extract product_id from STAC feature")

    # TILE ID
    scene_id = raw.get("id", "")
    tile_id = (
        props.get("mgrs:tile")
        or props.get("sentinel:tile_id")
    )
    
    if not tile_id:
        import re
        tile_match = re.search(r'_T(\d{2}[A-Z]{3})_', scene_id)
        if tile_match:
            tile_id = tile_match.group(1)
    
    tile_id = tile_id if tile_id and len(tile_id) >= 3 else "UNKNOWN"

    # CLOUD COVER
    cloud_coverage = props.get("eo:cloud_cover", 0)

    # BAND ASSETS (With Clean Naming)
    bands = []
    for name, info in assets.items():
        if not isinstance(info, dict):
            continue

        https_href = info.get("alternate", {}).get("https", {}).get("href")
        band_href = https_href or info.get("href")

        # STRIP SUFFIXES (_10m, _20m, etc.)
        clean_name = name.split('_')[0]

        if band_href:
            bands.append(Band(name=clean_name, href=band_href))

    # PROCESSING LEVEL
    raw_level = str(props.get("processing:level", "")).upper()
    processing_level = {
        "L1": "L1C", "1": "L1C", "LEVEL-1C": "L1C",
        "L2": "L2A", "2": "L2A", "LEVEL-2A": "L2A",
    }.get(raw_level, raw_level)

    return SceneMetadata(
        id=raw.get("id"),
        product_id=product_id,
        acquisition_date=props.get("datetime"),
        cloud_coverage=float(cloud_coverage),
        tile_id=tile_id,
        footprint=raw.get("geometry"),
        bands=bands,
        processing_level=processing_level
    )
