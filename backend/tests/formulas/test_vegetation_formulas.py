import math

from backend_app.formulas.vegetation_formulas import (
    calculate_ndvi,
    calculate_ndwi,
    calculate_evi,
    calculate_ndmi,
    calculate_vci,
    calculate_tci,
    calculate_vhi,
)


def test_ndvi_calculation_matches_expected_value():
    result = calculate_ndvi(0.8, 0.2)

    assert math.isclose(result, 0.6, rel_tol=1e-9)


def test_ndwi_calculation_matches_expected_value():
    result = calculate_ndwi(0.7, 0.3)

    assert math.isclose(result, -0.4, rel_tol=1e-9)


def test_evi_calculation_matches_expected_value():
    result = calculate_evi(0.7, 0.3, 0.1)

    expected = 2.5 * ((0.7 - 0.3) / (0.7 + 6 * 0.3 - 7.5 * 0.1 + 1))
    assert math.isclose(result, expected, rel_tol=1e-9)


def test_ndmi_handles_zero_division_safely():
    result = calculate_ndmi(0.0, 0.0)

    assert math.isfinite(result)
    assert math.isclose(result, 0.0, abs_tol=1e-9)


def test_vci_tci_vhi_are_consistent_for_middle_values():
    vci = calculate_vci(0.5, [0.2, 0.5, 0.8])
    tci = calculate_tci(20, [10, 20, 30])
    vhi = calculate_vhi(vci, tci)

    assert math.isclose(vci, 0.5, rel_tol=1e-9)
    assert math.isclose(tci, 0.5, rel_tol=1e-9)
    assert math.isclose(vhi, 0.5, rel_tol=1e-9)
