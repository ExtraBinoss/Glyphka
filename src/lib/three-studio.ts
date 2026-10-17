import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  VSMShadowMap,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Design, RenderSettings } from "@/engine/model";
import type {
  GeometryReply,
  GeometryRequest,
  MeshData,
} from "@/engine/mesh-types";

export class ThreeStudio {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 0.05, 100);
  private controls: OrbitControls;
  private logo = new Group();
  private face = new MeshStandardMaterial();
  private side = new MeshStandardMaterial();
  private outline = new MeshBasicMaterial({ side: BackSide });
  private shadowMaterial = new ShadowMaterial({ opacity: 0.22 });
  private floor = new Mesh(new PlaneGeometry(200, 200), this.shadowMaterial);
  private key = new DirectionalLight("#ffffff", 3.5);
  private worker: Worker;
  private active = false;
  private pending: GeometryRequest | null = null;
  private serial = 0;
  private disposed = false;
  private frame = 0;
  private lastTime = 0;
  private autoRotate = false;
  private resizeObserver: ResizeObserver;
  private environment;
  private width = 1;
  private height = 1;
  private settings: RenderSettings;
  private builtKey = "";
  private outlines: Mesh[] = [];
  private floorBase = 0;
  private onReady: (error?: string) => void;
  constructor(
    private host: HTMLElement,
    settings: RenderSettings,
    onReady: (error?: string) => void,
  ) {
    this.settings = settings;
    this.onReady = onReady;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = VSMShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "3D");
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    this.host.append(this.renderer.domElement);
    const pmrem = new PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    room.dispose();
    this.scene.add(
      new AmbientLight("#ffffff", 0.25),
      new HemisphereLight("#ffffff", "#7786a8", 1.1),
      this.logo,
    );
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -5;
    this.key.shadow.camera.right = 5;
    this.key.shadow.camera.top = 5;
    this.key.shadow.camera.bottom = -5;
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 35;
    this.key.shadow.bias = -0.0001;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.blurSamples = 8;
    this.scene.add(this.key);
    const fill = new DirectionalLight("#9dbbff", 1.6);
    fill.position.set(4, 2, -3);
    this.scene.add(fill);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.camera.position.set(1.7, 1.1, 10);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 1.3;
    this.controls.maxDistance = 25;
    this.controls.autoRotateSpeed = 0.75;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.controls.addEventListener("change", this.invalidate);
    this.controls.addEventListener("start", this.invalidate);
    this.worker = new Worker(
      new URL("../engine/contour.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = (event: MessageEvent<GeometryReply>) => {
      this.active = false;
      const reply = event.data;
      if (reply.id === this.serial) {
        if (reply.error) this.onReady(reply.error);
        else if (reply.meshes) {
          this.replaceGeometry(reply.meshes, reply.width!, reply.height!);
          this.onReady();
        }
      }
      if (this.pending) {
        const next = this.pending;
        this.pending = null;
        this.send(next);
      }
    };
    this.worker.onerror = () => {
      this.active = false;
      this.onReady("3D geometry unavailable");
    };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    document.addEventListener("visibilitychange", this.visibility);
    this.resize();
    this.apply(settings, "#2563eb");
  }
  get canvas() {
    return this.renderer.domElement;
  }
  private send(request: GeometryRequest) {
    this.active = true;
    this.worker.postMessage(request);
  }
  update(
    design: Design,
    mode: "wordmark" | "symbol" | "shapes",
    selected: number,
    ink: string,
  ) {
    this.apply(design.render, ink);
    const { render: _, color: __, ...geometry } = design;
    void _;
    void __;
    const key = JSON.stringify([geometry, mode, selected]),
      meshKey = JSON.stringify([key, design.render.depth, design.render.bevel]);
    if (meshKey === this.builtKey) return;
    this.builtKey = meshKey;
    const request = { id: ++this.serial, key, design, mode, selected };
    if (this.active) this.pending = request;
    else this.send(request);
  }
  private replaceGeometry(meshes: MeshData[], width: number, height: number) {
    for (const child of [...this.logo.children]) {
      if (child instanceof Mesh && !child.userData.outline)
        child.geometry.dispose();
      this.logo.remove(child);
    }
    this.outlines = [];
    for (const data of meshes) {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
      geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
      geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
      for (const group of data.groups)
        geometry.addGroup(group.start, group.count, group.materialIndex);
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, [this.face, this.side]);
      mesh.castShadow = true;
      this.logo.add(mesh);
      const border = new Mesh(geometry, this.outline);
      border.userData.outline = true;
      this.logo.add(border);
      this.outlines.push(border);
    }
    this.host.dataset.vertices = String(
      meshes.reduce((n, m) => n + m.positions.length / 3, 0),
    );
    this.host.dataset.revision = String(
      Number(this.host.dataset.revision ?? 0) + 1,
    );
    this.host.dataset.depth = String(this.settings.depth);
    this.floorBase = -(height / Math.max(width, height)) * 3 - 0.06;
    this.apply(this.settings, this.face.color.getStyle());
    this.invalidate();
  }
  private apply(settings: RenderSettings, ink: string) {
    this.settings = settings;
    this.face.color.set(ink);
    this.face.roughness = settings.roughness;
    this.face.metalness = settings.metalness;
    this.side.color.set(settings.separateSide ? settings.sideColor : ink);
    this.side.roughness = settings.roughness;
    this.side.metalness = settings.metalness;
    this.outline.color.set(settings.outlineColor);
    for (const border of this.outlines) {
      border.visible = settings.outline > 0;
      border.scale.setScalar(1 + settings.outline * 0.009);
    }
    this.shadowMaterial.opacity = settings.shadow;
    this.floor.visible = settings.shadow > 0;
    this.floor.position.y = this.floorBase - settings.elevation;
    this.key.shadow.radius = settings.shadowSoftness;
    this.key.intensity = settings.light;
    const angle = (settings.lightAngle * Math.PI) / 180;
    this.key.position.set(
      Math.sin(angle) * 7,
      settings.lightHeight,
      Math.cos(angle) * 7,
    );
    this.logo.rotation.set(
      (settings.rotationX * Math.PI) / 180,
      (settings.rotationY * Math.PI) / 180,
      (settings.rotationZ * Math.PI) / 180,
    );
    this.autoRotate = settings.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.scene.background = settings.transparent
      ? null
      : new Color(settings.background);
    this.invalidate();
  }
  private resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.width = r.width;
    this.height = r.height;
    this.renderer.setSize(r.width, r.height);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  private visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
    } else this.invalidate();
  };
  private invalidate = () => {
    if (!this.frame && !this.disposed && !document.hidden)
      this.frame = requestAnimationFrame(this.draw);
  };
  private draw = (time: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden) return;
    const delta = this.lastTime
      ? Math.min(0.05, (time - this.lastTime) / 1000)
      : 1 / 60;
    this.lastTime = time;
    const moving = this.controls.update(delta);
    this.renderer.render(this.scene, this.camera);
    if (moving || this.autoRotate) this.invalidate();
    else this.lastTime = 0;
  };
  reset() {
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.reset();
    this.invalidate();
  }
  zoom(percent: number) {
    this.camera.zoom = percent / 100;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  view(front: boolean) {
    if (front) {
      this.camera.position.set(0, 0, 10);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    } else this.reset();
    this.invalidate();
  }
  async png(): Promise<Blob> {
    const pixelRatio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(2);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.render(this.scene, this.camera);
    const result = await new Promise<Blob>((resolve, reject) =>
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG unavailable"))),
        "image/png",
      ),
    );
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.invalidate();
    return result;
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.worker.terminate();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.controls.dispose();
    for (const child of this.logo.children)
      if (child instanceof Mesh && !child.userData.outline)
        child.geometry.dispose();
    this.floor.geometry.dispose();
    this.face.dispose();
    this.side.dispose();
    this.outline.dispose();
    this.shadowMaterial.dispose();
    this.key.shadow.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
