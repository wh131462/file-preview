import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-expect-error three-dxf-loader has no types
import { DXFLoader } from 'three-dxf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { getCadToolbarGroups } from './toolbar';

function getAssetBasePath(url: string): string {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return '';
  try {
    return new URL('.', new URL(url, document.baseURI)).href;
  } catch {
    return '';
  }
}

function fitCameraToModel(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  center: THREE.Vector3,
  maxDim: number,
): void {
  const safeMaxDim = Number.isFinite(maxDim) && maxDim > 0 ? maxDim : 1;
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(safeMaxDim / 2 / Math.tan(fov / 2)) * 1.5;

  camera.near = Math.max(safeMaxDim * 1e-3, 1e-4);
  camera.far = Math.max(cameraZ * 4, center.length() * 2 + safeMaxDim * 4, camera.near * 100);
  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
  camera.updateProjectionMatrix();
}

@Component({
  selector: 'afp-cad-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div #containerRef class="afp-relative afp-w-full afp-h-full afp-bg-media-bg">
      @if (error()) {
        <afp-renderer-error [message]="error()!" class="afp-absolute afp-inset-0 afp-bg-surface-3 afp-z-10" />
      }

      @if (loading()) {
        <div class="afp-absolute afp-inset-0 afp-renderer-loading afp-bg-surface-3 afp-z-10">
          <div class="afp-renderer-loading-content">
            <div class="afp-renderer-spinner"></div>
            <p class="afp-renderer-loading-text afp-text-fg-secondary">{{ t('cad.loading') }}</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class CadRenderer implements RendererHandle {
  url = input.required<string>();
  file = input<File | undefined>(undefined);
  fileName = input<string | undefined>(undefined);
  baseUrl = input<string | undefined>(undefined);

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  private readonly toolbarEmitter = new ToolbarEventEmitter();
  private readonly mounted = signal(false);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly wireframe = signal(false);
  readonly showGrid = signal(true);
  readonly showAxes = signal(true);

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private model: THREE.Object3D | null = null;
  private grid: THREE.GridHelper | null = null;
  private axes: THREE.AxesHelper | null = null;
  private animationId: number | null = null;
  private abortController: AbortController | null = null;
  private isCleanedUp = false;
  private renderPending = true;

  constructor() {
    afterNextRender(() => this.mounted.set(true));

    effect(() => {
      const url = this.url();
      const mounted = this.mounted();
      if (!mounted || !url) return;
      untracked(() => {
        this.cleanup();
        this.loading.set(true);
        this.error.set(null);
        this.initScene();
      });
    });

    inject(DestroyRef).onDestroy(() => this.cleanup());
  }

  getToolbarGroups = (): ToolbarGroup[] => {
    return getCadToolbarGroups({
      cadRef: {
        resetView: () => this.resetView(),
        toggleWireframe: () => this.toggleWireframe(),
        toggleGrid: () => this.toggleGrid(),
        toggleAxes: () => this.toggleAxes(),
      },
      wireframe: this.wireframe(),
      showGrid: this.showGrid(),
      showAxes: this.showAxes(),
      t: this.t,
    });
  };

  onToolbarChange = (listener: () => void) => this.toolbarEmitter.subscribe(listener);

  private getExtension(url: string, fileName?: string, file?: File): string {
    if (file?.name) {
      return file.name.split('.').pop()?.toLowerCase() || '';
    }
    if (fileName) {
      return fileName.split('.').pop()?.toLowerCase() || '';
    }
    return url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  }

  private resetView(): void {
    if (!this.controls || !this.camera || !this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    fitCameraToModel(this.camera, this.controls, center, maxDim);
    this.renderPending = true;
  }

  private toggleWireframe(): void {
    this.wireframe.update((v) => !v);
    const wf = this.wireframe();
    if (this.model) {
      this.model.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material;
          if (material) {
            if (Array.isArray(material)) {
              material.forEach((mat: any) => {
                mat.wireframe = wf;
              });
            } else {
              material.wireframe = wf;
            }
          }
        }
      });
    }
    this.renderPending = true;
    this.toolbarEmitter.notify();
  }

  private toggleGrid(): void {
    this.showGrid.update((v) => !v);
    if (this.grid) {
      this.grid.visible = this.showGrid();
    }
    this.renderPending = true;
    this.toolbarEmitter.notify();
  }

  private toggleAxes(): void {
    this.showAxes.update((v) => !v);
    if (this.axes) {
      this.axes.visible = this.showAxes();
    }
    this.renderPending = true;
    this.toolbarEmitter.notify();
  }

  // 根据模型包围盒调整参考物大小，避免 OBJ/STL 单位差异造成参考线比例失真
  private updateReferenceHelpers(box: THREE.Box3): void {
    if (!this.scene) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const safeMaxDim = Number.isFinite(maxDim) && maxDim > 0 ? maxDim : 1;
    const rawExtent = Math.max(
      Math.abs(box.min.x), Math.abs(box.max.x),
      Math.abs(box.min.y), Math.abs(box.max.y),
      Math.abs(box.min.z), Math.abs(box.max.z),
    );
    const extent = Number.isFinite(rawExtent) ? rawExtent : safeMaxDim;
    const axesSize = Math.max(safeMaxDim, extent * 1.25);
    const gridSize = Math.max(safeMaxDim * 2, extent * 2.5);

    if (this.grid) {
      this.grid.geometry.dispose();
      (this.grid.material as any).dispose();
      this.scene.remove(this.grid);
    }
    if (this.axes) {
      this.axes.geometry.dispose();
      (this.axes.material as any).dispose();
      this.scene.remove(this.axes);
    }

    this.grid = new THREE.GridHelper(gridSize, 20, 0x444444, 0x222222);
    this.grid.visible = this.showGrid();
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(axesSize);
    this.axes.visible = this.showAxes();
    this.scene.add(this.axes);
  }

  private disposeMaterial(material: any): void {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
  }

  private disposeThreeResources(obj: THREE.Object3D): void {
    obj.traverse((child: any) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            this.disposeMaterial(mat);
          });
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });
  }

  private initScene(): void {
    const container = this.container()?.nativeElement;
    if (!container) return;

    this.isCleanedUp = false;
    this.abortController = new AbortController();

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1_000_000);
    this.camera.position.set(100, 100, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderPending = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-1, -1, -1);
    this.scene.add(directionalLight2);

    this.loadModel();

    const animate = () => {
      if (this.isCleanedUp) return;
      this.animationId = requestAnimationFrame(animate);
      const cameraChanged = this.controls?.update();
      if ((cameraChanged || this.renderPending) && this.scene && this.camera && this.renderer) {
        this.renderer.render(this.scene, this.camera);
        this.renderPending = false;
      }
    };
    animate();

    window.addEventListener('resize', this.handleResize);
  }

  private loadModel(): void {
    if (!this.scene || !this.camera || !this.controls || this.isCleanedUp) return;

    const ext = this.getExtension(this.url(), this.fileName(), this.file());
    let loader: any;

    const manager = new THREE.LoadingManager();

    if (ext === 'dxf') {
      loader = new DXFLoader();
    } else if (ext === 'stl') {
      loader = new STLLoader(manager);
    } else if (ext === 'obj') {
      loader = new OBJLoader(manager);
    } else if (ext === 'gltf' || ext === 'glb') {
      loader = new GLTFLoader(manager);
    } else {
      this.error.set(this.t('cad.parse_failed'));
      this.loading.set(false);
      return;
    }

    const handleLoadSuccess = (object: any, loadedExt: string) => {
      if (this.isCleanedUp) return;

      if (!object) {
        this.error.set(this.t('cad.parse_failed'));
        this.loading.set(false);
        return;
      }

      let loadedModel: THREE.Object3D;

      if (loadedExt === 'stl') {
        const geometry = object as THREE.BufferGeometry;
        const material = new THREE.MeshPhongMaterial({
          color: 0x888888,
          flatShading: true,
          side: THREE.DoubleSide,
        });
        loadedModel = new THREE.Mesh(geometry, material);
      } else if (loadedExt === 'gltf' || loadedExt === 'glb') {
        loadedModel = object.scene as THREE.Object3D;
        if (!loadedModel) {
          this.error.set(this.t('cad.parse_failed'));
          this.loading.set(false);
          return;
        }
      } else {
        loadedModel = object as THREE.Object3D;

        loadedModel.traverse((child: any) => {
          if (child instanceof THREE.Mesh && !child.material) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0x888888,
              side: THREE.DoubleSide,
            });
          }
        });
      }

      const box = new THREE.Box3().setFromObject(loadedModel);
      if (box.isEmpty()) {
        this.error.set(this.t('cad.parse_failed'));
        this.loading.set(false);
        return;
      }
      this.scene!.add(loadedModel);
      this.model = loadedModel;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      this.updateReferenceHelpers(box);
      fitCameraToModel(this.camera!, this.controls!, center, maxDim);
      this.renderPending = true;

      this.loading.set(false);
      this.toolbarEmitter.notify();
    };

    const handleLoadError = (err: any) => {
      if (this.isCleanedUp) return;
      if (err.name === 'AbortError') {
        return;
      }
      this.error.set(this.t('cad.load_failed'));
      this.loading.set(false);
    };

    const file = this.file();
    const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
    const loadPromise = file
      ? file.arrayBuffer()
      : fetcher(this.url(), { signal: this.abortController?.signal }).then(response => {
          if (this.isCleanedUp) return undefined;
          if (!response.ok) throw new Error('Failed to fetch file');
          return response.arrayBuffer();
        });

    loadPromise
      .then((data: ArrayBuffer | undefined) => {
        if (this.isCleanedUp || !data) return;

        if (ext === 'stl') {
          const object = loader.parse(data);
          handleLoadSuccess(object, ext);
        } else if (ext === 'obj') {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(data);
          const object = loader.parse(text);
          handleLoadSuccess(object, ext);
        } else if (ext === 'gltf' || ext === 'glb') {
          loader.parse(
            data,
            getAssetBasePath(this.baseUrl() || this.url()),
            (gltf: any) => {
              if (!this.isCleanedUp) {
                handleLoadSuccess(gltf, ext);
              }
            },
            (err: any) => handleLoadError(err),
          );
        } else if (ext === 'dxf') {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(data);

          const origSetFromPoints = (THREE.BufferGeometry.prototype as any).setFromPoints;
          (THREE.BufferGeometry.prototype as any).setFromPoints = function (points: any[]) {
            const filtered = (points || []).filter(
              (p: any) => p && p.x !== undefined && p.y !== undefined,
            );
            return origSetFromPoints.call(this, filtered);
          };

          try {
            (loader as any).loadString(
              text,
              (dxfData: any) => {
                if (!this.isCleanedUp) {
                  const obj = dxfData?.entity || dxfData;
                  handleLoadSuccess(obj, ext);
                }
              },
              (err: any) => {
                handleLoadError(err);
              },
            );
          } catch (err) {
            handleLoadError(err);
          } finally {
            (THREE.BufferGeometry.prototype as any).setFromPoints = origSetFromPoints;
          }
        }
      })
      .catch((err) => {
        if (!this.isCleanedUp) {
          handleLoadError(err);
        }
      });
  }

  private readonly handleResize = (): void => {
    const container = this.container()?.nativeElement;
    if (!container || !this.camera || !this.renderer || this.isCleanedUp) return;
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    this.camera.aspect = newWidth / newHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(newWidth, newHeight);
  };

  private cleanup(): void {
    this.isCleanedUp = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('resize', this.handleResize);

    if (this.model) {
      this.disposeThreeResources(this.model);
      this.scene?.remove(this.model);
      this.model = null;
    }
    if (this.grid) {
      this.grid.geometry.dispose();
      (this.grid.material as any).dispose();
      this.scene?.remove(this.grid);
      this.grid = null;
    }
    if (this.axes) {
      this.axes.geometry.dispose();
      (this.axes.material as any).dispose();
      this.scene?.remove(this.axes);
      this.axes = null;
    }

    this.controls?.dispose();
    this.renderer?.dispose();
    const container = this.container()?.nativeElement;
    if (container && this.renderer?.domElement && container.contains(this.renderer.domElement)) {
      container.removeChild(this.renderer.domElement);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
  }
}
