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
  const count = 1500;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const getOrbColor = () => {
    if (severity === 'critical') return '#ef4444';
    if (severity === 'important') return '#f59e0b';
    return '#14b8a6'; 
  };

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100,
        speed: 0.01 + Math.random() / 100,
        radiusOffset: Math.random() * 0.2,
      });
    }
    return temp;
  }, [count]);

  useFrame((stateContext) => {
    const { clock, mouse, camera } = stateContext;
    const time = clock.getElapsedTime();
    if (!meshRef.current) return;

    // === LEVEL 3 PARALLAX: CAMERA TILT ===
    // This moves the camera slightly based on mouse position (-1 to 1)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 1.5, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 1.5, 0.05);
    camera.lookAt(0, 0, 0);

    particles.forEach((particle, i) => {
      let { t, speed, radiusOffset } = particle;
      particle.t += speed;

      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 2 + radiusOffset;

      let tx = Math.cos(theta) * Math.sin(phi) * radius;
      let ty = Math.sin(theta) * Math.sin(phi) * radius;
      let tz = Math.cos(phi) * radius;

      // FLOWING LOGIC (Only triggers if state is 'listening')
      if (state === 'listening') {
        const flowTrigger = (Math.sin(particle.t * 0.5) + 1) / 2; 
        tx = THREE.MathUtils.lerp(15, tx, flowTrigger);
      }

      // JITTER LOGIC (Only triggers if state is 'speaking')
      if (state === 'speaking') {
        const jitter = Math.sin(time * 20 + i) * 0.3;
        tx += jitter; ty += jitter; tz += jitter;
      }

      dummy.position.set(tx, ty, tz);
      const s = state === 'speaking' ? 0.18 : 0.08;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(particle.t * 0.5, particle.t * 0.5, particle.t * 0.5);
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
    <div className="w-full h-full absolute inset-0 bg-black cursor-none">
      <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <CubeSphere state={state} severity={severity} />
      </Canvas>
    </div>
  );
};

export default SovereignVisualizer;