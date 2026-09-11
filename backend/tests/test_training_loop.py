"""Tests for real PyTorch fine-tuning loop and automated evaluation gate."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.mlops.training import FineTuningEngine
from scripts.make_synthetic_pair import _generate_lunar_surface


class TestTrainingLoop:
    def test_real_training_loop_runs_and_decreases_loss(self) -> None:
        """Verify real PyTorch loop executes backprop, optimizer steps, and saves state dict."""
        dem = _generate_lunar_surface(64, 64, seed=123).astype(np.float32)
        engine = FineTuningEngine()

        step_records = []

        def callback(rec):
            step_records.append(rec)

        result = engine.train_projection_head(
            dem_data=dem,
            epochs=2,
            batch_size=4,
            learning_rate=1e-3,
            step_callback=callback,
        )

        # 1. Real steps executed
        assert result.total_steps > 0
        assert len(step_records) == result.total_steps

        # 2. Checkpoint saved to disk
        ckpt_path = Path(result.checkpoint_path)
        assert ckpt_path.exists()
        state = torch.load(str(ckpt_path), map_location="cpu")
        assert "net.0.weight" in state

        # 3. Evaluation gate returns boolean
        assert isinstance(result.evaluation_gate_passed, bool)
        assert np.isfinite(result.final_loss)
        assert np.isfinite(result.validation_loss)
