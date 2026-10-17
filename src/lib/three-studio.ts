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
  type DataTexture,
  type Object3D,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  VSMShadowMap,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Design, RenderSettings } from "@/engine/model";
import type { Paint } from "@/state/studio";
import { PaintTexture } from "./paint-texture";
import type { MeshData } from "@/engine/mesh-types";
import { buildMesh, geometryKeys } from "@/engine/mesh-service";
import { profiling, recordPerformance } from "./performance";
type GeometryEntry = {
  children: Object3D[];
  outlines: Mesh[];
  width: number;
  height: number;
  vertices: number;
  bytes: number;
};

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
  private enabled = true;
  private serial = 0;
  private disposed = false;
  private preparing = false;
  private frame = 0;
  private lastTime = 0;
  private autoRotate = false;
  private resizeObserver: ResizeObserver;
  private width = 1;
  private height = 1;
  private settings: RenderSettings;
  private builtKey = "";
  private outlines: Mesh[] = [];
  private geometryCache = new Map<string, GeometryEntry>();
  private floorBase = 0;
  private paint: Paint = { color: "#2563eb" };
  private texture = new PaintTexture();
  private documentWidth = 1;
  private documentHeight = 1;
  private shadowKey = "";
  private backgroundColor = new Color();
  private onReady: (error?: string) => void;
  constructor(
    private host: HTMLElement,
    settings: RenderSettings,
    onReady: (error?: string) => void,
    private environment: DataTexture,
  ) {
    const start = performance.now();
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
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = VSMShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "3D");
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    this.host.append(this.renderer.domElement);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.55;
    this.scene.add(
      new AmbientLight("#ffffff", 0.25),
      new HemisphereLight("#ffffff", "#7786a8", 1.1),
      this.logo,
    );
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(512, 512);
    this.key.shadow.camera.left = -5;
    this.key.shadow.camera.right = 5;
    this.key.shadow.camera.top = 5;
    this.key.shadow.camera.bottom = -5;
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 35;
    this.key.shadow.bias = -0.0001;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.blurSamples = 4;
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
    this.controls.enableZoom = false;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 1.3;
    this.controls.maxDistance = 25;
    this.controls.autoRotateSpeed = 0.75;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.controls.addEventListener("change", this.invalidate);
    this.controls.addEventListener("start", this.invalidate);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    document.addEventListener("visibilitychange", this.visibility);
    this.resize();
    this.apply(settings, this.paint);
    recordPerformance("3d:initialize", start);
  }
  get canvas() {
    return this.renderer.domElement;
  }
  update(
    design: Design,
    mode: "wordmark" | "symbol" | "shapes",
    selected: number,
    paint: Paint,
  ) {
    this.apply(design.render, paint);
    const { meshKey } = geometryKeys(design, mode, selected);
    if (meshKey === this.builtKey) return;
    this.builtKey = meshKey;
    const serial = ++this.serial;
    this.host.dataset.pending = "true";
    const cached = this.geometryCache.get(meshKey);
    if (cached) {
      this.geometryCache.delete(meshKey);
      this.geometryCache.set(meshKey, cached);
      this.activateGeometry(cached);
      this.prepareShaders(serial);
      return;
    }
    const start = performance.now();
    void buildMesh(design, mode, selected)
      .then((reply) => {
        recordPerformance("3d:mesh-request", start);
        if (this.disposed || serial !== this.serial || !reply) return;
        if (reply.error) {
          delete this.host.dataset.pending;
          this.preparing = false;
          this.onReady(reply.error);
        } else if (reply.meshes) {
          this.replaceGeometry(reply.meshes, reply.width!, reply.height!);
          this.prepareShaders(serial);
        }
      })
      .catch(() => {
        if (this.disposed || serial !== this.serial) return;
        this.builtKey = "";
        this.preparing = false;
        delete this.host.dataset.pending;
        this.onReady("3D geometry unavailable");
      });
  }
  private prepareShaders(serial: number) {
    const start = performance.now();
    this.preparing = true;
    void this.renderer
      .compileAsync(this.scene, this.camera)
      .then(() => {
        if (this.disposed || serial !== this.serial) return;
        this.preparing = false;
        delete this.host.dataset.pending;
        recordPerformance("3d:compile", start);
        this.onReady();
        this.invalidate();
      })
      .catch(() => {
        if (this.disposed || serial !== this.serial) return;
        this.preparing = false;
        delete this.host.dataset.pending;
        this.onReady("Shader compilation unavailable");
      });
  }
  setActive(active: boolean) {
    if (this.enabled === active) return;
    this.enabled = active;
    this.controls.enabled = active;
    if (active) {
      this.resize();
      this.invalidate();
    } else {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
    }
  }

  private replaceGeometry(meshes: MeshData[], width: number, height: number) {
    const start = performance.now();
    const children: Object3D[] = [],
      outlines: Mesh[] = [];
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
      children.push(mesh);
      const border = new Mesh(geometry, this.outline);
      border.userData.outline = true;
      children.push(border);
      outlines.push(border);
    }
    const entry = {
      children,
      outlines,
      width,
      height,
      vertices: meshes.reduce((n, m) => n + m.positions.length / 3, 0),
      bytes: meshes.reduce(
        (n, m) =>
          n + m.positions.byteLength + m.normals.byteLength + m.uvs.byteLength,
        0,
      ),
    };
    this.geometryCache.set(this.builtKey, entry);
    this.activateGeometry(entry);
    let total = [...this.geometryCache.values()].reduce(
      (n, e) => n + e.bytes,
      0,
    );
    while (
      this.geometryCache.size > 8 ||
      (total > 24 * 1024 * 1024 && this.geometryCache.size > 1)
    ) {
      const key = this.geometryCache.keys().next().value!,
        oldest = this.geometryCache.get(key)!;
      this.disposeGeometry(oldest);
      total -= oldest.bytes;
      this.geometryCache.delete(key);
    }
    recordPerformance("3d:buffers", start);
  }
  private disposeGeometry(entry: GeometryEntry) {
    for (const child of entry.children)
      if (child instanceof Mesh && !child.userData.outline)
        child.geometry.dispose();
  }
  private activateGeometry(entry: GeometryEntry) {
    // remove() mutates children; iterate a snapshot so no mesh is skipped.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const child of [...this.logo.children]) this.logo.remove(child);
    this.logo.add(...entry.children);
    this.outlines = entry.outlines;
    this.host.dataset.vertices = String(entry.vertices);
    this.host.dataset.revision = String(
      Number(this.host.dataset.revision ?? 0) + 1,
    );
    this.host.dataset.depth = String(this.settings.depth);
    this.floorBase =
      -(entry.height / Math.max(entry.width, entry.height)) * 3 - 0.06;
    this.documentWidth = entry.width;
    this.documentHeight = entry.height;
    this.renderer.shadowMap.needsUpdate = true;
    this.apply(this.settings, this.paint);
    this.invalidate();
  }
  private apply(settings: RenderSettings, paint: Paint) {
    const start = performance.now();
    this.settings = settings;
    this.paint = paint;
    const map = this.texture.update(
      paint.gradient,
      this.documentWidth,
      this.documentHeight,
    );
    if (!!this.face.map !== !!map) this.face.needsUpdate = true;
    this.face.map = map;
    this.face.color.set(paint.gradient ? "#ffffff" : paint.color);
    this.face.roughness = settings.roughness;
    this.face.metalness = settings.metalness;
    const sideMap = settings.separateSide ? this.texture.solid : map;
    if (!!this.side.map !== !!sideMap) this.side.needsUpdate = true;
    this.side.map = sideMap;
    this.side.color.set(
      settings.separateSide
        ? settings.sideColor
        : paint.gradient
          ? "#ffffff"
          : paint.color,
    );
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
    this.backgroundColor.set(settings.background);
    this.scene.background = settings.transparent ? null : this.backgroundColor;
    const shadowKey = JSON.stringify([
      settings.rotationX,
      settings.rotationY,
      settings.rotationZ,
      settings.elevation,
      settings.shadow,
      settings.shadowSoftness,
      settings.lightAngle,
      settings.lightHeight,
    ]);
    if (shadowKey !== this.shadowKey) {
      this.shadowKey = shadowKey;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.host.dataset.paint = paint.gradient
      ? JSON.stringify(paint.gradient)
      : paint.color;
    this.invalidate();
    recordPerformance("3d:paint", start);
  }
  private resize() {
    if (!this.enabled) return;
    // Layout dimensions ignore the entrance transform; a scale tween must not
    // resize the drawing buffer or change the camera's aspect ratio.
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    if (!width || !height) return;
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
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
    if (!this.frame && !this.disposed && !document.hidden && this.enabled)
      this.frame = requestAnimationFrame(this.draw);
  };
  private draw = (time: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden || !this.enabled || this.preparing)
      return;
    const delta = this.lastTime
      ? Math.min(0.05, (time - this.lastTime) / 1000)
      : 1 / 60;
    this.lastTime = time;
    const moving = this.controls.update(delta);
    const start = performance.now();
    this.renderer.render(this.scene, this.camera);
    recordPerformance("3d:frame-cpu", start);
    if (profiling)
      this.host.dataset.frames = String(
        Number(this.host.dataset.frames ?? 0) + 1,
      );
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
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.controls.dispose();
    for (const entry of this.geometryCache.values())
      this.disposeGeometry(entry);
    this.geometryCache.clear();
    this.floor.geometry.dispose();
    this.face.dispose();
    this.texture.dispose();
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
