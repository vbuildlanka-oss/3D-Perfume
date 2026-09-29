import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';

import { Annotations } from './Annotations';
import { getColorway } from '../config/product';
import { getChapters, samplePose, createSampledPose } from '../config/scrollSequence';
import { getSceneState, useSceneStore } from '../store/useSceneStore';

/* ================================================================== *
 * THE MODEL
 *
 * "Materials Variants Shoe" by Shopify (CC BY 4.0), via the Khronos glTF
 * sample assets. One mesh, one set of normal / ORM maps, and three
 * base-colour textures exposed through KHR_materials_variants.
 *
 * Shipped in two sizes, both WebP + meshopt (see README):
 *   kestrel-01.glb     2048px textures, 2.8 MB — desktop
 *   kestrel-01-1k.glb  1024px textures, 0.7 MB — phones
 * ================================================================== */
export const MODEL_URL = '/models/kestrel-01.glb';
export const MODEL_URL_MOBILE = '/models/kestrel-01-1k.glb';

/** Distance from the shoe's centre down to its floor shadow. The sole sits
 *  at about -0.67, so this leaves a small, believable hover. */
const SHOE_FLOOR_GAP = 0.9;

/** Toe-to-heel length after normalisation, in world units. */
const SHOE_LENGTH = 2.6;

/**
 * The GLB is authored along X with the sole at -Y. This fixed half-turn
 * puts the striped lateral face towards the camera with the toe at -X —
 * the shoe space scrollSequence.ts documents.
 */
const ORIENT = new THREE.Euler(0, Math.PI, 0);

/* ------------------------------------------------------------------ *
 * Motion tuning
 * ------------------------------------------------------------------ */
const SWAY_AMPLITUDE = 0.14; // rad — idle side-to-side, not a turntable spin
const SWAY_SPEED = 0.32; // rad/s of the underlying sine
const BOB_AMPLITUDE = 0.035; // world units
const BOB_SPEED = 0.6;
const TILT_X = 0.1; // rad per unit of pointer.y
const TILT_Y = 0.18; // rad per unit of pointer.x
const TILT_DAMPING = 3.2; // higher = snappier. Frame-rate independent.
const HOP_DURATION = 0.7; // s — the little jump when you change colourway

type ShoeGLTF = GLTF & { parser: GLTF['parser'] };

interface VariantMapping {
  material: number;
  variants: number[];
}

/**
 * KHR_materials_variants support.
 *
 * Neither three's nor three-stdlib's GLTFLoader applies variants; the
 * loader just leaves the primitive's mapping table on
 * `mesh.userData.gltfExtensions`. So we resolve every variant's material
 * through the parser up front, upload its textures, and swap
 * `mesh.material` on demand. Nothing loads at click time, so switching is
 * instant.
 */
function useMaterialVariants(gltf: ShoeGLTF) {
  const gl = useThree((state) => state.gl);
  const table = useRef(new Map<string, Map<THREE.Mesh, THREE.Material>>());

  const variantNames = useMemo<string[]>(() => {
    const ext = gltf.parser.json.extensions?.KHR_materials_variants as
      | { variants: { name: string }[] }
      | undefined;
    return ext?.variants.map((v) => v.name) ?? [];
  }, [gltf]);

  useEffect(() => {
    let cancelled = false;
    const jobs: Promise<void>[] = [];

    gltf.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mappings = (
        mesh.userData.gltfExtensions?.KHR_materials_variants as
          | { mappings: VariantMapping[] }
          | undefined
      )?.mappings;
      if (!mappings) return;

      for (const mapping of mappings) {
        jobs.push(
          gltf.parser
            .getDependency('material', mapping.material)
            .then((material: THREE.Material) => {
              if (cancelled) return;
              tuneMaterial(material);
              // Upload now rather than on first use, so the swap never hitches.
              const map = (material as THREE.MeshStandardMaterial).map;
              if (map) gl.initTexture(map);
              for (const variantIndex of mapping.variants) {
                const name = variantNames[variantIndex];
                if (!table.current.has(name)) table.current.set(name, new Map());
                table.current.get(name)!.set(mesh, material);
              }
            }),
        );
      }
    });

    Promise.all(jobs).then(() => {
      if (!cancelled) apply(getColorway(getSceneState().colorway).variant);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, gl, variantNames]);

  const apply = (variant: string) => {
    const entries = table.current.get(variant);
    if (!entries) return;
    entries.forEach((material, mesh) => {
      mesh.material = material;
    });
    if (debugEnabled) window.__KESTREL_VARIANT__ = variant;
  };

  return apply;
}

/* ------------------------------------------------------------------ *
 * MATERIAL TUNING
 *
 * The scan's own PBR maps are good; these are small nudges so it reads
 * well on a white page under a single soft key light.
 * ------------------------------------------------------------------ */
function tuneMaterial(material: THREE.Material) {
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial) return;

  // How strongly the studio HDR lights the shoe. 1 is physically neutral;
  // a touch under keeps the white midsole from flattening against the page.
  m.envMapIntensity = 0.9;

  // The ORM texture's blue channel carries metalness, but a trainer is
  // fabric and foam. Clamping to near-zero removes the faint chrome sheen
  // the source asset shows at grazing angles.
  m.metalness = 0.05;

  // Multiplier on the roughness channel. 1 = as scanned.
  m.roughness = 1;

  // Detail in the knit comes almost entirely from the normal map.
  m.normalScale.set(1, 1);

  // Anisotropic filtering keeps the mesh pattern crisp at grazing angles.
  for (const tex of [m.map, m.normalMap, m.roughnessMap]) {
    if (tex) tex.anisotropy = 8;
  }
  m.needsUpdate = true;
}

