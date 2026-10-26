import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MoveHorizontal,
  ScanEye,
  Image as ImageIcon,
} from "lucide-react";
import * as THREE from "three";
import { gallery } from "./content";
import { createRenderer, damp, disposeScene } from "./webgl-utils";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";

const vertex = `
  varying vec2 vUv;
  uniform float uBend;
  void main(){
    vUv=uv;vec3 p=position;
    p.z+=sin(uv.x*3.14159)*uBend;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }
`;
const fragment = `
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform vec2 uImageSize;
  uniform vec2 uPointer;
  uniform float uTime,uHover,uOpacity,uReflection,uReveal,uInspect;
  // Dual displaced UVs adapted from robin-dela/hover-effect (MIT).
  // No extra renderer, GSAP runtime or displacement image is loaded.
  mat2 getRotM(float angle){float s=sin(angle),c=cos(angle);return mat2(c,-s,s,c);}
  // Dither ordering adapted from React Bits PixelTransition; license in public notices.
  float bayer(vec2 cell) {
    mat4 order=mat4(0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    return order[int(mod(cell.y,4.))][int(mod(cell.x,4.))]/16.;
  }
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec2 uv=vUv;
    float imageRatio=uImageSize.x/uImageSize.y;
    float cardRatio=1.5;
    if(imageRatio>cardRatio)uv.x=(uv.x-.5)*cardRatio/imageRatio+.5;
    else uv.y=(uv.y-.5)*imageRatio/cardRatio+.5;
    vec2 delta=vUv-uPointer;
    float lens=exp(-dot(delta,delta)*18.)*uHover;
    uv-=delta*lens*.1;
    float shift=lens*.005;
    vec3 color=vec3(texture2D(uImage,uv+vec2(shift,0.)).r,texture2D(uImage,uv).g,texture2D(uImage,uv-vec2(shift,0.)).b);
    if(uInspect>.001){
      vec2 dispVec=vec2(sin(uv.y*31.+uv.x*9.),cos(uv.x*26.-uv.y*8.))*.009;
      vec2 displacedA=uv+getRotM(.785398)*dispVec*uInspect;
      vec2 displacedB=uv+getRotM(-2.356194)*dispVec*(1.-uInspect);
      vec3 original=texture2D(uImage,displacedA).rgb;
      vec3 sampled=texture2D(uImage,displacedB).rgb;
      vec2 pixel=1.8/uImageSize;
      vec3 dx=texture2D(uImage,displacedB+vec2(pixel.x,0.)).rgb-texture2D(uImage,displacedB-vec2(pixel.x,0.)).rgb;
      vec3 dy=texture2D(uImage,displacedB+vec2(0.,pixel.y)).rgb-texture2D(uImage,displacedB-vec2(0.,pixel.y)).rgb;
      float edge=clamp(length(dx)+length(dy),0.,1.);
      float silver=dot(sampled,vec3(.299,.587,.114));
      vec3 blueprint=vec3(.002,.010,.020)+vec3(.12,.32,.46)*(1.-silver)*.09+edge*vec3(.24,.55,.72)*.65;
      vec2 grid=abs(fract(vUv*vec2(30.,20.))-.5);
      blueprint+=vec3(.07,.15,.19)*smoothstep(.47,.50,max(grid.x,grid.y))*.45;
      float radius=length((vUv-uPointer)*vec2(1.5,1.));
      float aperture=(1.-smoothstep(.20,.215,radius))*uHover;
      vec2 magnified=clamp(uPointer+(uv-uPointer)*.78,vec2(.001),vec2(.999));
      blueprint=mix(blueprint,texture2D(uImage,magnified).rgb,aperture);
      blueprint+=vec3(.68,.88,.91)*exp(-pow((radius-.214)/.0025,2.))*uHover*.65;
      color=mix(original,blueprint,uInspect);
    }
    float gloss=pow(max(0.,1.-abs(vUv.x+vUv.y*.45-(.7+sin(uTime*.2)*.6))*4.),7.);
    color+=vec3(.8,.7,.5)*gloss*(.025+uHover*.09);
    if(uReveal<.999) {
      vec2 cells=vec2(54.,36.),cell=floor(vUv*cells);
      float radial=length((vUv-vec2(.46,.52))*vec2(1.,.8))/ .73;
      float delay=radial*.67+bayer(cell)*.20+hash(cell)*.08;
      float progress=uReveal*1.25-.08;
      float developed=smoothstep(delay-.04,delay+.13,progress);
      float silver=dot(color,vec3(.299,.587,.114));
      vec3 plate=vec3(silver)*vec3(.29,.41,.52);
      vec2 local=fract(vUv*cells);
      float grid=(1.-smoothstep(.015,.055,min(min(local.x,1.-local.x),min(local.y,1.-local.y))));
      plate+=vec3(.16,.44,.64)*grid*.22;
      color=mix(plate,color,developed);
      float frontier=exp(-pow((delay-progress)/.032,2.))*(1.-smoothstep(.86,1.,uReveal));
      color+=vec3(.20,.56,.77)*frontier*.38;
    }
    float edge=smoothstep(0.,.012,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));
    float alpha=uOpacity*edge;
    if(uReflection>.5){alpha*=pow(vUv.y,2.)*.13;color*=.5;}
    gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function EvidenceGallery({
  onOpen,
  paused = false,
  developmentKey = 0,
}: {
  onOpen: (index: number) => void;
  paused?: boolean;
  developmentKey?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inspection,setInspection]=useState(false);
  const reduced = useReducedMotion();
  const config = useRef({ onOpen, paused: paused || !!reduced,inspection });
  config.current = { onOpen, paused: paused || !!reduced,inspection };
  const api = useRef<{
    select: (index: number) => void;
    refresh: () => void;
    develop: () => void;
  } | null>(null);

  useEffect(() => {
    const host = root.current!;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createRenderer(host);
    } catch {
      setFailed(true);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.set(0, 0.1, 4.9);
    camera.lookAt(0, 0, 0);
    const geometry = new THREE.PlaneGeometry(4.35, 2.9, 48, 12);
    const loader = new THREE.TextureLoader();
    const cards: {
      group: THREE.Group;
      image: THREE.Mesh;
      mat: THREE.ShaderMaterial;
      reflection: THREE.ShaderMaterial;
      line: THREE.LineBasicMaterial;
    }[] = [];
    let alive = true,
      inView = true,
      loaded = 0;
    gallery.forEach((art, index) => {
      const uniforms = {
        uImage: { value: null },
        uImageSize: { value: new THREE.Vector2(1.5, 1) },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uOpacity: { value: 1 },
        uReflection: { value: 0 },
        uBend: { value: 0 },
        uReveal: { value: 1 },
        uInspect: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const image = new THREE.Mesh(geometry, mat);
      image.userData.index = index;
      const group = new THREE.Group();
      group.add(image);
      scene.add(group);
      const reflectMat = mat.clone();
      reflectMat.uniforms.uReflection.value = 1;
      const reflection = new THREE.Mesh(geometry, reflectMat);
      reflection.position.y = -3.01;
      reflection.rotation.x = Math.PI;
      group.add(reflection);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xd2c29d,
        transparent: true,
        opacity: 0.25,
      });
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(4.38, 2.93, 0.025)),
        lineMat,
      );
      group.add(frame);
      cards.push({ group, image, mat, reflection: reflectMat, line: lineMat });
      loader.load(
        `${import.meta.env.BASE_URL}media/${art.image}`,
        (texture) => {
          if (!alive) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            4,
            renderer.capabilities.getMaxAnisotropy(),
          );
          mat.uniforms.uImage.value?.dispose();
          reflectMat.uniforms.uImage.value?.dispose();
          mat.uniforms.uImage.value = texture;
          reflectMat.uniforms.uImage.value = texture;
          mat.uniforms.uImageSize.value.set(
            texture.image.width,
            texture.image.height,
          );
          reflectMat.uniforms.uImageSize.value.copy(
            mat.uniforms.uImageSize.value,
          );
          loaded++;
          if (loaded === gallery.length) {
            revealStart=performance.now()+120;
            setReady(true);
            host.dataset.loaded = String(loaded);
          }
          if (config.current.paused) render(0);
        },
        undefined,
        () => {
          if (alive) setFailed(true);
        },
      );
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let targetAngle = 0,
      angle = 0,
      drag = false,
      downX = 0,
      downY = 0,
      startAngle = 0,
      hovered = -1,
      time = 0,
      last = 0,
      frame = 0,
      revealStart = -Infinity;
    const modulo = (n: number) => THREE.MathUtils.euclideanModulo(n, 3);
    const select = (index: number) => {
      const base = Math.round(targetAngle / 3) * 3;
      const possibilities = [base + index - 3, base + index, base + index + 3];
      targetAngle = possibilities.reduce((a, b) =>
        Math.abs(b - targetAngle) < Math.abs(a - targetAngle) ? b : a,
      );
      if (config.current.paused) {
        angle = targetAngle;
        render(0);
      }
    };
    const hit = (e: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      pointer.set(
        ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(
        cards.map((c) => c.image),
        false,
      )[0];
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = true;
      downX = e.clientX;
      downY = e.clientY;
      startAngle = targetAngle;
      host.setPointerCapture(e.pointerId);
      host.dataset.dragging = "true";
    };
    const onMove = (e: PointerEvent) => {
      if (drag)
        targetAngle =
          startAngle -
          (e.clientX - downX) / Math.max(180, host.clientWidth * 0.38);
      const intersection = hit(e);
      hovered = intersection ? intersection.object.userData.index : -1;
      if (intersection?.uv)
        cards[hovered].mat.uniforms.uPointer.value.copy(intersection.uv);
      if (config.current.paused) {
        angle = targetAngle;
        render(0);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      drag = false;
      host.dataset.dragging = "false";
      if (host.hasPointerCapture(e.pointerId))
        host.releasePointerCapture(e.pointerId);
      targetAngle = Math.round(targetAngle);
      setActive(modulo(targetAngle));
      if (moved < 7) {
        const intersection = hit(e);
        if (intersection)
          config.current.onOpen(intersection.object.userData.index);
      }
      if (config.current.paused) render(0);
    };
    const onCancel = () => {
      drag = false;
      hovered = -1;
      targetAngle = Math.round(targetAngle);
      host.dataset.dragging = "false";
    };
    function render(delta: number) {
      if (!alive) return;
      const freeze = config.current.paused;
      const dt = freeze ? 1 : Math.min(delta, 0.04);
      const reveal = freeze
        ? 1
        : Math.max(0,Math.min(1, (performance.now() - revealStart) / 1900));
      if (!freeze) time += dt;
      const inspectTarget=config.current.inspection?1:0;
      const inspect=freeze?inspectTarget:damp(cards[0].mat.uniforms.uInspect.value,inspectTarget,5,dt);
      const cameraTarget=(host.clientWidth<500?5.6:4.4)-inspect*.15;
      camera.position.z=freeze?cameraTarget:damp(camera.position.z,cameraTarget,5,dt);
      const previous = angle;
      angle = freeze ? targetAngle : damp(angle, targetAngle, 7, dt);
      const velocity = Math.min(0.7, Math.abs(angle - previous) * 12);
      cards.forEach((card, index) => {
        const distance =
          THREE.MathUtils.euclideanModulo(index - angle + 1.5, 3) - 1.5;
        card.group.position.set(
          distance * 3.5,
          Math.abs(distance) * -0.12,
          -Math.abs(distance) * 1.8,
        );
        card.group.rotation.y = -distance * 0.31;
        card.group.rotation.z = -distance * 0.035;
        const opacity =
          1 - THREE.MathUtils.smoothstep(Math.abs(distance), 0.65, 1.5) * 0.75;
        card.mat.uniforms.uOpacity.value = opacity;
        card.reflection.uniforms.uOpacity.value = opacity;
        card.line.opacity = opacity * 0.22;
        card.mat.uniforms.uTime.value = time;
        card.mat.uniforms.uInspect.value=inspect;
        card.reflection.uniforms.uInspect.value=inspect;
        card.mat.uniforms.uReveal.value = reveal;
        card.reflection.uniforms.uReveal.value = reveal;
        card.mat.uniforms.uBend.value = damp(
          card.mat.uniforms.uBend.value,
          velocity * (drag ? 1.2 : 0.5),
          8,
          dt,
        );
        card.mat.uniforms.uHover.value = damp(
          card.mat.uniforms.uHover.value,
          hovered === index ? 1 : 0,
          6,
          dt,
        );
      });
      renderer.render(scene, camera);
      if (reveal < 1 || host.dataset.reveal !== "1.000")
        host.dataset.reveal = reveal.toFixed(3);
        host.dataset.inspection=inspect.toFixed(3);
      if (frame++ % 15 === 0 || freeze) {
        host.dataset.angle = angle.toFixed(3);
        host.dataset.frame = String(frame);
        host.dataset.geometries = String(renderer.info.memory.geometries);
        host.dataset.reveal = reveal.toFixed(3);
      }
    }
    const loop = (stamp: number) => {
      const dt = last ? (stamp - last) / 1000 : 1 / 60;
      last = stamp;
      render(dt);
    };
    const restart = () => {
      last = 0;
      if (config.current.paused || document.hidden || !inView) {
        renderer.setAnimationLoop(null);
        render(0);
      } else renderer.setAnimationLoop(loop);
    };
    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.position.z = host.clientWidth < 500 ? 5.6 : 4.4;
      camera.updateProjectionMatrix();
      render(0);
    };
    api.current = {
      select,
      refresh: restart,
      develop: () => {
        revealStart = performance.now();
        render(0);
      },
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    restart();
    const visibilityObserver=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;restart();});
    visibilityObserver.observe(host);
    const onLeave = () => {
      if (!drag) hovered = -1;
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);
    host.addEventListener("pointerleave", onLeave);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      renderer.setAnimationLoop(null);
      if (alive) setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", restart);
    return () => {
      alive = false;
      api.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      visibilityObserver.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      document.removeEventListener("visibilitychange", restart);
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    api.current?.select(active);
  }, [active]);
  useEffect(() => {
    api.current?.refresh();
  }, [paused, reduced,inspection]);
  useEffect(() => {
    if (developmentKey > 0) api.current?.develop();
  }, [developmentKey]);
  return (
    <div className={`evidence-gallery ${inspection?"is-inspecting":""}`}>
      <div className="gallery-space-label">
        <span className="micro-label">SELECTED WORKS / SPATIAL ARCHIVE</span>
        <ToggleGroup className="inspection-switch" value={inspection?"inspect":"original"} onValueChange={value=>setInspection(value==="inspect")} aria-label="作品观察模式">
          <ToggleGroupItem value="original"><ImageIcon size={11}/>原作</ToggleGroupItem>
          <ToggleGroupItem value="inspect"><ScanEye size={12}/>取证镜</ToggleGroupItem>
        </ToggleGroup>
        <span>
          <MoveHorizontal size={12} /> 拖动探索
        </span>
      </div>
      <div
        ref={root}
        className={`evidence-viewport ${ready ? "is-ready" : ""} ${failed ? "is-fallback" : ""}`}
        tabIndex={0}
        role="group"
        aria-label="三维作品画廊，可使用左右方向键切换"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((active + 1) % 3);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((active + 2) % 3);
          }
          if (
            e.key === "Enter" ||
            e.key === "Return" ||
            e.code === "Enter" ||
            e.code === "NumpadEnter"
          ) {
            e.preventDefault();
            onOpen(active);
          }
        }}
      >
        {(!ready || failed) && (
          <div className="evidence-fallback">
            {gallery.map((g, i) => (
              <button
                key={g.id}
                onClick={() => onOpen(i)}
                aria-label={`查看${g.title}`}
              >
                <img
                  src={`${import.meta.env.BASE_URL}media/${g.image}`}
                  alt={g.title}
                />
              </button>
            ))}
          </div>
        )}
        <span className="gallery-floor-line" aria-hidden="true" />
        <div className="darkroom-viewfinder" aria-hidden="true"><i/><i/><i/><i/><span>{inspection?"FORENSIC OPTICS / 4869":"EXHIBIT / "+gallery[active].id}</span></div>
      </div>
      <div className="evidence-caption">
        <div className="evidence-number">
          <span>{gallery[active].id}</span>
          <i />
          03
        </div>
        <div className="evidence-caption-copy">
          <span className="micro-label">{gallery[active].english}</span>
          <h2>{gallery[active].title}</h2>
        </div>
        <div className="evidence-controls">
          <button
            aria-label="上一幅空间作品"
            onClick={() => setActive((active + 2) % 3)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            aria-label="下一幅空间作品"
            onClick={() => setActive((active + 1) % 3)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <button
          className="evidence-open"
          onClick={() => onOpen(active)}
          aria-label={`查看作品：${gallery[active].title}`}
        >
          <ArrowUpRight size={21} />
        </button>
      </div>
      <div className="evidence-progress evidence-filmstrip" aria-label="作品底片目录">
        {gallery.map((g, i) => (
          <button
            key={g.id}
            className={i === active ? "active" : ""}
            aria-label={`切换至${g.title}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <img src={`${import.meta.env.BASE_URL}media/${g.image}`} alt="" loading="lazy"/><span><i>{g.id}</i>{g.english}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
