// Post stack: MSAA HDR scene -> bloom on HDR-bright pixels only -> tone map + sRGB.
// Lit surfaces stay <= ~1.0 (the rim is screen-blended), and only 'lamp' glow materials go HDR at night,
// so the bloom threshold isolates lamps/lanterns without a separate selective-bloom pass.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export const BLOOM = { strength: 0.6, radius: 0.55, threshold: 1.3 };

export interface Post {
  render(night: number): void;
  setSize(w: number, h: number, dpr: number): void;
  bloom: UnrealBloomPass;
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Post {
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps pastels saturated; only rolls off HDR highlights
  renderer.toneMappingExposure = 1;
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    bloom,
    render(night) {
      bloom.enabled = night > 0.02; // nothing is HDR by day; skip the blur chain entirely
      bloom.strength = BLOOM.strength * Math.min(1, night * 1.5);
      composer.render();
    },
    setSize(w, h, dpr) { composer.setPixelRatio(dpr); composer.setSize(w, h); },
  };
}
