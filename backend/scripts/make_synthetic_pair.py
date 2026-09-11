#!/usr/bin/env python3
"""Synthetic image pair generator for LUNARIS testing.

Takes any grayscale image (or generates a procedural lunar surface),
applies a known geometric transform + synthetic illumination shift,
and saves:
  - reference.png
  - target.png   (transformed + relighted)
  - ground_truth.json  (exact transform parameters)

LABEL: All output files are SYNTHETIC TEST DATA — clearly labeled in
ground_truth.json and in the filenames. Never presented as real imagery.

Usage:
    python make_synthetic_pair.py --output ./test_pair --rotation 5.2 --scale 1.05 --tx 30 --ty -20 --gamma 1.4
    python make_synthetic_pair.py --output ./test_pair --generate-lunar  # procedural lunar surface
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np


def _generate_lunar_surface(width: int = 512, height: int = 512, seed: int = 42) -> np.ndarray:
    """Generate a procedural grayscale lunar-surface-like texture.

    Uses multi-octave Perlin-like noise (sum of scaled random arrays).
    This is clearly synthetic — not real imagery.
    Labeled as SYNTHETIC in ground_truth.json.
    """
    rng = np.random.default_rng(seed)
    surface = np.zeros((height, width), dtype=np.float32)

    # Multi-octave noise
    for octave in range(6):
        scale = 2 ** octave
        small_h = max(4, height // scale)
        small_w = max(4, width // scale)
        noise = rng.random((small_h, small_w)).astype(np.float32)
        # Upscale
        upscaled = cv2.resize(noise, (width, height), interpolation=cv2.INTER_CUBIC)
        surface += upscaled / (2 ** octave)

    # Add craters: dark circles with bright rim (skip if image too small for craters)
    margin = min(20, width // 6, height // 6)
    r_max = max(5, min(20, width // 8))
    if width > margin * 2 and height > margin * 2:
        n_craters = rng.integers(4, 12)
        for _ in range(n_craters):
            cx = int(rng.integers(margin, width - margin))
            cy = int(rng.integers(margin, height - margin))
            r = int(rng.integers(2, r_max))
            # Dark floor
            cv2.circle(surface, (cx, cy), r, float(surface.min() + 0.1), -1)
            # Bright rim
            cv2.circle(surface, (cx, cy), r + 2, float(surface.max() - 0.1), 2)

    # Normalize to uint8
    s_min, s_max = surface.min(), surface.max()
    img = ((surface - s_min) / (s_max - s_min) * 255).astype(np.uint8)
    return img


def build_homography(
    rotation_deg: float,
    scale: float,
    tx: float,
    ty: float,
    cx: float,
    cy: float,
) -> np.ndarray:
    """Build a 3×3 homography for rotation+scale+translation about image center.

    Args:
        rotation_deg: Rotation in degrees (CCW positive).
        scale: Uniform scale factor.
        tx, ty: Translation in pixels.
        cx, cy: Center of rotation (typically image center).

    Returns:
        3×3 float64 homography matrix.
    """
    theta = math.radians(rotation_deg)
    cos_t = math.cos(theta) * scale
    sin_t = math.sin(theta) * scale

    # Rotation + scale about center
    H = np.array([
        [cos_t,  -sin_t, (1 - cos_t) * cx + sin_t * cy + tx],
        [sin_t,   cos_t, (1 - cos_t) * cy - sin_t * cx + ty],
        [0.0,     0.0,   1.0],
    ], dtype=np.float64)
    return H


def apply_relighting(
    img: np.ndarray,
    gamma: float = 1.4,
    brightness_offset: int = 20,
) -> np.ndarray:
    """Apply synthetic illumination shift (gamma + brightness) to simulate sun-angle change.

    Args:
        img: Grayscale uint8 image.
        gamma: Gamma correction value (>1 = darker, <1 = brighter).
        brightness_offset: Additive brightness shift (can be negative).

    Returns:
        Relighted uint8 image.
    """
    # Gamma correction
    lut = np.array(
        [np.clip((i / 255.0) ** gamma * 255, 0, 255) for i in range(256)],
        dtype=np.uint8,
    )
    relighted = cv2.LUT(img, lut)
    # Brightness offset
    relighted = np.clip(relighted.astype(np.int32) + brightness_offset, 0, 255).astype(np.uint8)
    return relighted


def generate_pair(
    source_img: np.ndarray,
    rotation_deg: float,
    scale: float,
    tx: float,
    ty: float,
    gamma: float,
    brightness_offset: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Generate (reference, target, H) from source image and transform params.

    Returns:
        reference: uint8 grayscale (= source image, possibly relighted for ref)
        target: uint8 grayscale (transformed + relighted)
        H: 3×3 ground-truth homography that maps reference → target space

    Note: H transforms REFERENCE points → TARGET points.
    To register target to reference, use H_inv = np.linalg.inv(H).
    """
    h, w = source_img.shape[:2]
    cx, cy = w / 2.0, h / 2.0

    H = build_homography(rotation_deg, scale, tx, ty, cx, cy)

    # Apply geometric transform to produce target
    target = cv2.warpPerspective(source_img, H, (w, h), flags=cv2.INTER_LANCZOS4)

    # Apply illumination shift to target
    target = apply_relighting(target, gamma=gamma, brightness_offset=brightness_offset)

    return source_img.copy(), target, H


