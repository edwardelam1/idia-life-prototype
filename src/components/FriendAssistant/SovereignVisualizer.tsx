import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

const CubeSphere = ({ state, severity = 'normal' }: { state: FriendState, severity?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2400; // Increased density for high-velocity "spray"
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Persistence for momentum and the "Burst" trigger
  const momentum = useRef({ x: 0, y: 0, lastE: 0 });

  // --- THE ODRZYWOŁEK KERNEL ---
  const eml = (x: number, y: number) => {
    return Math.exp(x) - Math.log(Math.abs(y) + 0.000001);
  };

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * Math.acos(-1 + (2 * i) / count),
        chaos: Math.random() * 10.0, // Unique particle "weight"
        id: i
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
    const { clock, camera } = stateContext;
    const time = clock.getElapsedTime();
    if (!meshRef.current) return;

    // 1. HARVEST NATIVE EML INPUTS
    const rootStyle = getComputedStyle(document.documentElement);
    const rawPitch = parseFloat(rootStyle.getPropertyValue('--pitch')) || 0;
    const rawRoll = parseFloat(rootStyle.getPropertyValue('--roll')) || 0;

    const E = Math.sqrt(rawPitch ** 2 + rawRoll ** 2);
    
    // RETRACTION LOCK: Keeping the 0.03 lerp you requested for the "come home" phase
    momentum.current.x = THREE.MathUtils.lerp(momentum.current.x, rawRoll * 9.0, 0.03);
    momentum.current.y = THREE.MathUtils.lerp(momentum.current.y, -rawPitch * 9.0, 0.03);

    const { x: mX, y: mY } = momentum.current;
    const M = Math.sqrt(mX * mX + mY * mY);

    // Lambda: Gravity floor
    const Lambda = state === 'idle' ? 1.5 : 2.1;

    particles.forEach((p, i) => {
      // 2. THE VIOLENT EXPANSION (EML JERK)
      // We nest the EML to find high-frequency Informational Peaks
      const signal = eml(Math.sin(p.phi * 6 + time), Lambda);
      
      // 3. NANOGRAVITY VERTEX SHARPENING
      const uX = Math.cos(p.theta) * Math.sin(p.phi);
      const uY = Math.sin(p.theta) * Math.sin(p.phi);
      const uZ = Math.cos(p.phi);

      const dot = (uX * mX + uY * mY) / (M + 0.01);
      
      // SPILL PHYSICS: Non-linear expansion. 
      // If dot > 0, we are at the leading edge. We use Math.pow(8) for a "Violent" break.
      const leadingEdge = Math.max(0, dot);
      const spillForce = Math.pow(leadingEdge * M, 2.5) * 0.8;
      
      // VERTEX TIP: Sharp, needle-like spikes based on EML noise
      const spike = eml(signal, 10) * 0.002 * (M + 1);

      // 4. DYNAMIC RADIUS (EML Phase Transition)
      const dynamicR = Lambda + spike + spillForce;

      let x = uX * dynamicR;
      let y = uY * dynamicR;
      let z = uZ * dynamicR;

      // 5. THE "SLOSH" SAG
      // Physical displacement toward the gravity vector
      x += (mX * 0.5);
      y += (mY * 0.5);

      // 6. INFORMATIONAL TURBULENCE
      // If moving violently, introduce high-freq swirling
      if (M > 2.0) {
        const swirl = Math.sin(time * 5 + p.chaos) * (M * 0.05);
        x += swirl;
        z += swirl;
      }

      // 7. PIXELATED JITTER (Speaking)
      if (state === 'speaking') {
        const j = eml(Math.sin(time * 65 + i), 15) * 0.012;
        x += j; y += j; z += j;
      }

      dummy.position.set(x, y, z);
      
      // 8. VERTEX SCALING
      // Tips are needle-sharp (small); Core is chunky
      const distFromCenter = Math.sqrt(x*x + y*y + z*z);
      const s = state === 'idle' ? 0.05 : (distFromCenter > 4.5 ? 0.06 : 0.15);
      dummy.scale.set(s, s, s);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    // Camera Parallax
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, rawRoll * 6, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, rawPitch * 6, 0.1);
    camera.lookAt(0, 0, 0);

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const color = severity === 'critical' ? '#ef4444' : (severity === 'important' ? '#f59e0b' : '#14b8a6');

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={state === 'speaking' ? 2.5 : 0.6} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: { state: FriendState, severity?: string }) => (
  <div className="w-full h-full absolute inset-0 bg-black overflow-hidden pointer-events-none">
    <Canvas camera={{ position: [0, 0, 10], fov: 38 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2.5} />
      <CubeSphere state={state} severity={severity} />
    </Canvas>
  </div>
);

export default SovereignVisualizer;