'use client';

import {
  Component,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ── Camera ───────────────────────────────────────────────────────────────────

/** Responsive OrthographicCamera per design-system §2.2. */
function IsoCamera() {
  const ref = useRef<THREE.OrthographicCamera>(null);
  const { size } = useThree();

  // Set initial position once — OrbitControls owns it after the first frame.
  useEffect(() => {
    const cam = ref.current;
    if (!cam) return;
    cam.position.set(20, 20, 20);
    cam.lookAt(0, 0, 0);
  }, []);

  // Update frustum on resize only (position is not touched here).
  useEffect(() => {
    const cam = ref.current;
    if (!cam) return;
    const aspect = size.width / size.height;
    const fs = aspect < 0.6 ? 16 : aspect <= 1.0 ? 13 : 10;
    cam.left = -(fs * aspect) / 2;
    cam.right = (fs * aspect) / 2;
    cam.top = fs / 2;
    cam.bottom = -fs / 2;
    cam.near = 0.1;
    cam.far = 1000;
    cam.updateProjectionMatrix();
  }, [size]);

  return <OrthographicCamera ref={ref} makeDefault />;
}

// ── Lighting ─────────────────────────────────────────────────────────────────

/** Lighting rig per design-system §2.3. */
function LightingRig() {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 100;
    const cam = light.shadow.camera as THREE.OrthographicCamera;
    cam.left = -20;
    cam.right = 20;
    cam.top = 20;
    cam.bottom = -20;
    cam.updateProjectionMatrix();
  }, []);

  return (
    <>
      {/* AmbientLight #F8FAFC 0.75 */}
      <ambientLight color="#F8FAFC" intensity={0.75} />
      {/* HemisphereLight sky #E0F2FE / ground #FEF3C7 0.45 */}
      <hemisphereLight args={['#E0F2FE', '#FEF3C7', 0.45]} />
      {/* DirectionalLight #FFFBEB 1.2 at (15,25,10) with 1024² soft shadows */}
      <directionalLight
        ref={lightRef}
        color="#FFFBEB"
        intensity={1.2}
        position={[15, 25, 10]}
        castShadow
      />
    </>
  );
}

// ── Room ──────────────────────────────────────────────────────────────────────

/** 8×8 hostel room: floor + tile grid + two back walls. Zero albedo textures. */
function RoomScene() {
  return (
    <group>
      {/* Floor base — warm cream tile */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[8, 0.1, 8]} />
        <meshStandardMaterial color="#EDE9D0" />
      </mesh>

      {/* Tile grid overlay — 1 unit per tile */}
      <gridHelper args={[8, 8, '#CEC7A8', '#CEC7A8']} position={[0, 0.001, 0]} />

      {/* Back wall — along Z face */}
      <mesh receiveShadow position={[0, 1.45, -4]}>
        <boxGeometry args={[8.1, 3, 0.1]} />
        <meshStandardMaterial color="#EAE6DC" />
      </mesh>

      {/* Side wall — along X face */}
      <mesh receiveShadow position={[-4, 1.45, 0]}>
        <boxGeometry args={[0.1, 3, 8.1]} />
        <meshStandardMaterial color="#E0DBD0" />
      </mesh>
    </group>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

/** Loads placeholder.glb and tints every mesh (zero-albedo texture invariant). */
function GlbAvatar() {
  const { scene } = useGLTF('/models/placeholder.glb');

  const tinted = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({ color: '#8d5524' });
        child.castShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => {
      tinted.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
          child.geometry.dispose();
        }
      });
    };
  }, [tinted]);

  return <primitive object={tinted} />;
}

/** Geometric fallback rendered while GLB loads or if loading fails. */
function PrimitiveFallback() {
  return (
    <group>
      <mesh castShadow position={[0, 0.875, 0]}>
        <capsuleGeometry args={[0.25, 0.9, 4, 8]} />
        <meshStandardMaterial color="#8d5524" />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#c68a62" />
      </mesh>
    </group>
  );
}

class AvatarBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[GameCanvas] avatar load error:', error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ── Canvas ────────────────────────────────────────────────────────────────────

export default function GameCanvas() {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}>
      <Canvas
        orthographic
        shadows
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <IsoCamera />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 0, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.08}
        />
        <LightingRig />
        <RoomScene />
        <AvatarBoundary fallback={<PrimitiveFallback />}>
          <Suspense fallback={<PrimitiveFallback />}>
            <GlbAvatar />
          </Suspense>
        </AvatarBoundary>
      </Canvas>
    </div>
  );
}
