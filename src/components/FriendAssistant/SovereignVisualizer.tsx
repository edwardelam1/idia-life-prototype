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

    // --- NATIVE SPATIAL HARVEST ---
    const rootStyle = getComputedStyle(document.documentElement);
    const nativePitch = parseFloat(rootStyle.getPropertyValue('--pitch')) || 0;
    const nativeRoll = parseFloat(rootStyle.getPropertyValue('--roll')) || 0;

    // Camera tilts to follow device orientation
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, nativeRoll * 4, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, nativePitch * 4, 0.08);
    camera.lookAt(0, 0, 0);

    particles.forEach((p, i) => {
      const isIdle = state === 'idle';
      
      // 1. FLUID GRAVITY & LAVA LAMP PHYSICS
      // Base Radius collapses into a solid ball (1.7) when idle
      const baseRadius = isIdle ? 1.7 : 2.4;
      
      // Energy = AI activity + Physical Motion slosh
      const motionSlosh = (Math.abs(nativePitch) + Math.abs(nativeRoll)) * 0.4;
      const aiEnergy = isIdle ? 0.02 : (state === 'speaking' ? 0.9 : 0.4);
      const totalEnergy = aiEnergy + motionSlosh;

      // 2. ASYMMETRIC OCEAN WAVES (Sum of Sines)
      const wave = Math.sin(p.phi * 2.5 + time * p.speed + nativePitch) * 0.35 +
                   Math.cos(p.theta * 2 - time * 0.5 + nativeRoll) * 0.2;
      
      const r = baseRadius + (wave * totalEnergy);

      // 3. POURING LOGIC: Flowing from right (x=15) to target sphere position
      let targetX = Math.cos(p.theta) * Math.sin(p.phi) * r;
      let targetY = Math.sin(p.theta) * Math.sin(p.phi) * r;
      let targetZ = Math.cos(p.phi) * r;

      if (state === 'listening') {
        // Individualized staggered entry for "pouring" feel
        const stagger = (i / count) * 2;
        const pourTrigger = Math.max(0, Math.min(1, (time % 4) - stagger));
        targetX = THREE.MathUtils.lerp(15, targetX, pourTrigger);
      }

      // 4. PIXELATED JITTER: Only when speaking
      if (state === 'speaking') {
        const jitter = Math.sin(time * 40 + i) * 0.08;
        targetX += jitter; targetY += jitter; targetZ += jitter;
      }

      dummy.position.set(targetX, targetY, targetZ);
      
      // 5. SCALE DYNAMICS: Small/Tight (Solid) vs Larger Chunks (Pixelated)
      const s = isIdle && motionSlosh < 0.1 ? 0.055 : (state === 'speaking' ? 0.16 : 0.1);
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