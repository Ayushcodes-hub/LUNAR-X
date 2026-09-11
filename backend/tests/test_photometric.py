"""Tests for physical photometric relighting engine."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.pipelines.photometric import compute_surface_normals, render_photometric_relighting, sun_vector


class TestPhotometricRelighting:
    def test_surface_normals_unit_length(self) -> None:
        dem = np.random.rand(64, 64).astype(np.float32) * 50.0
        normals = compute_surface_normals(dem, cell_size_m=5.0)

        assert normals.shape == (64, 64, 3)
        norms = np.linalg.norm(normals, axis=-1)
        np.testing.assert_allclose(norms, 1.0, atol=1e-4)

    def test_flat_dem_produces_upward_normals(self) -> None:
        dem = np.full((32, 32), 100.0, dtype=np.float32)
        normals = compute_surface_normals(dem)

        # For a flat surface, nx=0, ny=0, nz=1
        np.testing.assert_allclose(normals[:, :, 0], 0.0, atol=1e-5)
        np.testing.assert_allclose(normals[:, :, 1], 0.0, atol=1e-5)
        np.testing.assert_allclose(normals[:, :, 2], 1.0, atol=1e-5)

    def test_sun_vector_normalization(self) -> None:
        vec = sun_vector(azimuth_deg=45.0, elevation_deg=30.0)
        assert np.isclose(np.linalg.norm(vec), 1.0)
        assert vec[2] > 0.0  # Pointing upwards

    def test_photometric_rendering_output(self) -> None:
        dem = np.random.rand(64, 64).astype(np.float32) * 100.0
        img = render_photometric_relighting(dem, sun_azimuth_deg=60.0, sun_elevation_deg=25.0)

        assert img.shape == (64, 64)
        assert img.dtype == np.uint8
        assert img.std() > 5.0  # Topographic shading generates contrast
