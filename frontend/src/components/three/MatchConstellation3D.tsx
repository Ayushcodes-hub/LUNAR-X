import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Activity } from 'lucide-react';

interface MatchPointData {
  ref: number[][];
  tgt: number[][];
  scores: number[];
  uncertainties?: number[];
  inlier_mask: boolean[];
}

interface MatchConstellation3DProps {
  matchPoints?: MatchPointData;
  refTextureUrl?: string;
  tgtTextureUrl?: string;
}

export const MatchConstellation3D: React.FC<MatchConstellation3DProps> = ({
  matchPoints,
  refTextureUrl,
  tgtTextureUrl,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showSpikes, setShowSpikes] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [onlyInliers, setOnlyInliers] = useState<boolean>(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 400;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020308);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -65, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Ambient & Directional Light
    scene.add(new THREE.AmbientLight(0x334455, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 30, 50);
    scene.add(dirLight);

    // 3. Dual 3D Image Planes (Reference plane at z = -8, Target plane at z = +8)
    const planeGeo = new THREE.PlaneGeometry(36, 36);
    const refMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const tgtMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

    const refMesh = new THREE.Mesh(planeGeo, refMat);
    refMesh.position.set(0, 0, -8);
    scene.add(refMesh);

    const tgtMesh = new THREE.Mesh(planeGeo, tgtMat);
    tgtMesh.position.set(0, 0, 8);
    scene.add(tgtMesh);

    const texLoader = new THREE.TextureLoader();
    if (refTextureUrl) {
      texLoader.load(refTextureUrl, (t) => { refMat.map = t; refMat.needsUpdate = true; });
    }
    if (tgtTextureUrl) {
      texLoader.load(tgtTextureUrl, (t) => { tgtMat.map = t; tgtMat.needsUpdate = true; });
    }

    // 4. Render 3D Match Vectors & Residual Spikes
    const vectorsGroup = new THREE.Group();
    scene.add(vectorsGroup);

    if (matchPoints && matchPoints.ref.length > 0) {
      const pts = matchPoints;
      const mask = pts.inlier_mask;
      const scores = pts.scores;

      // Coordinate scaling from pixels to 3D plane (-18 to +18)
      const maxDim = 512;
      const scaleCoord = (pt: number[]) => {
        const x = ((pt[0] / maxDim) - 0.5) * 36;
        const y = -((pt[1] / maxDim) - 0.5) * 36;
        return { x, y };
      };

      pts.ref.forEach((ptRef, i) => {
        const isInlier = mask[i];
        if (onlyInliers && !isInlier) return;

        const ptTgt = pts.tgt[i];
        const score = scores[i] ?? 0.5;
        const rPos = scaleCoord(ptRef);
        const tPos = scaleCoord(ptTgt);

        const vStart = new THREE.Vector3(rPos.x, rPos.y, -8);
        const vEnd = new THREE.Vector3(tPos.x, tPos.y, 8);

        // A. 3D Connecting Bezier Curves
        if (showVectors) {
          const midZ = 0;
          const midX = (vStart.x + vEnd.x) / 2;
          const midY = (vStart.y + vEnd.y) / 2;
          const curve = new THREE.QuadraticBezierCurve3(
            vStart,
            new THREE.Vector3(midX, midY, midZ),
            vEnd
          );

          const curvePoints = curve.getPoints(12);
          const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
          const color = isInlier ? new THREE.Color(0x22d3ee) : new THREE.Color(0xf87171);
          const curveMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: isInlier ? Math.max(0.3, score * 0.8) : 0.2,
          });
          const line = new THREE.Line(curveGeo, curveMat);
          vectorsGroup.add(line);
        }

        // B. 3D Residual Error Spikes
        if (showSpikes && isInlier) {
          const resMagnitude = Math.sqrt((ptRef[0] - ptTgt[0]) ** 2 + (ptRef[1] - ptTgt[1]) ** 2);
          const spikeHeight = Math.min(6.0, Math.max(0.4, resMagnitude * 0.15));

          const spikeGeo = new THREE.CylinderGeometry(0.08, 0.2, spikeHeight, 6);
          spikeGeo.translate(0, spikeHeight / 2, 0);
          spikeGeo.rotateX(Math.PI / 2);

          const spikeMat = new THREE.MeshBasicMaterial({
            color: resMagnitude < 2.0 ? 0x4ade80 : resMagnitude < 5.0 ? 0xfbbf24 : 0xf87171,
          });
          const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
          spikeMesh.position.set(rPos.x, rPos.y, -8);
          vectorsGroup.add(spikeMesh);
        }
      });
    }

    // 5. Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rot = { x: -0.5, z: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      rot.z += dx * 0.008;
      rot.x = Math.max(-1.4, Math.min(0.3, rot.x + dy * 0.008));
      refMesh.rotation.z = tgtMesh.rotation.z = vectorsGroup.rotation.z = rot.z;
      refMesh.rotation.x = tgtMesh.rotation.x = vectorsGroup.rotation.x = rot.x;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 6. Animation
    let animId = 0;
    const animate = () => {
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [matchPoints, showSpikes, showVectors, onlyInliers]);

  return (
    <div className="relative w-full h-full flex flex-col glass rounded-xl overflow-hidden border border-cyan-900/30">
      {/* 3D Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-black/50 border-b border-cyan-900/30 text-xs font-mono z-10">
        <div className="flex items-center gap-2 text-cyan-400">
          <Activity size={14} />
          <span className="font-bold tracking-wider">3D MATCH CONSTELLATION & RESIDUAL SURFACE</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-2 py-1 rounded transition-colors ${
              showVectors ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            3D VECTORS
          </button>
          <button
            onClick={() => setShowSpikes(!showSpikes)}
            className={`px-2 py-1 rounded transition-colors ${
              showSpikes ? 'bg-green-500/20 text-green-300 border border-green-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            RESIDUAL SPIKES
          </button>
          <button
            onClick={() => setOnlyInliers(!onlyInliers)}
            className={`px-2 py-1 rounded transition-colors ${
              onlyInliers ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            INLIERS ONLY
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div ref={mountRef} className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden" />

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 p-3 glass rounded-lg bg-black/70 border border-cyan-900/40 text-xs font-mono space-y-1 z-10">
        <div className="text-cyan-400 font-bold mb-1">3D CORRESPONDENCE FIELD</div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Cyan: High-Confidence Inlier Vector</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span>Green Spikes: Sub-Pixel Residual (&lt;2.0px)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span>Red: Outlier / High Dispersion</span>
        </div>
      </div>
    </div>
  );
};
