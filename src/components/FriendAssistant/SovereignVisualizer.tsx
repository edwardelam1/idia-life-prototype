import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FriendState } from './types';

const CubeSphere = ({ state, severity = 'normal' }: { state: FriendState, severity?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 2000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const smoothedTilt = useRef({ x: 0, y: 0 });

  // --- THE ODRZYWOŁEK KERNEL ---
  // eml(x, y) = e^x - ln(y)
  // acts as the continuous NAND gate for the system
  const eml = (x: number, y: number) => {
    // Epsilon guard to prevent informational singularities at y <= 0
    return Math.exp(x) - Math.log(Math.abs(y) + 0.0000001);
  };

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * Math.acos(-1 + (2 * i) / count),
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

    // E (Energy): Kinetic input | L (Lambda): Core density
    const E = Math.sqrt(rawPitch ** 2 + rawRoll ** 2);
    const L = state === 'idle' ? 1.0 : 2.1;

    // M (Momentum): Lagged slosh vector
    smoothedTilt.current.x = THREE.MathUtils.lerp(smoothedTilt.current.x, rawRoll * 5, 0.05);
    smoothedTilt.current.y = THREE.MathUtils.lerp(smoothedTilt.current.y, -rawPitch * 5, 0.05);
    const M = Math.sqrt(smoothedTilt.current.x ** 2 + smoothedTilt.current.y ** 2);

    particles.forEach((p, i) => {
      // 2. GENERATE PHASES VIA EML NESTING
      // We synthesize a complex wave field using the universal operator
      // instead of standard Math.sin/cos.
      const signalA = eml(Math.sin(p.phi * 3 + time), L);
      const signalB = eml(Math.cos(p.theta * 2 - time), E + 0.1);
      
      // THE NANOGRAVITY OPERATOR:
      // We nest the signals to find the informational "tips" (vertices)
      const potential = eml(signalA, signalB) * 0.001; 
      
      // 3. SPATIAL DISPLACEMENT
      // Lambda acts as our gravitational floor
      const dynamicR = L + (potential * (E * M + 0.5));

      const uX = Math.cos(p.theta) * Math.sin(p.phi);
      const uY = Math.sin(p.theta) * Math.sin(p.phi);
      const uZ = Math.cos(p.phi);

      let x = uX * dynamicR;
      let y = uY * dynamicR;
      let z = uZ * dynamicR;

      // 4. MOMENTUM SLOSH (The Wave)
      // The EML-driven tips align with the physical momentum vector
      const dot = (uX * smoothedTilt.current.x + uY * smoothedTilt.current.y) / (M + 0.01);
      const slosh = eml(dot, L) * 0.1;
      
      x += (smoothedTilt.current.x * 0.5) + (uX * slosh);
      y += (smoothedTilt.current.y * 0.5) + (uY * slosh);

      // 5. PIXELATED JITTER
      if (state === 'speaking') {
        const jitter = eml(Math.sin(time * 50 + i), 10) * 0.01;
        x += jitter; y += jitter; z += jitter;
      }

      dummy.position.set(x, y, z);
      
      // SCALE: EML-driven tips sharpen (get smaller)
      const s = state === 'idle' ? 0.06 : (potential > 1.5 ? 0.08 : 0.14);
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
        emissiveIntensity={state === 'speaking' ? 2.0 : 0.7} 
        toneMapped={false} 
      />
    </instancedMesh>
  );
};

const SovereignVisualizer = ({ state, severity }: { state: FriendState, severity?: string }) => (
  <div className="w-full h-full absolute inset-0 bg-black overflow-hidden pointer-events-none">
    <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <CubeSphere state={state} severity={severity} />
    </Canvas>
  </div>
);

export default SovereignVisualizer;