def generate_synthetic_pair(
    output_dir: Path | str,
    source_image_path: str | Path | None = None,
    rotation_deg: float = 5.0,
    scale: float = 1.05,
    tx: float = 30.0,
    ty: float = -20.0,
    gamma: float = 1.4,
    brightness_offset: int = 20,
    seed: int = 42,
    size: int = 512,
) -> tuple[Path, Path, Path]:
    """Helper to generate and save synthetic reference.png, target.png, and ground_truth.json."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if source_image_path:
        source = cv2.imread(str(source_image_path), cv2.IMREAD_GRAYSCALE)
        if source is None:
            source = _generate_lunar_surface(size, size, seed=seed)
    else:
        source = _generate_lunar_surface(size, size, seed=seed)

    reference, target, H = generate_pair(
        source,
        rotation_deg=rotation_deg,
        scale=scale,
        tx=tx,
        ty=ty,
        gamma=gamma,
        brightness_offset=brightness_offset,
    )

    ref_path = out_dir / "reference.png"
    tgt_path = out_dir / "target.png"
    cv2.imwrite(str(ref_path), reference)
    cv2.imwrite(str(tgt_path), target)

    try:
        H_inv = np.linalg.inv(H)
        invertible = True
        invertibility_error = float(np.abs(H @ H_inv - np.eye(3)).max())
    except Exception:
        H_inv = None
        invertible = False
        invertibility_error = None

    gt = {
        "metadata": {
            "generated_at": "now",
            "label": "SYNTHETIC TEST DATA",
            "generator_script": "make_synthetic_pair.py",
        },
        "source": {
            "synthetic_surface": source_image_path is None,
            "width": reference.shape[1],
            "height": reference.shape[0],
        },
        "transform": {
            "rotation_deg": rotation_deg,
            "scale": scale,
            "translation_x_px": tx,
            "translation_y_px": ty,
            "homography_matrix_3x3": H.tolist(),
        },
        "relighting": {
            "gamma": gamma,
            "brightness_offset": brightness_offset,
        },
        "homography_ref_to_target": H.tolist(),
        "homography_target_to_ref": H_inv.tolist() if H_inv is not None else None,
        "invertibility": {
            "is_invertible": invertible,
            "max_identity_error": invertibility_error,
        },
    }

    gt_path = out_dir / "ground_truth.json"
    gt_path.write_text(json.dumps(gt, indent=2))

    return ref_path, tgt_path, gt_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a synthetic image pair for LUNARIS registration testing."
    )
    parser.add_argument("--input", type=str, default=None,
                        help="Input grayscale image path. If omitted, generates procedural lunar surface.")
    parser.add_argument("--output", type=str, default="./synthetic_pair",
                        help="Output directory for reference.png, target.png, ground_truth.json.")
    parser.add_argument("--rotation", type=float, default=5.0,
                        help="Rotation in degrees (CCW). Default: 5.0")
    parser.add_argument("--scale", type=float, default=1.05,
                        help="Scale factor. Default: 1.05")
    parser.add_argument("--tx", type=float, default=30.0,
                        help="X translation in pixels. Default: 30.0")
    parser.add_argument("--ty", type=float, default=-20.0,
                        help="Y translation in pixels. Default: -20.0")
    parser.add_argument("--gamma", type=float, default=1.4,
                        help="Illumination gamma shift. Default: 1.4")
    parser.add_argument("--brightness-offset", type=int, default=20,
                        help="Additive brightness offset. Default: 20")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for procedural generation. Default: 42")
    parser.add_argument("--size", type=int, default=512,
                        help="Image size (square) for procedural generation. Default: 512")
    parser.add_argument("--generate-lunar", action="store_true",
                        help="Force procedural lunar surface generation even if --input is given.")

    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load or generate source
    if args.input and not args.generate_lunar:
        source = cv2.imread(args.input, cv2.IMREAD_GRAYSCALE)
        if source is None:
            print(f"ERROR: Cannot load image '{args.input}'.", file=sys.stderr)
            sys.exit(1)
        source_label = f"loaded from '{args.input}'"
    else:
        source = _generate_lunar_surface(args.size, args.size, seed=args.seed)
        source_label = f"procedural lunar surface (seed={args.seed}, size={args.size}x{args.size})"

    reference, target, H = generate_pair(
        source,
        rotation_deg=args.rotation,
        scale=args.scale,
        tx=args.tx,
        ty=args.ty,
        gamma=args.gamma,
        brightness_offset=args.brightness_offset,
    )

    # Save images
    ref_path = out_dir / "reference.png"
    tgt_path = out_dir / "target.png"
    cv2.imwrite(str(ref_path), reference)
    cv2.imwrite(str(tgt_path), target)

    # Verify H is invertible (sanity check)
    try:
        H_inv = np.linalg.inv(H)
        det = np.linalg.det(H)
        assert abs(det) > 1e-6, f"Degenerate H (det={det})"
        identity_check = H @ H_inv
        max_err = float(np.abs(identity_check - np.eye(3)).max())
        invertible = True
        invertibility_error = max_err
    except Exception as e:
        invertible = False
        invertibility_error = None
        print(f"WARNING: H invertibility check failed: {e}", file=sys.stderr)

    # Ground truth JSON — clearly labeled SYNTHETIC
    gt = {
        "data_type": "SYNTHETIC TEST DATA",
        "warning": "This is procedurally generated data for pipeline testing. NOT real lunar imagery.",
        "source": source_label,
        "image_size": {"width": reference.shape[1], "height": reference.shape[0]},
        "transform": {
            "rotation_deg": args.rotation,
            "scale": args.scale,
            "tx_px": args.tx,
            "ty_px": args.ty,
            "center_x": reference.shape[1] / 2.0,
            "center_y": reference.shape[0] / 2.0,
        },
        "illumination": {
            "gamma": args.gamma,
            "brightness_offset": args.brightness_offset,
        },
        "homography_ref_to_target": H.tolist(),
        "homography_target_to_ref": H_inv.tolist() if invertible else None,
        "invertibility": {
            "is_invertible": invertible,
            "max_identity_error": invertibility_error,
        },
        "files": {
            "reference": str(ref_path.resolve()),
            "target": str(tgt_path.resolve()),
        },
    }

    gt_path = out_dir / "ground_truth.json"
    gt_path.write_text(json.dumps(gt, indent=2))

    print("[OK] Synthetic pair generated:")
    print(f"  Reference : {ref_path}")
    print(f"  Target    : {tgt_path}")
    print(f"  GT JSON   : {gt_path}")
    print(f"  Transform : rot={args.rotation}deg, scale={args.scale}x, tx={args.tx}px, ty={args.ty}px")
    print(f"  Relighting: gamma={args.gamma}, brightness_offset={args.brightness_offset}")
    print(f"  H invertibility error: {invertibility_error:.2e}" if invertibility_error else "  WARNING: H not invertible!")


if __name__ == "__main__":
    main()