export interface ShoeModelProps {
  isMobile: boolean;
  reducedMotion: boolean;
}

export function ShoeModel({ isMobile, reducedMotion }: ShoeModelProps) {
  const gltf = useGLTF(isMobile ? MODEL_URL_MOBILE : MODEL_URL) as ShoeGLTF;
  const applyVariant = useMaterialVariants(gltf);

  const poseGroup = useRef<THREE.Group>(null); // scroll-driven pose
  const motionGroup = useRef<THREE.Group>(null); // idle + pointer + hop, layered on top
  const shadowGroup = useRef<THREE.Group>(null); // follows the offset, never rotates

  const keyframes = useMemo(() => getChapters(isMobile), [isMobile]);
  const pose = useMemo(createSampledPose, []);
  const tilt = useRef({ x: 0, y: 0 });
  const hopStart = useRef(-Infinity);

  /* Normalise: centre the shoe on the origin and scale to SHOE_LENGTH. */
  // Measured with the scene's own transform reset, so the result is the same
  // however many times it runs (StrictMode, HMR, remounts) — measuring the
  // already-offset scene would silently cancel the centring out.
  const { scale, center } = useMemo(() => {
    const saved = gltf.scene.position.clone();
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.copy(saved);
    const size = box.getSize(new THREE.Vector3());
    return {
      scale: SHOE_LENGTH / Math.max(size.x, size.z),
      center: box.getCenter(new THREE.Vector3()),
    };
  }, [gltf]);

  useLayoutEffect(() => {
    gltf.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [gltf]);

  /* Colourway changes: swap materials and give the shoe a little hop. */
  useEffect(
    () =>
      useSceneStore.subscribe((state, prev) => {
        if (state.colorway === prev.colorway) return;
        applyVariant(getColorway(state.colorway).variant);
        hopStart.current = performance.now() / 1000;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gltf],
  );

  useFrame((state, delta) => {
    const pg = poseGroup.current;
    const mg = motionGroup.current;
    if (!pg || !mg) return;

    const { progress, pointer } = getSceneState();

    // 1. Scroll pose — a pure function of progress.
    samplePose(keyframes, progress, reducedMotion, pose);
    pg.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
    pg.position.copy(pose.offset);
    // Only the height follows: ContactShadows' ortho camera is centred on its
    // own group, so sliding it sideways mirrors the shadow. A wide `scale`
    // at x = 0 already covers every horizontal offset in the sequence.
    shadowGroup.current?.position.set(0, pose.offset.y, 0);

    // 2. Idle life + pointer tilt. All of it is off under reduced motion.
    if (reducedMotion) {
      mg.rotation.set(0, 0, 0);
      mg.position.set(0, 0, 0);
    } else {
      const t = state.clock.elapsedTime;
      // Exponential damping: frame-rate independent, and never snaps.
      const k = 1 - Math.exp(-TILT_DAMPING * Math.min(delta, 0.1));
      tilt.current.x += (-pointer.y * TILT_X - tilt.current.x) * k;
      tilt.current.y += (pointer.x * TILT_Y - tilt.current.y) * k;

      // The hop: a short parabola up, and a quick half-wiggle on Y.
      const h = (performance.now() / 1000 - hopStart.current) / HOP_DURATION;
      const hop = h >= 0 && h < 1 ? Math.sin(h * Math.PI) : 0;
      const wiggle = h >= 0 && h < 1 ? Math.sin(h * Math.PI * 2) * (1 - h) * 0.25 : 0;

      mg.rotation.set(
        tilt.current.x,
        tilt.current.y + Math.sin(t * SWAY_SPEED) * SWAY_AMPLITUDE + wiggle,
        -hop * 0.06,
      );
      mg.position.set(0, Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE + hop * 0.22, 0);
    }

    if (debugEnabled) {
      window.__KESTREL_DEBUG__ = {
        progress,
        poseRotation: pose.rotation.toArray(),
        poseOffset: pose.offset.toArray(),
        motionRotation: [mg.rotation.x, mg.rotation.y, mg.rotation.z],
        motionPositionY: mg.position.y,
        camera: state.camera.position.toArray(),
        colorway: getSceneState().colorway,
        shoeBox: (() => {
          const b = new THREE.Box3().setFromObject(gltf.scene);
          return [b.min.toArray(), b.max.toArray()];
        })(),
      };
    }
  });

  return (
    <>
      {/* Soft floor shadow that travels with the shoe, so it always sits just
        beneath it rather than on a fixed floor far below. */}
      <group ref={shadowGroup}>
        <ContactShadows
          position={[0, -SHOE_FLOOR_GAP, 0]}
          opacity={0.42}
          scale={10}
          blur={2.6}
          far={1.6}
          resolution={isMobile ? 384 : 768}
          color="#1a1a1a"
        />
      </group>
      <group ref={poseGroup} name="ShoePose">
        <group ref={motionGroup} name="ShoeMotion">
          <group rotation={ORIENT} scale={scale}>
            <primitive object={gltf.scene} position={center.clone().negate()} />
          </group>
          <Annotations compact={isMobile} />
        </group>
      </group>
    </>
  );
}

const debugEnabled =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

declare global {
  interface Window {
    __KESTREL_DEBUG__?: Record<string, unknown>;
    __KESTREL_VARIANT__?: string;
  }
}

useGLTF.preload(
  typeof window !== 'undefined' && window.innerWidth < 768 ? MODEL_URL_MOBILE : MODEL_URL,
);
