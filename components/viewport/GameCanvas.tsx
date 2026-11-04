'use client';

import {
  Component,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Loader,
  OrbitControls,
  OrthographicCamera,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';

const TARGET_HEIGHT = 1.8;

// ── Lighting ─────────────────────────────────────────────────────────────────

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
      {/* Ambient #F8FAFC 0.75 */}
      <ambientLight color="#F8FAFC" intensity={0.75} />
      {/* Hemisphere sky #E0F2FE / ground #FEF3C7 0.45 */}
      <hemisphereLight args={['#E0F2FE', '#FEF3C7', 0.45]} />
      {/* Key directional — warm, casts shadows */}
      <directionalLight
        ref={lightRef}
        color="#FFFBEB"
        intensity={1.2}
        position={[15, 25, 10]}
        castShadow
      />
      {/* Cool fill from opposite side — no shadow */}
      <directionalLight color="#c8d8f0" intensity={0.4} position={[-6, 10, -6]} />
    </>
  );
}

// ── Room ──────────────────────────────────────────────────────────────────────

/** 8×8 hostel room: floor + tile grid + two back walls. Zero albedo textures. */
function RoomScene() {
  return (
    <group>
      {/* Floor — warm wood tone */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[8, 0.1, 8]} />
        <meshStandardMaterial color="#d6c3a5" />
      </mesh>

      {/* Tile grid overlay */}
      <gridHelper args={[8, 8, '#CEC7A8', '#CEC7A8']} position={[0, 0.001, 0]} />

      {/* Back wall (Z face) — soft off-white */}
      <mesh receiveShadow position={[0, 2.25, -4]}>
        <boxGeometry args={[8.1, 4.5, 0.1]} />
        <meshStandardMaterial color="#eef2f7" />
      </mesh>

      {/* Left wall (X face) — soft off-white */}
      <mesh receiveShadow position={[-4, 2.25, 0]}>
        <boxGeometry args={[0.1, 4.5, 8.1]} />
        <meshStandardMaterial color="#eef2f7" />
      </mesh>
    </group>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

/** Loads placeholder.glb, normalizes height, tints every mesh (zero-albedo invariant). */
function GlbAvatar() {
  const { scene } = useGLTF('/models/placeholder.glb');

  const tinted = useMemo(() => {
    const clone = scene.clone(true);

    // Normalize height to TARGET_HEIGHT with feet at y=0
    const bbox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    if (size.y > 0) {
      const scale = TARGET_HEIGHT / size.y;
      clone.scale.setScalar(scale);
      const bbox2 = new THREE.Box3().setFromObject(clone);
      clone.position.y = -bbox2.min.y;
    }

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 0,
        background: '#f8fafc',
      }}
    >
      <Canvas orthographic shadows dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
        <OrthographicCamera
          makeDefault
          position={[8, 8, 8]}
          zoom={80}
          near={0.1}
          far={1000}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 1, 0]}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(80 * Math.PI) / 180}
          minAzimuthAngle={-Math.PI / 7.2}
          maxAzimuthAngle={Math.PI / 7.2}
          minZoom={40}
          maxZoom={120}
          enableDamping
          dampingFactor={0.08}
        />
        <LightingRig />
        <RoomScene />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.4}
          scale={4}
          blur={2}
          far={2}
          resolution={256}
          color="#000000"
        />
        <AvatarBoundary fallback={<PrimitiveFallback />}>
          <Suspense fallback={<PrimitiveFallback />}>
            <GlbAvatar />
          </Suspense>
        </AvatarBoundary>
      </Canvas>
      <Loader />
    </div>
  );
}
