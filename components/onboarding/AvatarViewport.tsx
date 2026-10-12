"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Box3, Vector3, type Group } from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Loader, useGLTF, useAnimations } from "@react-three/drei";

const MODEL_URL = "/models/placeholder.glb";

// Normalize the model to a known height so framing is correct regardless of the
// GLB's native scale, then frame the camera around that fixed height.
const TARGET_HEIGHT = 1.8;
const CAMERA_Y = TARGET_HEIGHT / 2; // 0.9 — mid-height of the normalized figure
const CAMERA_Z = 3.3;

// Preload so the asset starts fetching as soon as this chunk loads.
useGLTF.preload(MODEL_URL);

interface AvatarViewportProps {
  /**
   * Selected gender. Not used for model selection yet — both genders show the
   * same placeholder. Later each gender loads its own model (see Model below).
   */
  gender: "male" | "female";
}

function Model() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  // Scale + recenter so the character is TARGET_HEIGHT tall, horizontally
  // centered, with its feet on y=0 — independent of the GLB's native units.
  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return {
      scale: s,
      position: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number],
    };
  }, [scene]);

  // Play the first clip (e.g. an idle) if the model ships one; otherwise the
  // static pose is shown — a model with no animations must never error.
  useEffect(() => {
    const first = Object.values(actions)[0];
    first?.reset().play();
    return () => {
      first?.stop();
    };
  }, [actions]);

  // TASK-ONBOARD-look-2 (tinting stub): once real, tintable models exist, apply
  // the chosen appearance here by traversing `scene` and setting each
  // MeshStandardMaterial.color (skin/hair/top/bottom) per mesh name. The current
  // placeholder is NOT tintable, so no tinting is applied yet.

  return (
    <group ref={group} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

/**
 * Client-only 3D avatar viewport (TASK-ONBOARD-3). MUST be loaded via
 * `next/dynamic` with `{ ssr: false }` — R3F cannot server-render.
 */
export function AvatarViewport({ gender }: AvatarViewportProps) {
  // `gender` is accepted now so the caller's API is stable; model-per-gender
  // switching (/models/male.glb, /models/female.glb) arrives with real models.
  void gender;

  return (
    <>
      <Canvas dpr={[1, 2]} camera={{ position: [0, CAMERA_Y, CAMERA_Z], fov: 35 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <Model />
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={6} blur={2.4} far={4} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          enableDamping
          // Lock vertical tilt: only horizontal (azimuthal) spin, like the reference.
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          target={[0, CAMERA_Y, 0]}
        />
      </Canvas>
      {/*
        drei's <Loader /> is a useProgress-driven DOM overlay rendered OUTSIDE the
        Canvas. Unlike an <Html> suspense fallback, it manages its own mount/unmount
        timeline, so it never synchronously tears down a React root mid-render.
      */}
      <Loader
        containerStyles={{ background: "rgba(238, 242, 247, 0.9)" }}
        barStyles={{ background: "#eab308" }}
        dataStyles={{ color: "#0f172a", fontSize: "0.75rem" }}
      />
    </>
  );
}
