import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

interface OrbProps {
  state: FriendState;
  severity?: 'normal' | 'important' | 'critical';
}

const CubeSphere = ({ state, severity = 'normal' }: OrbProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 1500; // Increased density for a more "solid" feel
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Determine Material Color based on IDIA Life Logo / Severity
  const getOrbColor = () => {
    if (severity === 'critical') return '#ef4444'; // Red
    if (severity === 'important') return '#f59e0b'; // Yellow
    return '#14b8a6'; // IDIA Life Teal
  };

  // Pre-calculate particle properties
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100,
        speed: 0.01 + Math.random() / 100,
        radiusOffset: Math.random() * 0.2, // Adds depth to the sphere surface
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
    const time = stateContext.clock.getElapsedTime();
    if (!meshRef.current) return;

    particles.forEach((particle, i) => {
      let { t, speed, radiusOffset } = particle;
      particle.t += speed;

      // --- SPHERE GEOMETRY ---
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 2 + radiusOffset;

      // Base spherical coordinates
      let tx = Math.cos(theta) * Math.sin(phi) * radius;
      let ty = Math.sin(theta) * Math.sin(phi) * radius;
      let tz = Math.cos(phi) * radius;

      // --- STATE 1: POURING FROM RIGHT (Listening) ---
      if (state === 'listening') {
        // Cubes flow from x: 15 towards their target sphere position
        const flowTrigger = (Math.sin(t * 0.5) + 1) / 2; 
        tx = THREE.MathUtils.lerp(15, tx, flowTrigger);
      }

      // --- STATE 2: PIXELATED JITTER (Speaking) ---
      if (state === 'speaking') {
        const jitter = Math.sin(time * 20 + i) * 0.3;
        tx += jitter;
        ty += jitter;
        tz += jitter;
      }

      // --- STATE 3: SOLID (Idle/Thinking) ---
      // No modifiers - tx, ty, tz remain stable

      dummy.position.set(tx, ty, tz);

      // Scaling logic: Pixelated look while speaking
      const s = state === 'speaking' ? 0.18 : 0.08;
      dummy.scale.set(s, s, s);

      dummy.rotation.set(t * 0.5, t * 0.5, t * 0.5);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={getOrbColor()} 
        emissive={getOrbColor()} 
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: OrbProps) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <CubeSphere state={state} severity={severity} />
      </Canvas>
    </div>
  );
};

export default SovereignVisualizer;