import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const MODEL_PATH = '/agents/gm.gltf';

const ANIMATION_CYCLE = ['idle', 'walk', 'happy', 'standing_jump', 'jump_run'];

interface AgentModelProps {
  isActive: boolean;
}

function AgentModel({ isActive }: AgentModelProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { camera } = useThree();
  const indexRef = useRef(0);
  const framedRef = useRef(false);

  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  // Auto-frame camera to fit the full model
  useEffect(() => {
    if (framedRef.current) return;
    const box = new THREE.Box3().setFromObject(group.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const dist = maxDim / (2 * Math.tan(fov / 2)) * 1.15;
    camera.position.set(0, center.y, dist);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    framedRef.current = true;
  }, [camera, clonedScene]);

  // Play animations in sequence
  useEffect(() => {
    if (!mixer || Object.keys(actions).length === 0) return;

    const playNext = () => {
      const animName = ANIMATION_CYCLE[indexRef.current % ANIMATION_CYCLE.length];
      const action = actions[animName];
      if (!action) {
        indexRef.current = (indexRef.current + 1) % ANIMATION_CYCLE.length;
        playNext();
        return;
      }
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.fadeIn(0.4).play();
    };

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      e.action.fadeOut(0.4);
      indexRef.current = (indexRef.current + 1) % ANIMATION_CYCLE.length;
      playNext();
    };

    mixer.addEventListener('finished', onFinished);
    playNext();

    return () => {
      mixer.removeEventListener('finished', onFinished);
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, mixer]);

  // Speed up animation when active (agent is processing)
  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta * (isActive ? 1.5 : 1));
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

interface AgentOrbProps {
  color: string;
  isActive: boolean;
  agentName: string;
}

export const AgentOrb: React.FC<AgentOrbProps> = ({ color, isActive, agentName }) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div
            className="w-10 h-10 rounded-full animate-pulse"
            style={{ backgroundColor: `${color}40` }}
          />
        </div>
      }
    >
      <Canvas
        camera={{ fov: 38, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        frameloop="always"
        aria-label={`3D avatar for ${agentName}`}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={1.4} />
        <AgentModel isActive={isActive} />
      </Canvas>
    </Suspense>
  );
};
