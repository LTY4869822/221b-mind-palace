import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createRenderer, damp, disposeScene } from "./webgl-utils";

type Props = { route: string; paused: boolean };

const irisVertex = `
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;

const irisFragment = `
  uniform float uTime;
  uniform float uFocus;
  varying vec2 vUv;
  float hash(float n){return fract(sin(n)*43758.5453);}
  void main(){
    vec2 p=(vUv-.5)*2.;
    float r=length(p), a=atan(p.y,p.x);
    float pupil=.21+sin(uTime*.35)*.012-uFocus*.035;
    float fibers=sin(a*116.+sin(r*42.-uTime*.7)*2.3);
    fibers+=sin(a*231.-r*19.+uTime*.2)*.42;
    float strands=pow(abs(fibers*.5),3.)*smoothstep(pupil,.46,r);
    float waves=sin(r*58.-uTime*1.2+sin(a*7.)*.4)*.5+.5;
    float limbal=exp(-pow((r-.88)*35.,2.));
    float inner=exp(-pow((r-pupil-.025)*35.,2.));
    vec3 base=mix(vec3(.025,.075,.073),vec3(.31,.23,.115),smoothstep(.35,.75,r));
    base+=strands*vec3(.63,.48,.24)*(.45+.55*waves);
    base+=limbal*vec3(.65,.46,.18)*.8+inner*vec3(.45,.82,.75)*.5;
    base*=smoothstep(pupil,pupil+.025,r)*(1.-smoothstep(.92,1.,r));
    float reticle=step(.995,cos(a*4.))*smoothstep(.55,.65,r)*(1.-smoothstep(.76,.77,r));
    base+=reticle*vec3(.35,.52,.43);
    float ring=exp(-pow((r-.95)*170.,2.));
    base+=ring*vec3(.7,.55,.32);
    gl_FragColor=vec4(base*.46,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function OpticScene({ route, paused }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const config = useRef({ route, paused: paused || !!reduced });
  config.current = { route, paused: paused || !!reduced };
  const refresh = useRef<(() => void) | null>(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    const target = host.current!;
    if (!target) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createRenderer(target);
    } catch {
      setState("fallback");
      return;
    }
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.position.set(0, 0.15, 10.3);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffe4b3, 3.8);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const edge = new THREE.DirectionalLight(0x81c7d0, 3.0);
    edge.position.set(5, 1, -3);
    scene.add(edge);
    const fill = new THREE.PointLight(0xffb365, 16, 12);
    fill.position.set(1, -3, 4);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0xb9c9d0, 0.45));

    const apparatus = new THREE.Group();
    apparatus.position.set(2.65, 0, 0);
    scene.add(apparatus);
    const turntable = new THREE.Group();
    apparatus.add(turntable);
    const brass = new THREE.MeshStandardMaterial({
      color: 0xbfa879,
      metalness: 0.98,
      roughness: 0.25,
      envMapIntensity: 1.65,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x20272b,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.4,
    });
    const bright = new THREE.MeshBasicMaterial({
      color: 0xb9cfb4,
      transparent: true,
      opacity: 0.65,
    });
    const dim = new THREE.LineBasicMaterial({
      color: 0xbca87e,
      transparent: true,
      opacity: 0.24,
    });

    const lensAssembly = new THREE.Group();
    turntable.add(lensAssembly);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.46, 96, 1, true),
      dark,
    );
    tube.rotation.x = Math.PI / 2;
    lensAssembly.add(tube);
    for (const [radius, thickness, z] of [
      [1.48, 0.08, 0.24],
      [1.48, 0.055, -0.23],
      [1.33, 0.025, 0.33],
      [1.58, 0.015, 0.1],
    ]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius, thickness, 16, 128),
        brass,
      );
      rim.position.z = z;
      lensAssembly.add(rim);
    }
    const irisMaterial = new THREE.ShaderMaterial({
      vertexShader: irisVertex,
      fragmentShader: irisFragment,
      uniforms: { uTime: { value: 0 }, uFocus: { value: 0 } },
    });
    const iris = new THREE.Mesh(
      new THREE.CircleGeometry(1.29, 128),
      irisMaterial,
    );
    iris.position.z = 0.04;
    lensAssembly.add(iris);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 32, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x020506,
        metalness: 0.4,
        roughness: 0.04,
        clearcoat: 1,
      }),
    );
    pupil.scale.z = 0.4;
    pupil.position.z = 0.12;
    lensAssembly.add(pupil);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9ebcb6,
      metalness: 0,
      roughness: 0.035,
      transmission: 1,
      thickness: 0.55,
      ior: 1.6,
      dispersion: 0.025,
      envMapIntensity: 0.48,
      clearcoat: 0.55,
      clearcoatRoughness: 0.08,
    });
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.29, 64, 40),
      glassMaterial,
    );
    glass.scale.z = 0.23;
    glass.position.z = 0.18;
    lensAssembly.add(glass);

    const gimbals: THREE.Group[] = [];
    const rings = [
      { r: 1.85, t: 0.045, x: Math.PI * 0.36, y: 0.18 },
      { r: 2.1, t: 0.026, x: -0.55, y: 0.6 },
      { r: 2.38, t: 0.017, x: 0.34, y: -0.4 },
    ];
    rings.forEach((r, i) => {
      const g = new THREE.Group();
      g.rotation.set(r.x, r.y, i * 0.5);
      turntable.add(g);
      gimbals.push(g);
      g.add(
        new THREE.Mesh(
          new THREE.TorusGeometry(r.r, r.t, 12, 160),
          i === 1 ? dark : brass,
        ),
      );
      if (i === 0) {
        const ticks = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.012, 0.075, 0.025),
          brass,
          120,
        );
        const o = new THREE.Object3D();
        for (let j = 0; j < 120; j++) {
          const a = (j / 120) * Math.PI * 2;
          o.position.set(Math.sin(a) * r.r, Math.cos(a) * r.r, 0);
          o.rotation.z = -a;
          o.scale.y = j % 10 === 0 ? 2 : 1;
          o.updateMatrix();
          ticks.setMatrixAt(j, o.matrix);
        }
        g.add(ticks);
      }
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.062, 12, 10),
        bright,
      );
      marker.position.set(r.r, 0, 0);
      g.add(marker);
    });

    const rear = new THREE.Group();
    rear.position.z = -0.55;
    turntable.add(rear);
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let j = 0; j <= 120; j++) {
        const a = (j / 120) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * (2.6 + i * 0.13),
            Math.sin(a) * (2.6 + i * 0.13),
            0,
          ),
        );
      }
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        dim,
      );
      arc.rotation.set(0.5 + i * 0.34, 0.3 + i * 0.45, 0.1);
      rear.add(arc);
    }

    // Tiny physical fasteners make the instrument read as an object rather than a flat shader.
    const screws = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.075, 10),
      brass,
      12,
    );
    const screw = new THREE.Object3D();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      screw.position.set(Math.sin(a) * 1.48, Math.cos(a) * 1.48, 0.31);
      screw.rotation.x = Math.PI / 2;
      screw.updateMatrix();
      screws.setMatrixAt(i, screw.matrix);
    }
    lensAssembly.add(screws);

    const starGeometry = new THREE.BufferGeometry();
    const count = 720;
    const positions = new Float32Array(count * 3),
      scales = new Float32Array(count);
    const rand = (i: number) =>
      THREE.MathUtils.euclideanModulo(
        Math.sin(i * 123.45 + 93.1) * 43217.87,
        1,
      );
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand(i * 3) - 0.5) * 24;
      positions[i * 3 + 1] = (rand(i * 3 + 1) - 0.5) * 14;
      positions[i * 3 + 2] = rand(i * 3 + 2) * -14;
      scales[i] = rand(i + 45);
    }
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    starGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    const starMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aScale;uniform float uTime;varying float vAlpha;void main(){vec3 p=position;p.y+=sin(uTime*.06+position.x)*.15;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.+aScale*2.)*(9./-mv.z);vAlpha=.12+aScale*.34;}`,
      fragmentShader: `varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*20.);gl_FragColor=vec4(.85,.74,.52,a*vAlpha);}`,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const floorMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: irisVertex,
      fragmentShader: `varying vec2 vUv;uniform float uTime;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float glow=exp(-r*r*5.);float rings=pow(max(0.,sin(r*55.-uTime*.2)),16.)*.09;float a=(glow*.1+rings*glow)*(1.-smoothstep(.8,1.,r));gl_FragColor=vec4(.62,.48,.24,a);}`,
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(2.65, -2.8, 0);
    scene.add(floor);

    let alive = true,
      time = 0,
      last = 0,
      frames = 0,
      entrance = 0,
      settleUntil = 0;
    let pointerX = 0,
      pointerY = 0,
      dragging = false,
      dragX = 0,
      dragY = 0,
      startX = 0,
      startY = 0,
      hover = 0,
      focusPulse = 0,
      mobileScreenY = 700;
    const spin = { x: 0, y: 0 };
    const mobile = () => target.clientWidth < 700;
    const onMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (dragging) {
        dragX += (e.clientX - startX) * 0.007;
        dragY += (e.clientY - startY) * 0.005;
        startX = e.clientX;
        startY = e.clientY;
      }
      hover =
        e.target instanceof Element &&
        !!e.target.closest("[data-optic-control]")
          ? 1
          : 0;
      if (config.current.paused) render(0);
    };
    const onDown = (e: PointerEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("[data-optic-control]")
      ) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        target.dataset.dragging = "true";
      }
    };
    const onUp = () => {
      dragging = false;
      target.dataset.dragging = "false";
    };
    const onLeave = () => {
      pointerX = 0;
      pointerY = 0;
      onUp();
    };
    const onFocus = () => {
      dragX += Math.PI * 0.75;
      dragY = 0;
      focusPulse = 1;
      if (config.current.paused) render(0);
    };
    const locateMobile = () => {
      const home = document.querySelector(".home");
      mobileScreenY = (home ? home.getBoundingClientRect().top : 76) + 700;
      if (config.current.paused) render(0);
    };
    const resize = () => {
      const w = target.clientWidth,
        h = target.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      locateMobile();
      render(0);
    };
    function render(delta: number) {
      if (!alive) return;
      const freeze = config.current.paused;
      const step = freeze ? 1 : Math.min(delta, 0.04);
      if (!freeze) {
        time += step;
        entrance = Math.min(1, entrance + step * 0.7);
        focusPulse = damp(focusPulse, 0, 3, step);
      } else entrance = 1;
      const enter = 1 - Math.pow(1 - entrance, 4);
      const home = config.current.route === "/";
      const compact = target.clientWidth >= 700 && target.clientWidth < 1000;
      const desiredX = mobile() ? 0 : home ? (compact ? 1.65 : 2.65) : 6.6;
      const desiredY =
        mobile() && home
          ? (0.5 - mobileScreenY / target.clientHeight) *
            (2 *
              Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
              camera.position.z)
          : home
            ? 0.02
            : 0.35;
      apparatus.position.x = damp(apparatus.position.x, desiredX, 3.5, step);
      apparatus.position.y = damp(
        apparatus.position.y,
        desiredY + (!freeze ? Math.sin(time * 0.45) * 0.08 : 0),
        mobile() ? 15 : 3.5,
        step,
      );
      const desiredScale =
        (mobile() ? 0.57 : compact ? 0.68 : 1) * (home ? 1 : 0.74);
      apparatus.scale.setScalar(
        damp(apparatus.scale.x, desiredScale * enter, 4, step),
      );
      spin.x = damp(spin.x, dragY - pointerY * 0.1, 4, step);
      spin.y = damp(spin.y, dragX + pointerX * 0.12, 4, step);
      turntable.rotation.set(
        spin.x + 0.08,
        spin.y - 0.32,
        Math.sin(time * 0.13) * 0.025,
      );
      lensAssembly.rotation.z = Math.sin(time * 0.12) * 0.04;
      gimbals.forEach((g, i) => {
        g.rotation.z =
          time * (i % 2 === 0 ? 0.09 : -0.07) + i * 0.6 + (1 - enter) * 3;
        g.rotation.y = rings[i].y + Math.sin(time * 0.17 + i) * 0.18;
      });
      rear.rotation.z = time * 0.025;
      camera.position.x = damp(camera.position.x, pointerX * 0.1, 3, step);
      camera.position.y = damp(camera.position.y, -pointerY * 0.08, 3, step);
      camera.position.z = damp(
        camera.position.z,
        mobile() ? 9.8 : home ? 10.3 : 11.4,
        4,
        step,
      );
      camera.lookAt(0, 0, 0);
      irisMaterial.uniforms.uTime.value = time;
      irisMaterial.uniforms.uFocus.value = damp(
        irisMaterial.uniforms.uFocus.value,
        hover * 0.5 + focusPulse * 0.5,
        5,
        step,
      );
      starMaterial.uniforms.uTime.value = time;
      floorMaterial.uniforms.uTime.value = time;
      stars.rotation.y = time * 0.006;
      renderer.render(scene, camera);
      if (frames++ === 0) {
        setState("ready");
        target.dataset.engine = "three-webgl";
      }
      if (frames % 20 === 0 || freeze) {
        target.dataset.frame = String(frames);
        target.dataset.yaw = turntable.rotation.y.toFixed(3);
        target.dataset.geometries = String(renderer.info.memory.geometries);
      }
    }
    const loop = (stamp: number) => {
      const delta = last ? (stamp - last) / 1000 : 1 / 60;
      last = stamp;
      render(delta);
      if (config.current.route !== "/" && stamp > settleUntil)
        renderer.setAnimationLoop(null);
    };
    const restart = () => {
      last = 0;
      settleUntil = performance.now() + 1800;
      if (config.current.paused || document.hidden) {
        renderer.setAnimationLoop(null);
        render(0);
      } else renderer.setAnimationLoop(loop);
    };
    refresh.current = restart;
    const observer = new ResizeObserver(resize);
    observer.observe(target);
    resize();
    restart();
    const scrollHost = document.querySelector("main");
    scrollHost?.addEventListener("scroll", locateMobile, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onLeave);
    window.addEventListener("palace:focus", onFocus);
    document.addEventListener("visibilitychange", restart);
    const onLost = (e: Event) => {
      e.preventDefault();
      setState("fallback");
      renderer.setAnimationLoop(null);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    return () => {
      alive = false;
      refresh.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      scrollHost?.removeEventListener("scroll", locateMobile);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("palace:focus", onFocus);
      document.removeEventListener("visibilitychange", restart);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      disposeScene(scene);
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    refresh.current?.();
  }, [route, paused, reduced]);
  return (
    <div
      ref={host}
      className={`optic-scene optic-${state}`}
      data-status={state}
      aria-hidden="true"
    />
  );
}
