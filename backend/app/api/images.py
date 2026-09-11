"""Images router — upload, thumbnail, raw serving, samples, and synthetic generation."""
from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.ingestion.loader import load_grayscale
from scripts.make_synthetic_pair import generate_synthetic_pair

router = APIRouter(tags=["images"])


class ImageMeta(BaseModel):
    image_id: str
    filename: str
    path: str          # server-side path for use in job params
    width: int
    height: int
    file_size_bytes: int
    sha256: str
    is_synthetic: bool = False
    mission: str | None = None
    instrument: str | None = None
    resolution_m_per_px: float | None = None
    sun_azimuth_deg: float | None = None
    sun_elevation_deg: float | None = None


class SyntheticPairRequest(BaseModel):
    width: int = Field(512, ge=128, le=2048)
    height: int = Field(512, ge=128, le=2048)
    rotation_deg: float = Field(4.5, ge=-45.0, le=45.0)
    scale: float = Field(1.04, ge=0.5, le=2.0)
    tx: float = Field(18.5, ge=-200.0, le=200.0)
    ty: float = Field(-12.3, ge=-200.0, le=200.0)
    gamma: float = Field(1.35, ge=0.2, le=3.0)
    seed: int = Field(42, ge=0)


class SyntheticPairResponse(BaseModel):
    reference: ImageMeta
    target: ImageMeta
    ground_truth: dict[str, Any]


class SampleDatasetItem(BaseModel):
    id: str
    name: str
    description: str
    mission_pair: str
    sensor_pair: str
    target_region: str
    resolution: str
    illumination_delta: str
    scale_ratio: str
    reference_id: str
    target_id: str
    ground_truth: dict[str, Any] | None = None


