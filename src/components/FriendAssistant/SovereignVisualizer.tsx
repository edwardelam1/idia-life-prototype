import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

const CubeSphere = ({ state, severity = 'normal' }: { state: FriendState, severity?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * Math.acos(-1 + (2 * i) / count),
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.4,
        id: i
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
  const { clock, camera } = stateContext;
  const time = clock.getElapsedTime();
  if (!meshRef.current) return;

  // HARVEST NATIVE MOTION
  const rootStyle = getComputedStyle(document.documentElement);
  const pitch = parseFloat(rootStyle.getPropertyValue('--pitch')) || 0;
  const roll = parseFloat(rootStyle.getPropertyValue('--roll')) || 0;

  // Vector of the tilt (The direction the "liquid" wants to fall)
  const tiltX = roll * 2.2;
  const tiltY = -pitch * 2.2;

  particles.forEach((p, i) => {
    // 1. THE GRAVITATIONAL CORE
    const isIdle = state === 'idle';
    const targetRadius = isIdle ? 1.7 : 2.5;

    // 2. THE SLOSH PHYSICS (Fluid Displacement)
    // We calculate how much this specific cube aligns with the tilt direction
    const cubeDirX = Math.cos(p.theta) * Math.sin(p.phi);
    const cubeDirY = Math.sin(p.theta) * Math.sin(p.phi);
    
    // Dot product: High if the cube is on the "bottom" of the tilt
    const alignment = (cubeDirX * tiltX) + (cubeDirY * tiltY);
    const gravitySlosh = Math.max(0, alignment * 1.2); 

    // 3. LAVA LAMP ENTROPY (Noise)
    const energy = isIdle ? 0.05 : (state === 'speaking' ? 0.8 : 0.4);
    const noise = Math.sin(p.phi * 3 + time * p.speed + p.phase) * energy;
    
    // Final Radius = Core + Gravity Displacement + Fluid Noise
    const dynamicR = targetRadius + gravitySlosh + noise;

    let x = Math.cos(p.theta) * Math.sin(p.phi) * dynamicR;
    let y = Math.sin(p.theta) * Math.sin(p.phi) * dynamicR;
    let z = Math.cos(p.phi) * dynamicR;

    // 4. KINETIC INERTIA (Weighted sag)
    // Manually shift the whole coordinate toward the tilt for "heavy" fluid look
    x += (roll * 0.4);
    y -= (pitch * 0.4);

    // 5. PIXELATED JITTER
    if (state === 'speaking') {
      const jitter = Math.sin(time * 50 + i) * 0.1;
      x += jitter; y += jitter; z += jitter;
    }

    dummy.position.set(x, y, z);
    
    // Solid look (Idle) vs Loose Chunks (Active)
    const s = isIdle && Math.abs(alignment) < 0.1 ? 0.055 : 0.12;
    dummy.scale.set(s, s, s);
    
    dummy.rotation.set(time * 0.1, time * 0.2 + p.phase, 0);
    dummy.updateMatrix();
    meshRef.current!.setMatrixAt(i, dummy.matrix);
  });

  meshRef.current.instanceMatrix.needsUpdate = true;
});

  const color = severity === 'critical' ? '#ef4444' : (severity === 'important' ? '#f59e0b' : '#14b8a6');

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={state === 'speaking' ? 1.8 : 0.7} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: { state: FriendState, severity?: string }) => (
  <div className="w-full h-full absolute inset-0 bg-black overflow-hidden pointer-events-none">
    <Canvas camera={{ position: [0, 0, 10], fov: 38 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <CubeSphere state={state} severity={severity} />
    </Canvas>
  </div>
);

export default SovereignVisualizer;