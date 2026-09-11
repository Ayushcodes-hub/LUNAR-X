"""Preprocessing — illumination normalization for lunar imagery."""
from __future__ import annotations

import numpy as np
import cv2

from app.core.exceptions import PreprocessingError


def clahe_normalize(
    image_gray: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization).

    CLAHE is fast, parameter-light, and well-validated for planetary imagery.
    It handles local contrast enhancement without amplifying noise globally.

    Args:
        image_gray: Grayscale uint8 or float32 image.
        clip_limit: Contrast clipping threshold (higher = more contrast).
        tile_grid_size: Grid size for local histogram computation.

    Returns:
        Normalized image with same shape, dtype uint8.
    """
    if image_gray.ndim != 2:
        raise PreprocessingError("clahe", f"Expected 2D grayscale image, got shape {image_gray.shape}")

    # Normalize to uint8 for CLAHE
    if image_gray.dtype != np.uint8:
        img_min, img_max = image_gray.min(), image_gray.max()
        if img_max == img_min:
            raise PreprocessingError("clahe", "Image has zero contrast (all pixels identical).")
        img_u8 = ((image_gray - img_min) / (img_max - img_min) * 255).astype(np.uint8)
    else:
        img_u8 = image_gray.copy()

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    result = clahe.apply(img_u8)
    return result


def homomorphic_filter(
    image_gray: np.ndarray,
    cutoff: float = 30.0,
    order: int = 2,
    gamma_low: float = 0.5,
    gamma_high: float = 1.5,
) -> np.ndarray:
    """Homomorphic (illumination-reflectance separation) filter.

    Separates multiplicative illumination (low-freq) from reflectance (high-freq)
    using a Butterworth high-pass in the log-frequency domain. Effective for
    images near the lunar terminator where large illumination gradients exist.

    Args:
        image_gray: Grayscale image (any dtype).
        cutoff: Butterworth filter cutoff frequency in cycles/image.
        order: Butterworth filter order (steepness of rolloff).
        gamma_low: Weight for low-frequency (illumination) component.
        gamma_high: Weight for high-frequency (reflectance) component.

    Returns:
        Filtered image, uint8, same shape as input.
    """
    if image_gray.ndim != 2:
        raise PreprocessingError(
            "homomorphic", f"Expected 2D grayscale image, got shape {image_gray.shape}"
        )

    h, w = image_gray.shape

    # Log domain (add 1 to avoid log(0))
    img_float = image_gray.astype(np.float64)
    img_float = np.clip(img_float, 0, None)
    log_img = np.log1p(img_float)

    # FFT
    fft = np.fft.fft2(log_img)
    fft_shifted = np.fft.fftshift(fft)

    # Butterworth high-pass filter
    cy, cx = h // 2, w // 2
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((Y - cy) ** 2 + (X - cx) ** 2)
    # Avoid division by zero at DC
    dist = np.where(dist == 0, 1e-6, dist)
    butterworth = 1.0 / (1.0 + (cutoff / dist) ** (2 * order))
    H = gamma_low + (gamma_high - gamma_low) * butterworth

    # Apply filter and inverse FFT
    filtered_fft = fft_shifted * H
    filtered = np.fft.ifft2(np.fft.ifftshift(filtered_fft)).real

    # Exponentiate back
    result = np.expm1(filtered)

    # Check for numerical issues
    if not np.isfinite(result).all():
        raise PreprocessingError("homomorphic", "Filter produced non-finite values — check input range.")

    # Normalize to uint8
    r_min, r_max = result.min(), result.max()
    if r_max == r_min:
        raise PreprocessingError("homomorphic", "Filtered image has zero contrast.")
    result_u8 = ((result - r_min) / (r_max - r_min) * 255).astype(np.uint8)
    return result_u8


def normalize_image(
    image_gray: np.ndarray,
    method: str = "clahe",
    **kwargs: float | int | tuple[int, int],
) -> np.ndarray:
    """Dispatch normalization by method name.

    Args:
        image_gray: Input grayscale image.
        method: One of 'clahe', 'homomorphic', 'none'.
        **kwargs: Passed through to the chosen method.

    Returns:
        Normalized image uint8.

    Raises:
        PreprocessingError: If method is unknown.
    """
    if method == "clahe":
        return clahe_normalize(image_gray, **kwargs)  # type: ignore[arg-type]
    elif method == "homomorphic":
        return homomorphic_filter(image_gray, **kwargs)  # type: ignore[arg-type]
    elif method == "none":
        # Still ensure uint8
        if image_gray.dtype != np.uint8:
            img_min, img_max = float(image_gray.min()), float(image_gray.max())
            if img_max == img_min:
                return np.zeros_like(image_gray, dtype=np.uint8)
            return ((image_gray.astype(np.float64) - img_min) / (img_max - img_min) * 255).astype(np.uint8)
        return image_gray
    else:
        raise PreprocessingError(method, f"Unknown normalization method '{method}'. Valid: clahe, homomorphic, none.")
