import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Box3,
  Vector3,
  Quaternion,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MOUSE,
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
import { perspectiveFitDistance } from "./perspective-fit";
import { captureThreePng } from "./capture-three-png";
type GeometryEntry = {
  children: Object3D[];
  outlines: Mesh[];
  width: number;
  height: number;
  vertices: number;
  bytes: number;
  depth: number;
  corners: Vector3[];
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
  private compiled = false;
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
  private liveGeometryContext: string | null = null;
  private displayedGeometrySerial = 0;
  private backgroundColor = new Color();
  private onReady: (error?: string) => void;
  private displaced = false;
  private zoomTarget = 1;
  private meshDepth = 24;
  private geometryCorners: Vector3[] = [];
  private projectedCorners = Array.from({ length: 8 }, () => new Vector3());
  private inverseCameraRotation = new Quaternion();
  private cameraDirection = new Vector3();
  private framingKey = "";
  private panOffset = new Vector3();
  private panAxis = new Vector3();
  private document: {
    design: Design;
    mode: "wordmark" | "symbol" | "shapes";
    selected: number;
  } | null = null;
  constructor(
    private host: HTMLElement,
    settings: RenderSettings,
    onReady: (error?: string) => void,
    private environment: DataTexture,
    private onDisplaced: (displaced: boolean) => void,
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
    this.camera.position.set(0, 0, 10);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.mouseButtons.MIDDLE = MOUSE.PAN;
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
  setPaint(paint: Paint) {
    this.apply(this.settings, paint);
  }
  setRender(settings: RenderSettings, live = false) {
    const document = this.document;
    if (
      document &&
      (settings.depth !== this.settings.depth ||
        settings.bevel !== this.settings.bevel)
    ) {
      this.update(
        { ...document.design, render: settings },
        document.mode,
        document.selected,
        this.paint,
        live,
      );
    } else this.apply(settings, this.paint);
  }
  update(
    design: Design,
    mode: "wordmark" | "symbol" | "shapes",
    selected: number,
    paint: Paint,
    live = false,
  ) {
    const context = JSON.stringify([
      mode,
      selected,
      design.text,
      design.family,
    ]);
    this.liveGeometryContext = live ? context : null;
    this.document = { design, mode, selected };
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
      this.displayedGeometrySerial = serial;
      this.activateGeometry(cached);
      this.prepareShaders(serial);
      return;
    }
    const start = performance.now();
    void buildMesh(design, mode, selected)
      .then((reply) => {
        recordPerformance("3d:mesh-request", start);
        if (this.disposed || !reply || serial < this.displayedGeometrySerial)
          return;
        // While dragging, display the newest completed frame instead of starving
        // the scene whenever the next pointer value arrives before its mesh.
        if (serial !== this.serial && this.liveGeometryContext !== context)
          return;
        if (reply.error) {
          if (serial !== this.serial) return;
          delete this.host.dataset.pending;
          this.preparing = false;
          this.onReady(reply.error);
        } else if (reply.meshes) {
          this.displayedGeometrySerial = serial;
          this.replaceGeometry(
            reply.meshes,
            reply.width!,
            reply.height!,
            design.render.depth,
            meshKey,
          );
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
    // Every mesh has the same attributes and material programs. Swapping
    // contours must not pause rendering for an already compiled shader.
    if (this.compiled) {
      delete this.host.dataset.pending;
      this.preparing = false;
      this.onReady();
      this.invalidate();
      return;
    }
    const start = performance.now();
    this.preparing = true;
    void this.renderer
      .compileAsync(this.scene, this.camera)
      .then(() => {
        if (this.disposed || serial !== this.serial) return;
        this.preparing = false;
        this.compiled = true;
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

  private replaceGeometry(
    meshes: MeshData[],
    width: number,
    height: number,
    depth: number,
    cacheKey: string,
  ) {
    const start = performance.now();
    const children: Object3D[] = [],
      outlines: Mesh[] = [];
    const bounds = new Box3();
    for (const data of meshes) {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
      geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
      geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
      for (const group of data.groups)
        geometry.addGroup(group.start, group.count, group.materialIndex);
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
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
      depth,
      corners: [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map(
            (z) =>
              new Vector3(
                x < 0 ? bounds.min.x : bounds.max.x,
                y < 0 ? bounds.min.y : bounds.max.y,
                z < 0 ? bounds.min.z : bounds.max.z,
              ),
          ),
        ),
      ),
    };
    this.geometryCache.set(cacheKey, entry);
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
    this.meshDepth = entry.depth;
    this.geometryCorners = entry.corners;
    this.framingKey = "";
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
    // Show extrusion depth immediately while the worker prepares exact bevels.
    this.logo.scale.z = settings.depth / this.meshDepth;
    const framingKey = [
      settings.rotationX,
      settings.rotationY,
      settings.rotationZ,
      settings.depth,
      settings.outline,
    ].join(":");
    if (framingKey !== this.framingKey) {
      this.framingKey = framingKey;
      this.fitCamera();
    }
    this.autoRotate = settings.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = settings.autoRotateSpeed;
    this.backgroundColor.set(settings.background);
    this.scene.background = settings.transparent ? null : this.backgroundColor;
    const shadowKey = JSON.stringify([
      settings.rotationX,
      settings.depth,
      settings.bevel,
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
    this.host.dataset.background = settings.transparent
      ? "transparent"
      : settings.background;
    this.host.dataset.rotationSpeed = String(settings.autoRotateSpeed);
    this.invalidate();
    recordPerformance("3d:paint", start);
  }
  private fitCamera() {
    if (!this.geometryCorners.length) return;
    this.logo.updateMatrix();
    this.inverseCameraRotation.copy(this.camera.quaternion).invert();
    const outlineScale = 1 + this.settings.outline * 0.009;
    for (let i = 0; i < this.geometryCorners.length; i++) {
      this.projectedCorners[i]
        .copy(this.geometryCorners[i])
        .multiplyScalar(outlineScale)
        .applyMatrix4(this.logo.matrix)
        .applyQuaternion(this.inverseCameraRotation);
    }
    const distance = perspectiveFitDistance(
      this.projectedCorners,
      this.camera.fov,
      this.camera.aspect,
    );
    this.controls.maxDistance = Math.max(25, distance * 3);
    this.cameraDirection
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(this.cameraDirection, distance);
    this.controls.update();
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
    this.fitCamera();
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
    const zooming = Math.abs(this.camera.zoom - this.zoomTarget) > 0.0001;
    if (zooming) {
      this.camera.zoom +=
        (this.zoomTarget - this.camera.zoom) * (1 - Math.exp(-18 * delta));
      if (Math.abs(this.camera.zoom - this.zoomTarget) < 0.0001)
        this.camera.zoom = this.zoomTarget;
      this.camera.updateProjectionMatrix();
    }
    const moving = this.controls.update(delta);
    const displaced = this.controls.target.lengthSq() > 2.25;
    if (displaced !== this.displaced) {
      this.displaced = displaced;
      this.onDisplaced(displaced);
    }
    const start = performance.now();
    this.renderer.render(this.scene, this.camera);
    recordPerformance("3d:frame-cpu", start);
    if (profiling)
      this.host.dataset.frames = String(
        Number(this.host.dataset.frames ?? 0) + 1,
      );
    if (moving || this.autoRotate || zooming) this.invalidate();
    else this.lastTime = 0;
  };
  reset() {
    this.zoomTarget = 1;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.reset();
    this.fitCamera();
    this.invalidate();
  }
  recenter() {
    const damping = this.controls.enableDamping,
      autoRotate = this.controls.autoRotate;
    this.controls.enableDamping = false;
    this.controls.autoRotate = false;
    this.controls.update();
    this.camera.position.sub(this.controls.target);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.enableDamping = damping;
    this.controls.autoRotate = autoRotate;
    this.displaced = false;
    this.onDisplaced(false);
    this.invalidate();
  }
  panMode(enabled: boolean) {
    this.controls.mouseButtons.LEFT = enabled ? MOUSE.PAN : MOUSE.ROTATE;
  }
  pan(x: number, y: number) {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const units =
      (2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)) /
      (this.height * this.camera.zoom);
    this.panOffset
      .setFromMatrixColumn(this.camera.matrix, 0)
      .multiplyScalar(-x * units);
    this.panAxis
      .setFromMatrixColumn(this.camera.matrix, 1)
      .multiplyScalar(y * units);
    this.panOffset.add(this.panAxis);
    this.camera.position.add(this.panOffset);
    this.controls.target.add(this.panOffset);
    this.controls.update();
    this.invalidate();
  }
  zoom(percent: number, immediate = false) {
    this.zoomTarget = percent / 100;
    if (
      immediate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      this.camera.zoom = this.zoomTarget;
      this.camera.updateProjectionMatrix();
    }
    this.invalidate();
  }
  view(front: boolean) {
    this.camera.position.set(front ? 0 : 1.7, front ? 0 : 1.1, 10);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.fitCamera();
    this.invalidate();
  }
  async png(): Promise<Blob> {
    return captureThreePng({
      renderer: this.renderer,
      canvas: this.canvas,
      viewport: () => ({ width: this.width, height: this.height }),
      render: () => this.renderer.render(this.scene, this.camera),
      isDisposed: () => this.disposed,
      invalidate: this.invalidate,
    });
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
