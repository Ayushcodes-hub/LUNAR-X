#!/usr/bin/env python3
"""Benchmark SIFT vs LoFTR dense matcher on synthetic/real lunar image pair.

Runs both registration pipelines under identical parameters and prints a
structured comparison table containing:
- Match count & inliers
- Inlier ratio
- Runtime (seconds)
- Reprojection error / RMSE

Usage:
    python benchmark.py --ref ./test_data/reference.png --tgt ./test_data/target.png
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import cv2

# Add backend root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.geometry.estimator import estimate_homography
from app.matching.registry import get_matcher
from app.preprocessing.normalizer import clahe_normalize


def run_matcher_benchmark(ref_img, tgt_img, matcher_name: str) -> dict:
    matcher = get_matcher(matcher_name)
    t0 = time.perf_counter()
    try:
        matches = matcher.match(ref_img, tgt_img)
        t_match = time.perf_counter() - t0
        geo = estimate_homography(matches.keypoints_ref, matches.keypoints_tgt)
        t_total = time.perf_counter() - t0
        return {
            "status": "SUCCESS",
            "matches": matches.match_count,
            "inliers": geo.inlier_count,
            "inlier_ratio": geo.inlier_ratio,
            "reproj_error": geo.reprojection_error_px,
            "match_time_sec": t_match,
            "total_time_sec": t_total,
        }
    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "matches": 0,
            "inliers": 0,
            "inlier_ratio": 0.0,
            "reproj_error": float("nan"),
            "match_time_sec": 0.0,
            "total_time_sec": time.perf_counter() - t0,
        }


def main():
    parser = argparse.ArgumentParser(description="LUNARIS Matcher Benchmark (SIFT vs LoFTR)")
    parser.add_argument("--ref", type=str, required=True, help="Path to reference image")
    parser.add_argument("--tgt", type=str, required=True, help="Path to target image")
    args = parser.parse_args()

    ref_raw = cv2.imread(args.ref, cv2.IMREAD_GRAYSCALE)
    tgt_raw = cv2.imread(args.tgt, cv2.IMREAD_GRAYSCALE)

    if ref_raw is None or tgt_raw is None:
        print("ERROR: Could not load one or both input images.", file=sys.stderr)
        sys.exit(1)

    ref = clahe_normalize(ref_raw)
    tgt = clahe_normalize(tgt_raw)

    print("\n" + "=" * 70)
    print(" LUNARIS MATCHER BENCHMARK (SIH26166)")
    print("=" * 70)
    print(f"Reference Image: {args.ref} ({ref.shape[1]}x{ref.shape[0]})")
    print(f"Target Image:    {args.tgt} ({tgt.shape[1]}x{tgt.shape[0]})")
    print("-" * 70)

    results = {}
    for name in ["sift", "loftr"]:
        print(f"Running {name.upper()} matcher...")
        results[name] = run_matcher_benchmark(ref, tgt, name)

    print("\n" + "=" * 70)
    print(f"{'Matcher':<10} | {'Status':<8} | {'Matches':<8} | {'Inliers':<8} | {'Ratio':<8} | {'Reproj Err':<10} | {'Time (s)':<8}")
    print("-" * 70)
    for name, r in results.items():
        if r["status"] == "SUCCESS":
            print(
                f"{name.upper():<10} | {r['status']:<8} | {r['matches']:<8} | {r['inliers']:<8} | "
                f"{r['inlier_ratio']*100:>6.1f}% | {r['reproj_error']:>9.4f}px | {r['total_time_sec']:>7.3f}s"
            )
        else:
            print(f"{name.upper():<10} | {r['status']:<8} | {'N/A':<8} | {'N/A':<8} | {'N/A':<8} | {'N/A':<10} | {r['total_time_sec']:>7.3f}s")
            print(f"  --> Error: {r.get('error')}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