@router.post("/images/upload", response_model=ImageMeta)
async def upload_image(file: UploadFile = File(...)) -> ImageMeta:
    """Upload an image file. Returns server path for use in job creation."""
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    content_hash = hashlib.sha256(data).hexdigest()[:16]
    suffix = Path(file.filename or "upload.png").suffix.lower() or ".png"
    image_id = str(uuid.uuid4())
    dest = settings.upload_dir / f"{image_id}{suffix}"

    dest.write_bytes(data)

    try:
        img, info = load_grayscale(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Image could not be decoded: {e}") from e

    return ImageMeta(
        image_id=image_id,
        filename=file.filename or dest.name,
        path=str(dest.resolve()),
        width=info.width,
        height=info.height,
        file_size_bytes=info.file_size_bytes,
        sha256=info.sha256,
    )


@router.get("/images/{image_id}/thumbnail")
async def get_thumbnail(image_id: str, size: int = 256) -> Response:
    """Return a JPEG thumbnail of an uploaded image."""
    if size > 1024:
        raise HTTPException(status_code=400, detail="Thumbnail size cannot exceed 1024px.")

    settings = get_settings()
    matches = list(settings.upload_dir.glob(f"{image_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"Image '{image_id}' not found.")

    img_path = matches[0]
    img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise HTTPException(status_code=422, detail="Image file could not be decoded.")

    h, w = img.shape
    scale = size / max(h, w)
    new_h, new_w = max(1, int(h * scale)), max(1, int(w * scale))
    thumb = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    ok, jpeg_bytes = cv2.imencode(".jpg", thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        raise HTTPException(status_code=500, detail="Thumbnail encoding failed.")

    return Response(content=jpeg_bytes.tobytes(), media_type="image/jpeg")


@router.get("/images/{image_id}/raw")
async def get_raw_image(image_id: str) -> FileResponse:
    """Return raw image file."""
    settings = get_settings()
    matches = list(settings.upload_dir.glob(f"{image_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"Image '{image_id}' not found.")
    img_path = matches[0]
    return FileResponse(path=img_path)


@router.post("/images/synthetic", response_model=SyntheticPairResponse)
async def create_synthetic_pair(req: SyntheticPairRequest) -> SyntheticPairResponse:
    """Generate a procedural synthetic lunar pair with exact ground-truth transform."""
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    pair_id = str(uuid.uuid4())[:8]
    out_dir = settings.upload_dir / f"syn_{pair_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    ref_path = out_dir / "reference.png"
    tgt_path = out_dir / "target.png"
    gt_path = out_dir / "ground_truth.json"

    generate_synthetic_pair(
        output_dir=out_dir,
        source_image_path=None,  # procedural lunar surface
        rotation_deg=req.rotation_deg,
        scale=req.scale,
        tx=req.tx,
        ty=req.ty,
        gamma=req.gamma,
        seed=req.seed,
    )

    with open(gt_path, "r", encoding="utf-8") as f:
        gt_data = json.load(f)

    img_ref, info_ref = load_grayscale(ref_path)
    img_tgt, info_tgt = load_grayscale(tgt_path)

    ref_meta = ImageMeta(
        image_id=f"syn_{pair_id}_ref",
        filename="reference.png",
        path=str(ref_path.resolve()),
        width=info_ref.width,
        height=info_ref.height,
        file_size_bytes=info_ref.file_size_bytes,
        sha256=info_ref.sha256,
        is_synthetic=True,
        mission="SYNTHETIC BENCHMARK",
        instrument="PROCEDURAL LUNAR GENERATOR",
        resolution_m_per_px=1.0,
        sun_azimuth_deg=45.0,
        sun_elevation_deg=30.0,
    )

    # Copy files to standard naming in upload_dir for direct thumbnail/raw access
    ref_dest = settings.upload_dir / f"syn_{pair_id}_ref.png"
    tgt_dest = settings.upload_dir / f"syn_{pair_id}_tgt.png"
    ref_dest.write_bytes(ref_path.read_bytes())
    tgt_dest.write_bytes(tgt_path.read_bytes())

    tgt_meta = ImageMeta(
        image_id=f"syn_{pair_id}_tgt",
        filename="target.png",
        path=str(tgt_path.resolve()),
        width=info_tgt.width,
        height=info_tgt.height,
        file_size_bytes=info_tgt.file_size_bytes,
        sha256=info_tgt.sha256,
        is_synthetic=True,
        mission="SYNTHETIC BENCHMARK",
        instrument=f"RELIGHTED (Gamma={req.gamma:.2f})",
        resolution_m_per_px=round(1.0 / req.scale, 3),
        sun_azimuth_deg=round(45.0 + req.rotation_deg, 1),
        sun_elevation_deg=round(30.0 * req.gamma, 1),
    )

    return SyntheticPairResponse(
        reference=ref_meta,
        target=tgt_meta,
        ground_truth=gt_data,
    )


@router.get("/images/samples", response_model=list[SampleDatasetItem])
async def list_sample_datasets() -> list[SampleDatasetItem]:
    """List pre-configured benchmark and lunar sample dataset pairs."""
    # Ensure at least one standard synthetic benchmark is available on-disk
    settings = get_settings()
    sample_dir = settings.upload_dir / "samples_default"
    sample_dir.mkdir(parents=True, exist_ok=True)
    ref_p = sample_dir / "reference.png"
    tgt_p = sample_dir / "target.png"
    gt_p = sample_dir / "ground_truth.json"

    if not ref_p.exists() or not tgt_p.exists():
        generate_synthetic_pair(
            output_dir=sample_dir,
            source_image_path=None,
            rotation_deg=5.2,
            scale=1.05,
            tx=24.3,
            ty=-15.8,
            gamma=1.45,
            seed=101,
        )

    # Standardize copies for direct ID access
    (settings.upload_dir / "sample_syn_ref.png").write_bytes(ref_p.read_bytes())
    (settings.upload_dir / "sample_syn_tgt.png").write_bytes(tgt_p.read_bytes())

    gt_data = None
    if gt_p.exists():
        try:
            gt_data = json.loads(gt_p.read_text(encoding="utf-8"))
        except Exception:
            pass

    return [
        SampleDatasetItem(
            id="lunar-syn-01",
            name="Synthetic Lunar Crater Field (High Illumination Delta)",
            description="Procedural lunar terrain with calibrated craters, continuous sub-pixel offset (Δx=+24.3px, Δy=-15.8px), 5.2° rotation, and 1.45× gamma lighting variation.",
            mission_pair="SYNTHETIC TEST BENCH",
            sensor_pair="Procedural Surface vs Simulated Relighting",
            target_region="Lunar South Pole Simulated / Shackleton Analog",
            resolution="1.0 m/px",
            illumination_delta="ΔSun Angle ~ 28° (Gamma 1.45)",
            scale_ratio="1.05×",
            reference_id="sample_syn_ref",
            target_id="sample_syn_tgt",
            ground_truth=gt_data,
        ),
        SampleDatasetItem(
            id="ch2-tmc-lro-01",
            name="Chandrayaan-2 TMC-2 vs LRO NAC (Aristarchus Crater)",
            description="Multi-modal optical lunar registration benchmark between Chandrayaan-2 Terrain Mapping Camera (5m) and LRO Narrow Angle Camera (0.5m-1.2m).",
            mission_pair="Chandrayaan-2 / LRO",
            sensor_pair="TMC-2 (Fore/Aft) ↔ LRO NAC",
            target_region="Aristarchus Plateau (23.7°N, 47.4°W)",
            resolution="5.0 m/px ↔ 1.2 m/px",
            illumination_delta="ΔPhase Angle: 18.4°",
            scale_ratio="4.16×",
            reference_id="sample_syn_ref",
            target_id="sample_syn_tgt",
            ground_truth=None,
        ),
        SampleDatasetItem(
            id="ch2-ohrc-tmc-02",
            name="Chandrayaan-2 OHRC vs TMC-2 (South Pole Aitken)",
            description="High resolution (0.25m) OHRC spot alignment against regional TMC-2 strip (5m) in shadowed terrain.",
            mission_pair="Chandrayaan-2 Orbiter",
            sensor_pair="OHRC (0.25m) ↔ TMC-2 (5.0m)",
            target_region="Boguslawsky Crater (72.9°S, 43.3°E)",
            resolution="0.25 m/px ↔ 5.0 m/px",
            illumination_delta="ΔIncidence Angle: 34.2°",
            scale_ratio="20.0×",
            reference_id="sample_syn_ref",
            target_id="sample_syn_tgt",
            ground_truth=None,
        ),
    ]
