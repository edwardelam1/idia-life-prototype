import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

const CubeSphere = ({ state, severity = 'normal' }: { state: FriendState, severity?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2200; // Increased density for sharper vertices
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Persistent Momentum Buffer
  const momentum = useRef({ x: 0, y: 0, energy: 0 });

  // --- THE ODRZYWOŁEK KERNEL ---
  // eml(x, y) = e^x - ln(y)
  const eml = (x: number, y: number) => {
    return Math.exp(x) - Math.log(Math.abs(y) + 0.000001);
  };

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * Math.acos(-1 + (2 * i) / count),
        seed: Math.random() * Math.PI,
        id: i
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
    const { clock, camera } = stateContext;
    const time = clock.getElapsedTime();
    if (!meshRef.current) return;

    // 1. HARVEST NATIVE EML INPUTS (Swift Shell)
    const rootStyle = getComputedStyle(document.documentElement);
    const rawPitch = parseFloat(rootStyle.getPropertyValue('--pitch')) || 0;
    const rawRoll = parseFloat(rootStyle.getPropertyValue('--roll')) || 0;

    // E (Energy): Current Kinetic Impulse
    const currentE = Math.sqrt(rawPitch ** 2 + rawRoll ** 2);
    
    // M (Momentum): Heavy Lag for "Delayed Return" slosh
    // We use a very low alpha (0.03) to allow the "tips" to stay elongated
    momentum.current.x = THREE.MathUtils.lerp(momentum.current.x, rawRoll * 8.0, 0.03);
    momentum.current.y = THREE.MathUtils.lerp(momentum.current.y, -rawPitch * 8.0, 0.03);
    momentum.current.energy = THREE.MathUtils.lerp(momentum.current.energy, currentE, 0.05);

    const { x: mX, y: mY, energy: mE } = momentum.current;
    const totalMomentum = Math.sqrt(mX * mX + mY * mY);

    // L (Lambda): Core Gravitational Floor
    const Lambda = state === 'idle' ? 1.5 : 2.0;

    particles.forEach((p, i) => {
      // 2. RECURSIVE EML HARMONICS
      // We nest the EML operator to generate non-linear informational peaks
      const harmonicA = eml(Math.sin(p.phi * 4 + time), Lambda);
      const harmonicB = eml(Math.cos(p.theta * 3 - time), mE + 0.5);
      
      // The Phase Transition Signal
      const signal = eml(harmonicA, harmonicB) * 0.0005;

      // 3. RELAXED SPATIAL DISPLACEMENT
      const uX = Math.cos(p.theta) * Math.sin(p.phi);
      const uY = Math.sin(p.theta) * Math.sin(p.phi);
      const uZ = Math.cos(p.phi);

      // 4. THE SHARP TIP (Directional Elongation)
      // We project the particle onto the Momentum vector. 
      // If it aligns, we multiply the EML spike exponentially.
      const dot = (uX * mX + uY * mY) / (totalMomentum + 0.01);
      const tipIntensity = Math.pow(Math.max(0, dot), 3) * totalMomentum;
      
      // The spike happens when the signal and tipIntensity reach a local maximum
      const spike = (signal * 5.0) + (tipIntensity * 1.2);
      
      // Radius calculation: Gravity (Lambda) + EML spikes
      const dynamicR = Lambda + spike;

      let x = uX * dynamicR;
      let y = uY * dynamicR;
      let z = uZ * dynamicR;

      // 5. GLOBAL SLOSH (Informational Sag)
      // The entire mass physically displaces toward the gravity vector
      x += (mX * 0.4);
      y += (mY * 0.4);

      // 6. NANOGRAVITY VORTICITY (The "Twist")
      if (totalMomentum > 1.5) {
        const swirl = eml(Math.sin(time * 2 + p.id), 5) * 0.02;
        x += Math.cos(time + p.phi) * swirl;
        z += Math.sin(time + p.phi) * swirl;
      }

      // 7. PIXELATED JITTER (Speaking State)
      if (state === 'speaking') {
        const j = eml(Math.sin(time * 60 + i), 12) * 0.015;
        x += j; y += j; z += j;
      }

      dummy.position.set(x, y, z);
      
      // 8. DYNAMIC SCALE (Sharp vs Dense)
      // Tips (high dot) get smaller/sharper; Core mass stays chunky
      const s = state === 'idle' ? 0.055 : (dot > 0.8 ? 0.07 : 0.14);
      dummy.scale.set(s, s, s);
      
      dummy.rotation.set(time * 0.1, time * 0.2 + p.seed, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    // 9. SPATIAL PARALLAX (Camera Sync)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, rawRoll * 5, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, rawPitch * 5, 0.1);
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
        emissiveIntensity={state === 'speaking' ? 2.2 : 0.6} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: { state: FriendState, severity?: string }) => (
  <div className="w-full h-full absolute inset-0 bg-black overflow-hidden pointer-events-none">
    <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2.5} />
      <CubeSphere state={state} severity={severity} />
    </Canvas>
  </div>
);

export default SovereignVisualizer;