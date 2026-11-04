'use client';

function BunkBed() {
  const frame = '#64748b';
  const mattress = '#e2e8f0';
  const pillow = '#eab308';
  const postH = 1.9;
  const postY = postH / 2;
  const halfX = 0.46;
  const halfZ = 1.05;

  return (
    <group position={[-3.0, 0, -1.3]}>
      {/* 4 vertical posts */}
      <mesh castShadow position={[-halfX, postY, -halfZ]}>
        <boxGeometry args={[0.08, postH, 0.08]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh castShadow position={[halfX, postY, -halfZ]}>
        <boxGeometry args={[0.08, postH, 0.08]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh castShadow position={[-halfX, postY, halfZ]}>
        <boxGeometry args={[0.08, postH, 0.08]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh castShadow position={[halfX, postY, halfZ]}>
        <boxGeometry args={[0.08, postH, 0.08]} />
        <meshStandardMaterial color={frame} />
      </mesh>

      {/* Lower mattress */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.0, 0.12, 2.2]} />
        <meshStandardMaterial color={mattress} />
      </mesh>
      {/* Lower pillow at head (-z end) */}
      <mesh position={[0, 0.57, -0.9]}>
        <boxGeometry args={[0.55, 0.1, 0.3]} />
        <meshStandardMaterial color={pillow} />
      </mesh>

      {/* Upper mattress */}
      <mesh castShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[1.0, 0.12, 2.2]} />
        <meshStandardMaterial color={mattress} />
      </mesh>
      {/* Upper pillow */}
      <mesh position={[0, 1.47, -0.9]}>
        <boxGeometry args={[0.55, 0.1, 0.3]} />
        <meshStandardMaterial color={pillow} />
      </mesh>
    </group>
  );
}

function Wardrobe() {
  const wood = '#b08d57';
  const hardware = '#334155';
  return (
    <group position={[2.4, 0, -3.5]}>
      {/* Body */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[1.2, 2.2, 0.6]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* Vertical center seam */}
      <mesh position={[0, 1.1, 0.305]}>
        <boxGeometry args={[0.02, 2.0, 0.02]} />
        <meshStandardMaterial color={hardware} />
      </mesh>
      {/* Left handle */}
      <mesh position={[-0.12, 1.1, 0.33]}>
        <boxGeometry args={[0.06, 0.14, 0.03]} />
        <meshStandardMaterial color={hardware} />
      </mesh>
      {/* Right handle */}
      <mesh position={[0.12, 1.1, 0.33]}>
        <boxGeometry args={[0.06, 0.14, 0.03]} />
        <meshStandardMaterial color={hardware} />
      </mesh>
    </group>
  );
}

function Desk() {
  const wood = '#b08d57';
  const legs = '#8a6d3b';
  const legH = 0.71;
  const legY = legH / 2;
  return (
    <group position={[-0.6, 0, -3.5]}>
      {/* Tabletop */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.7]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* 4 legs */}
      <mesh position={[-0.75, legY, -0.3]}>
        <boxGeometry args={[0.07, legH, 0.07]} />
        <meshStandardMaterial color={legs} />
      </mesh>
      <mesh position={[0.75, legY, -0.3]}>
        <boxGeometry args={[0.07, legH, 0.07]} />
        <meshStandardMaterial color={legs} />
      </mesh>
      <mesh position={[-0.75, legY, 0.3]}>
        <boxGeometry args={[0.07, legH, 0.07]} />
        <meshStandardMaterial color={legs} />
      </mesh>
      <mesh position={[0.75, legY, 0.3]}>
        <boxGeometry args={[0.07, legH, 0.07]} />
        <meshStandardMaterial color={legs} />
      </mesh>
    </group>
  );
}

function Chair() {
  const c = '#8a6d3b';
  const legH = 0.42;
  const legY = legH / 2;
  return (
    <group position={[-0.6, 0, -2.6]}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={c} />
      </mesh>
      {/* 4 legs */}
      <mesh position={[-0.22, legY, -0.22]}>
        <boxGeometry args={[0.05, legH, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[0.22, legY, -0.22]}>
        <boxGeometry args={[0.05, legH, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[-0.22, legY, 0.22]}>
        <boxGeometry args={[0.05, legH, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[0.22, legY, 0.22]}>
        <boxGeometry args={[0.05, legH, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
      {/* Backrest — on +z side (chair faces -z toward desk) */}
      <mesh position={[0, 0.75, 0.23]}>
        <boxGeometry args={[0.5, 0.55, 0.05]} />
        <meshStandardMaterial color={c} />
      </mesh>
    </group>
  );
}

function Cooler() {
  return (
    <group position={[1.2, 0, -2.6]}>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Lid */}
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.52, 0.05, 0.42]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
    </group>
  );
}

function Bucket() {
  return (
    <group position={[2.9, 0, 0.6]}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.32, 0.28, 0.45, 20, 1, true]} />
        <meshStandardMaterial color="#0ea5e9" />
      </mesh>
    </group>
  );
}

function WallSocket() {
  return (
    <group position={[1.0, 1.2, -3.94]}>
      {/* Faceplate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.03]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      {/* Slots */}
      <mesh position={[-0.035, 0, 0.018]}>
        <boxGeometry args={[0.018, 0.045, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.035, 0, 0.018]}>
        <boxGeometry args={[0.018, 0.045, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

function Plate() {
  return (
    <group position={[-1.0, 0.80, -3.45]}>
      {/* Plate base */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 20]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {/* Raised rim (smaller-radius disc on top) */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.015, 20]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

function Toothbrush() {
  return (
    <group position={[-0.1, 0.80, -3.4]} rotation={[0, 0.35, 0]}>
      {/* Handle */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.16, 0.02, 0.02]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>
      {/* Bristles */}
      <mesh position={[0.085, 0.02, 0]}>
        <boxGeometry args={[0.03, 0.022, 0.025]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

export default function RoomFurniture() {
  return (
    <group>
      <BunkBed />
      <Wardrobe />
      <Desk />
      <Chair />
      <Cooler />
      <Bucket />
      <WallSocket />
      <Plate />
      <Toothbrush />
    </group>
  );
}
