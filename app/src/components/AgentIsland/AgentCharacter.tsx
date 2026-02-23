import { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const MODEL_PATH = '/agents/gm.gltf';

const ANIMATION_CYCLE = ['idle', 'walk', 'happy', 'standing_jump', 'jump_run'];

interface AgentModelProps {
  animationOffset?: number;
}

function AgentModel({ animationOffset = 0 }: AgentModelProps) {
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

  // Play animations in sequence, looping back to start
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

    // Stagger start based on animationOffset
    const timeout = setTimeout(() => {
      mixer.addEventListener('finished', onFinished);
      playNext();
    }, animationOffset * 1000);

    return () => {
      clearTimeout(timeout);
      mixer.removeEventListener('finished', onFinished);
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions, mixer, animationOffset]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

interface AgentCharacterProps {
  agentName: string;
  index: number;
  onClick: () => void;
}

export function AgentCharacter({ agentName, index, onClick }: AgentCharacterProps) {
  return (
    <div
      className="relative cursor-pointer group"
      onClick={onClick}
      title={agentName}
      style={{ width: 100, height: 30 }}
    >
      {/* Canvas is much taller than container; negative margin pushes it up so character overflows above island */}
      <div style={{ width: 180, height: 280, marginTop: -250 }}>
        <Canvas
          camera={{ fov: 38, near: 0.1, far: 100 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
          frameloop="always"
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 4, 3]} intensity={1.4} />
          <Suspense fallback={null}>
            <AgentModel animationOffset={index * 1.5} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
