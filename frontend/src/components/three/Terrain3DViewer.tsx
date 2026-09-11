import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sun, Eye } from 'lucide-react';

interface Terrain3DViewerProps {
  demGrid?: number[][];
  textureUrl?: string;
  referenceTextureUrl?: string;
}

export const Terrain3DViewer: React.FC<Terrain3DViewerProps> = ({
  demGrid,
  textureUrl,
  referenceTextureUrl,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [sunAzimuth, setSunAzimuth] = useState<number>(45);
  const [sunElevation, setSunElevation] = useState<number>(35);
  const [activeTexture, setActiveTexture] = useState<'source' | 'reference'>('source');
  const [wireframe, setWireframe] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 400;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020308);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -60, 50);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x223344, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 4. Generate 3D Terrain Geometry
    const gridRows = demGrid?.length || 64;
    const gridCols = demGrid?.[0]?.length || 64;
    const geometry = new THREE.PlaneGeometry(60, 60, gridCols - 1, gridRows - 1);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.floor(i / gridCols);
      const c = i % gridCols;
      const elev = demGrid ? (demGrid[r]?.[c] ?? 0) : Math.sin(c * 0.2) * Math.cos(r * 0.2) * 5;
      pos.setZ(i, (elev / 255.0) * 12.0);
    }
    geometry.computeVertexNormals();

    // Material & Texture
    const material = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    terrainMeshRef.current = mesh;

    // Load texture if available
    const texLoader = new THREE.TextureLoader();
    const currentUrl = activeTexture === 'source' ? textureUrl : referenceTextureUrl;
    if (currentUrl) {
      texLoader.load(currentUrl, (tex) => {
        material.map = tex;
        material.needsUpdate = true;
      });
    }

    // 5. Basic Orbit Interaction
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotation = { x: -0.6, z: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      rotation.z += dx * 0.008;
      rotation.x = Math.max(-1.4, Math.min(0.2, rotation.x + dy * 0.008));
      mesh.rotation.z = rotation.z;
      mesh.rotation.x = rotation.x;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };
    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 6. Animation Loop
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
      geometry.dispose();
      material.dispose();
    };
  }, [demGrid]);

  // Update Sun Directional Lighting in Real Time
  useEffect(() => {
    if (!sunLightRef.current) return;
    const azRad = (sunAzimuth * Math.PI) / 180;
    const elRad = (sunElevation * Math.PI) / 180;

    const dist = 80;
    const x = dist * Math.sin(azRad) * Math.cos(elRad);
    const y = dist * Math.cos(azRad) * Math.cos(elRad);
    const z = dist * Math.sin(elRad);

    sunLightRef.current.position.set(x, y, z);
  }, [sunAzimuth, sunElevation]);

  // Update Texture Drape
  useEffect(() => {
    if (!terrainMeshRef.current) return;
    const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial;
    mat.wireframe = wireframe;
    const url = activeTexture === 'source' ? textureUrl : referenceTextureUrl;
    if (url) {
      new THREE.TextureLoader().load(url, (tex) => {
        mat.map = tex;
        mat.needsUpdate = true;
      });
    }
  }, [activeTexture, wireframe, textureUrl, referenceTextureUrl]);

  return (
    <div className="relative w-full h-full flex flex-col glass rounded-xl overflow-hidden border border-cyan-900/30">
      {/* 3D Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-black/50 border-b border-cyan-900/30 text-xs font-mono z-10">
        <div className="flex items-center gap-2 text-cyan-400">
          <Eye size={14} />
          <span className="font-bold tracking-wider">3D LUNAR TERRAIN DEM VIEWER</span>
        </div>

        {/* Texture Drape Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTexture('source')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTexture === 'source' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SOURCE DRAPE
          </button>
          <button
            onClick={() => setActiveTexture('reference')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTexture === 'reference' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            REFERENCE DRAPE
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-2 py-1 rounded transition-colors ${
              wireframe ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            WIREFRAME
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div ref={mountRef} className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden" />

      {/* Floating 3D Sun Position Control Gizmo */}
      <div className="absolute bottom-3 left-3 p-3 glass rounded-lg bg-black/70 border border-cyan-900/40 text-xs font-mono space-y-2 z-10 max-w-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
          <Sun size={13} />
          <span>SOLAR POSITION GIZMO</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Sun Azimuth:</span>
            <span className="text-cyan-300">{sunAzimuth}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={sunAzimuth}
            onChange={(e) => setSunAzimuth(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Solar Elevation:</span>
            <span className="text-cyan-300">{sunElevation}°</span>
          </div>
          <input
            type="range"
            min={5}
            max={85}
            value={sunElevation}
            onChange={(e) => setSunElevation(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <p className="text-[10px] text-slate-500 leading-tight pt-1 border-t border-cyan-900/30">
          Drag on terrain to rotate. Adjust sun sliders to test real-time shadow displacement on craters.
        </p>
      </div>
    </div>
  );
};
