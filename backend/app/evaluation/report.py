"""Evaluation report generation module (JSON and standalone HTML).

Generates scientifically rigorous evaluation reports containing:
- Dataset / Image metadata
- Geometric transformation & Sub-pixel offsets
- Quantitative metrics: RMSE, NCC, SSIM, Mutual Information, Inlier Ratio
- Spatial uniformity metrics and density distribution
- Convergence history
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def generate_json_report(result_dict: dict[str, Any]) -> str:
    """Serialize full registration result to formatted JSON report."""
    report_data = {
        "report_type": "LUNARIS_REGISTRATION_EVALUATION_REPORT",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mission_context": {
            "problem_statement": "SIH26166",
            "source_payloads": ["OHRC", "TMC-2", "IIRS"],
            "reference_datasets": ["LRO NAC", "SELENE"],
        },
        "job_id": result_dict.get("job_id"),
        "metrics": result_dict.get("metrics", {}),
        "uniformity": result_dict.get("uniformity"),
        "subpixel_refinement": {
            "delta_x_px": result_dict.get("metrics", {}).get("delta_x_px"),
            "delta_y_px": result_dict.get("metrics", {}).get("delta_y_px"),
            "delta_rotation_deg": result_dict.get("metrics", {}).get("delta_rotation_deg"),
            "delta_scale": result_dict.get("metrics", {}).get("delta_scale"),
            "subpixel_precision_px": result_dict.get("metrics", {}).get("subpixel_precision_px"),
        },
        "convergence_history": result_dict.get("convergence_history", []),
        "images": result_dict.get("image_info", {}),
    }
    return json.dumps(report_data, indent=2)


def generate_html_report(result_dict: dict[str, Any]) -> str:
    """Generate self-contained, printable dark-themed HTML report."""
    metrics = result_dict.get("metrics", {})
    uniformity = result_dict.get("uniformity", {}) or {}
    job_id = result_dict.get("job_id", "N/A")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    rmse = f"{metrics.get('rmse_px'):.4f} px" if metrics.get("rmse_px") is not None else "N/A"
    ncc = f"{metrics.get('ncc'):.4f}" if metrics.get("ncc") is not None else "N/A"
    ssim = f"{metrics.get('ssim'):.4f}" if metrics.get("ssim") is not None else "N/A"
    mi = f"{metrics.get('mutual_information'):.4f} nats" if metrics.get("mutual_information") is not None else "N/A"
    inliers = metrics.get("inlier_count", "N/A")
    inlier_ratio = f"{metrics.get('inlier_ratio', 0)*100:.2f}%" if metrics.get("inlier_ratio") is not None else "N/A"
    dx = f"{metrics.get('delta_x_px'):+.4f} px" if metrics.get("delta_x_px") is not None else "N/A"
    dy = f"{metrics.get('delta_y_px'):+.4f} px" if metrics.get("delta_y_px") is not None else "N/A"
    rot = f"{metrics.get('delta_rotation_deg'):+.4f}°" if metrics.get("delta_rotation_deg") is not None else "N/A"
    scale = f"{metrics.get('delta_scale'):.5f}×" if metrics.get("delta_scale") is not None else "N/A"
    precision = f"{metrics.get('subpixel_precision_px'):.4f} px" if metrics.get("subpixel_precision_px") is not None else "N/A"
    grade = (metrics.get("quality_grade") or "N/A").upper().replace("_", " ")
    explanation = metrics.get("quality_explanation") or "No explanation generated."
    u_score = f"{uniformity.get('score', 0):.4f}" if uniformity.get("score") is not None else "N/A"
    u_cov = f"{uniformity.get('coverage_fraction', 0)*100:.1f}%" if uniformity.get("coverage_fraction") is not None else "N/A"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>LUNARIS Scientific Registration Report - {job_id}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'JetBrains Mono', monospace;
    background: #0a0b14;
    color: #e2e8f0;
    margin: 0;
    padding: 30px;
  }}
  .container {{
    max-width: 900px;
    margin: 0 auto;
    background: #0d1020;
    border: 1px solid rgba(34, 211, 238, 0.2);
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }}
  .header {{
    border-bottom: 1px solid rgba(34, 211, 238, 0.2);
    padding-bottom: 20px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .title {{
    font-size: 24px;
    font-weight: 700;
    color: #22d3ee;
    letter-spacing: 2px;
  }}
  .badge {{
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid #22d3ee;
    color: #22d3ee;
    background: rgba(34, 211, 238, 0.1);
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }}
  .card {{
    background: rgba(17, 21, 37, 0.8);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 16px;
  }}
  .card h3 {{
    margin-top: 0;
    font-size: 13px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding-bottom: 8px;
  }}
  .metric-row {{
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }}
  .metric-val {{
    font-family: 'JetBrains Mono', monospace;
    color: #22d3ee;
    font-weight: 600;
  }}
  .explanation {{
    background: rgba(34, 211, 238, 0.05);
    border-left: 3px solid #22d3ee;
    padding: 12px 16px;
    font-size: 13px;
    color: #cbd5e1;
    margin-bottom: 24px;
  }}
  .footer {{
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 16px;
    font-size: 11px;
    color: #64748b;
    text-align: center;
  }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="title">LUNARIS EVALUATION REPORT</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">SIH26166 — Multi-Modal Lunar Image Registration</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">QUALITY: {grade}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">{timestamp}</div>
    </div>
  </div>

  <div class="explanation">
    <strong>Diagnostic Assessment:</strong> {explanation}
  </div>

  <div class="grid">
    <div class="card">
      <h3>Correspondence Metrics</h3>
      <div class="metric-row"><span>Inlier Matches</span><span class="metric-val">{inliers}</span></div>
      <div class="metric-row"><span>Inlier Ratio</span><span class="metric-val">{inlier_ratio}</span></div>
      <div class="metric-row"><span>Spatial Uniformity Score</span><span class="metric-val">{u_score}</span></div>
      <div class="metric-row"><span>Grid Coverage</span><span class="metric-val">{u_cov}</span></div>
    </div>

    <div class="card">
      <h3>Image Alignment Metrics</h3>
      <div class="metric-row"><span>RMSE</span><span class="metric-val">{rmse}</span></div>
      <div class="metric-row"><span>Normalized Cross-Correlation</span><span class="metric-val">{ncc}</span></div>
      <div class="metric-row"><span>Structural Similarity (SSIM)</span><span class="metric-val">{ssim}</span></div>
      <div class="metric-row"><span>Mutual Information</span><span class="metric-val">{mi}</span></div>
    </div>

    <div class="card">
      <h3>Sub-Pixel Refinement</h3>
      <div class="metric-row"><span>Sub-Pixel ΔX Offset</span><span class="metric-val">{dx}</span></div>
      <div class="metric-row"><span>Sub-Pixel ΔY Offset</span><span class="metric-val">{dy}</span></div>
      <div class="metric-row"><span>Rotation Refinement</span><span class="metric-val">{rot}</span></div>
      <div class="metric-row"><span>Scale Refinement</span><span class="metric-val">{scale}</span></div>
      <div class="metric-row"><span>Refinement Precision Limit</span><span class="metric-val">{precision}</span></div>
    </div>

    <div class="card">
      <h3>Job Execution Details</h3>
      <div class="metric-row"><span>Job Identifier</span><span class="metric-val" style="font-size: 11px;">{job_id}</span></div>
      <div class="metric-row"><span>Processing Engine</span><span class="metric-val">PyTorch + OpenCV (CPU/GPU)</span></div>
      <div class="metric-row"><span>Sub-Pixel Method</span><span class="metric-val">Phase Correlation / ECC / Multi-Scale</span></div>
    </div>
  </div>

  <div class="footer">
    Generated by LUNARIS Command Center · SIH Problem Statement 26166 · Indian Space Research Organisation (ISRO)
  </div>
</div>
</body>
</html>"""
    return html
