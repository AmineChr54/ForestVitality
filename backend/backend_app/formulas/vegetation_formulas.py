# Bands: B02 - Blue, B03 - Green, B04 - Red, B8A - NIR (Narrow), B11 - SWIR

# NDVI, NDWI, EVI calculations
def calculate_ndvi(b8a_band, b04_band):
    return (b8a_band - b04_band) / (b8a_band + b04_band + 1e-10)  # Adding a small constant to avoid division by zero

def calculate_ndwi(b8a_band, b03_band):
    return (b03_band - b8a_band) / (b03_band + b8a_band + 1e-10)  # Adding a small constant to avoid division by zero 

def calculate_evi(b8a_band, b04_band, b02_band):
    return 2.5 * ((b8a_band - b04_band) / (b8a_band + 6 * b04_band - 7.5 * b02_band + 1 + 1e-10)) # Adding a small constant to avoid division by zero

def calculate_ndmi(b11_band, b8a_band):
    return (b8a_band - b11_band) / (b8a_band + b11_band + 1e-10)  # Adding a small constant to avoid division by zero



# VCI, TCI, VHI calculations, currently not in use
def calculate_vci(ndvi, list_ndvi):
    ndvi_min = min(list_ndvi)
    ndvi_max = max(list_ndvi)
    return (ndvi - ndvi_min) / (ndvi_max - ndvi_min + 1e-10)  # Adding a small constant to avoid division by zero

def calculate_tci(temperature, list_temperature):
    """Sentinel 2 can not measure temperature directly, so TCI calculation may require additional data sources."""
    temp_min = min(list_temperature)
    temp_max = max(list_temperature)
    return (temp_max - temperature) / (temp_max - temp_min + 1e-10)  # Adding a small constant to avoid division by zero

def calculate_vhi(vci, tci):
    return 0.5 * (vci + tci)