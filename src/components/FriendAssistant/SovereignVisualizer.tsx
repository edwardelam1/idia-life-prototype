import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

const CubeSphere = ({ state, severity = 'normal' }: { state: FriendState, severity?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Persistence ref to track "Momentum" and "Delayed Return"
  const smoothedTilt = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * Math.acos(-1 + (2 * i) / count),
        phase: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.3, // Slowed down for fluid feel
        driftOffset: Math.random() * 2.0
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
    const { clock, camera } = stateContext;
    const time = clock.getElapsedTime();
    if (!meshRef.current) return;

    // 1. HARVEST & LAG NATIVE MOTION
    const rootStyle = getComputedStyle(document.documentElement);
    const rawPitch = parseFloat(rootStyle.getPropertyValue('--pitch')) || 0;
    const rawRoll = parseFloat(rootStyle.getPropertyValue('--roll')) || 0;

    // DEIA PROTOCOL: We apply a heavy lerp (0.04) to create "Delayed Return"
    // This makes the cubes slosh and STAY there for a moment before coming home.
    smoothedTilt.current.x = THREE.MathUtils.lerp(smoothedTilt.current.x, rawRoll * 6.0, 0.04);
    smoothedTilt.current.y = THREE.MathUtils.lerp(smoothedTilt.current.y, -rawPitch * 6.0, 0.04);

    const tiltX = smoothedTilt.current.x;
    const tiltY = smoothedTilt.current.y;

    particles.forEach((p, i) => {
      const isIdle = state === 'idle';
      
      // 2. RELAXED GRAVITATIONAL CORE
      // targetRadius is our "Return to Center" point.
      const targetRadius = isIdle ? 1.6 : 2.4;

      // 3. EXPANDED SLOSH PHYSICS (High-Give Fluid)
      const cubeDirX = Math.cos(p.theta) * Math.sin(p.phi);
      const cubeDirY = Math.sin(p.theta) * Math.sin(p.phi);
      
      // Dot product for direction-based expansion
      const alignment = (cubeDirX * tiltX) + (cubeDirY * tiltY);
      
      // RELAXED CONSTRAINT: Increased multiplier (from 1.2 to 4.5) 
      // This allows the cubes to escape the "ball" look and become organic blobs.
      const gravitySlosh = Math.max(-0.5, alignment * 4.5); 

      // 4. LAVA LAMP TURBULENCE (Delayed Return Noise)
      const energy = isIdle ? 0.08 : (state === 'speaking' ? 1.2 : 0.6);
      const noise = Math.sin(p.phi * 2 + time * p.speed + p.phase) * energy;
      
      // 5. THE "DRIFT" (Delayed recovery)
      // Adds a rhythmic pulse that keeps them from settling too quickly.
      const drift = Math.sin(time * 0.3 + p.driftOffset) * (alignment * 0.5);

      const dynamicR = targetRadius + gravitySlosh + noise + drift;

      let x = Math.cos(p.theta) * Math.sin(p.phi) * dynamicR;
      let y = Math.sin(p.theta) * Math.sin(p.phi) * dynamicR;
      let z = Math.cos(p.phi) * dynamicR;

      // 6. MASSIVE SAG (Spatial Weight)
      // This physically pulls the entire cloud in the direction of the tilt.
      x += (tiltX * 0.3);
      y += (tiltY * 0.3);

      // 7. PIXELATED JITTER (Active State only)
      if (state === 'speaking') {
        const jitter = Math.sin(time * 60 + i) * 0.12;
        x += jitter; y += jitter; z += jitter;
      }

      dummy.position.set(x, y, z);
      
      // Dynamic Scaling based on distance from core (Oil drops merging)
      const distFromCenter = Math.sqrt(x*x + y*y + z*z);
      const s = isIdle ? 0.05 : (distFromCenter > 3.0 ? 0.16 : 0.1);
      dummy.scale.set(s, s, s);
      
      dummy.rotation.set(time * 0.05, time * 0.1 + p.phase, 0);
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
        emissiveIntensity={state === 'speaking' ? 2.0 : 0.8} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: { state: FriendState, severity?: string }) => (
  <div className="w-full h-full absolute inset-0 bg-black overflow-hidden pointer-events-none">
    <Canvas camera={{ position: [0, 0, 10], fov: 42 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <CubeSphere state={state} severity={severity} />
    </Canvas>
  </div>
);

export default SovereignVisualizer;