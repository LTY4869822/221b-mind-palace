import * as THREE from "three";

/** Shared resources are disposed once, including shader textures. */
export function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      const list = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of list) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
        if (material instanceof THREE.ShaderMaterial) {
          for (const uniform of Object.values(material.uniforms))
            if (uniform.value instanceof THREE.Texture)
              textures.add(uniform.value);
        }
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  scene.clear();
}

export const damp = (from: number, to: number, speed: number, delta: number) =>
  THREE.MathUtils.lerp(from, to, 1 - Math.exp(-speed * delta));

export function createRenderer(host: HTMLElement, antialias = true) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.35 : 1.6),
  );
  renderer.setClearColor(0x080b0d, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  host.appendChild(renderer.domElement);
  return renderer;
}
