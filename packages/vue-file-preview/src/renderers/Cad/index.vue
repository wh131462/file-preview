<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DXFLoader } from 'three-dxf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import { getCadToolbarGroups } from './toolbar';

interface Props {
  url: string;
  file?: File;
  fileName?: string;
}

const props = defineProps<Props>();
const { t } = useTranslator();
const fetcher = useFetcher();

const containerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const wireframe = ref(false);
const showGrid = ref(true);
const showAxes = ref(true);

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let model: THREE.Object3D | null = null;
let grid: THREE.GridHelper | null = null;
let axes: THREE.AxesHelper | null = null;
let animationId: number | null = null;
let abortController: AbortController | null = null;
let isCleanedUp = false;

const toolbarEmitter = new ToolbarEventEmitter();

// 获取文件扩展名
const getExtension = (url: string, fileName?: string, file?: File): string => {
  // 优先从 file.name 获取
  if (file?.name) {
    return file.name.split('.').pop()?.toLowerCase() || '';
  }
  // 其次从 fileName 获取
  if (fileName) {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }
  // 最后从 URL 获取（但 blob URL 没有扩展名）
  return url.split('.').pop()?.toLowerCase().split('?')[0] || '';
};

// 重置视图
const resetView = () => {
  if (!controls || !camera || !model) return;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.5;

  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
};

// 切换线框模式
const toggleWireframe = () => {
  wireframe.value = !wireframe.value;
  if (model) {
    model.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;
        if (material) {
          if (Array.isArray(material)) {
            material.forEach((mat: any) => {
              mat.wireframe = wireframe.value;
            });
          } else {
            material.wireframe = wireframe.value;
          }
        }
      }
    });
  }
  toolbarEmitter.notify();
};

// 切换网格
const toggleGrid = () => {
  showGrid.value = !showGrid.value;
  if (grid) {
    grid.visible = showGrid.value;
  }
  toolbarEmitter.notify();
};

// 切换坐标轴
const toggleAxes = () => {
  showAxes.value = !showAxes.value;
  if (axes) {
    axes.visible = showAxes.value;
  }
  toolbarEmitter.notify();
};

// 暴露 RendererHandle 接口
defineExpose<RendererHandle>({
  getToolbarGroups: () => {
    return getCadToolbarGroups({
      cadRef: { resetView, toggleWireframe, toggleGrid, toggleAxes },
      wireframe: wireframe.value,
      showGrid: showGrid.value,
      showAxes: showAxes.value,
      t: t.value,
    });
  },
  onToolbarChange: (listener: () => void) => {
    return toolbarEmitter.subscribe(listener);
  },
});

// 释放 THREE.js 资源
const disposeThreeResources = (obj: THREE.Object3D) => {
  obj.traverse((child: any) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat: any) => {
          disposeMaterial(mat);
        });
      } else {
        disposeMaterial(child.material);
      }
    }
  });
};

const disposeMaterial = (material: any) => {
  if (material.map) material.map.dispose();
  if (material.lightMap) material.lightMap.dispose();
  if (material.bumpMap) material.bumpMap.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.specularMap) material.specularMap.dispose();
  if (material.envMap) material.envMap.dispose();
  material.dispose();
};

// 初始化场景
const initScene = () => {
  if (!containerRef.value) return;

  // 重置清理状态
  isCleanedUp = false;
  abortController = new AbortController();

  const container = containerRef.value;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // 创建相机
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.set(100, 100, 100);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);

  // 添加网格
  grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
  grid.visible = showGrid.value;
  scene.add(grid);

  // 添加坐标轴
  axes = new THREE.AxesHelper(100);
  axes.visible = showAxes.value;
  scene.add(axes);

  // 加载模型
  loadModel();

  // 动画循环
  const animate = () => {
    if (isCleanedUp) return;
    animationId = requestAnimationFrame(animate);
    controls?.update();
    if (scene && camera && renderer) {
      renderer.render(scene, camera);
    }
  };
  animate();

  // 处理窗口大小变化
  window.addEventListener('resize', handleResize);
};

// 加载模型
const loadModel = () => {
  if (!scene || !camera || !controls || isCleanedUp) return;

  const ext = getExtension(props.url, props.fileName, props.file);
  let loader: any;

  // 创建 LoadingManager
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
    error.value = t.value('cad.parse_failed');
    loading.value = false;
    return;
  }

  // 处理加载成功
  const handleLoadSuccess = (object: any, ext: string) => {
    if (isCleanedUp) return;

    // 验证对象有效性
    if (!object) {
      error.value = t.value('cad.parse_failed');
      loading.value = false;
      return;
    }

    let loadedModel: THREE.Object3D;

    if (ext === 'stl') {
      // STL 返回 geometry
      const geometry = object as THREE.BufferGeometry;
      const material = new THREE.MeshPhongMaterial({
        color: 0x888888,
        flatShading: true,
        side: THREE.DoubleSide,
      });
      loadedModel = new THREE.Mesh(geometry, material);
    } else if (ext === 'gltf' || ext === 'glb') {
      // GLTF/GLB 返回 { scene, ... }
      loadedModel = object.scene as THREE.Object3D;
    } else {
      // DXF 和 OBJ 返回 Object3D
      loadedModel = object as THREE.Object3D;

      // 为没有材质的对象添加默认材质
      loadedModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh && !child.material) {
          child.material = new THREE.MeshPhongMaterial({
            color: 0x888888,
            side: THREE.DoubleSide,
          });
        }
      });
    }

    scene!.add(loadedModel);
    model = loadedModel;

    // 自动调整视角
    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera!.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    camera!.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    camera!.lookAt(center);
    controls!.target.copy(center);
    controls!.update();

    loading.value = false;
    toolbarEmitter.notify();
  };

  // 处理加载错误
  const handleLoadError = (err: any) => {
    if (isCleanedUp) return;
    if (err.name === 'AbortError') {
      return;
    }
    error.value = t.value('cad.load_failed');
    loading.value = false;
  };

  // 如果有 File 对象，直接读取；否则使用 fetcher
  const loadPromise = props.file
    ? props.file.arrayBuffer()
    : fetcher.value(props.url, { signal: abortController?.signal }).then(response => {
        if (isCleanedUp) return undefined;
        if (!response.ok) throw new Error('Failed to fetch file');
        return response.arrayBuffer();
      });

  loadPromise
    .then((data: ArrayBuffer | undefined) => {
      if (isCleanedUp || !data) return;

      if (ext === 'stl') {
        const object = loader.parse(data);
        handleLoadSuccess(object, ext);
      } else if (ext === 'obj') {
        // OBJLoader 需要字符串，转换 ArrayBuffer
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(data);
        const object = loader.parse(text);
        handleLoadSuccess(object, ext);
      } else if (ext === 'gltf' || ext === 'glb') {
        loader.parse(
          data,
          '',
          (gltf: any) => {
            if (!isCleanedUp) {
              handleLoadSuccess(gltf, ext);
            }
          },
          (err: any) => handleLoadError(err)
        );
      } else if (ext === 'dxf') {
        // DXFLoader 需要字符串
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(data);

        // three-dxf-loader 对某些实体（如 3D polyface mesh）会生成 undefined 顶点，
        // 导致 THREE.BufferGeometry.setFromPoints 抛 "reading 'x'"。
        // 临时 patch 过滤坏点，加载完成后立即恢复。
        const origSetFromPoints = (THREE.BufferGeometry.prototype as any).setFromPoints;
        (THREE.BufferGeometry.prototype as any).setFromPoints = function (points: any[]) {
          const filtered = (points || []).filter(
            (p: any) => p && p.x !== undefined && p.y !== undefined
          );
          return origSetFromPoints.call(this, filtered);
        };

        try {
          (loader as any).loadString(
            text,
            (dxfData: any) => {
              if (!isCleanedUp) {
                // three-dxf-loader 返回的是 { entity: Object3D }
                const obj = dxfData?.entity || dxfData;
                handleLoadSuccess(obj, ext);
              }
            },
            (err: any) => {
              handleLoadError(err);
            }
          );
        } catch (err) {
          // loadString 可能同步抛出解析错误
          handleLoadError(err);
        } finally {
          (THREE.BufferGeometry.prototype as any).setFromPoints = origSetFromPoints;
        }
      }
    })
    .catch((err) => {
      if (!isCleanedUp) {
        handleLoadError(err);
      }
    });
};

// 处理窗口大小变化
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer || isCleanedUp) return;
  const newWidth = containerRef.value.clientWidth;
  const newHeight = containerRef.value.clientHeight;
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(newWidth, newHeight);
};

// 清理
const cleanup = () => {
  isCleanedUp = true;
  if (abortController) {
    abortController.abort();
  }
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  window.removeEventListener('resize', handleResize);

  // 释放 THREE.js 资源
  if (model) {
    disposeThreeResources(model);
    scene?.remove(model);
    model = null;
  }
  if (grid) {
    grid.geometry.dispose();
    (grid.material as any).dispose();
    scene?.remove(grid);
    grid = null;
  }
  if (axes) {
    axes.geometry.dispose();
    (axes.material as any).dispose();
    scene?.remove(axes);
    axes = null;
  }

  controls?.dispose();
  renderer?.dispose();
  if (containerRef.value && renderer?.domElement && containerRef.value.contains(renderer.domElement)) {
    containerRef.value.removeChild(renderer.domElement);
  }

  scene = null;
  camera = null;
  renderer = null;
  controls = null;
};

onMounted(() => {
  initScene();
});

onUnmounted(() => {
  cleanup();
});

watch(() => props.url, () => {
  cleanup();
  loading.value = true;
  error.value = null;
  if (containerRef.value) {
    initScene();
  }
});
</script>

<template>
  <div ref="containerRef" class="vfp-relative vfp-w-full vfp-h-full vfp-bg-media-bg">
    <!-- 错误覆盖层 -->
    <div
      v-if="error"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-surface-3 vfp-z-10"
    >
      <div class="vfp-text-center">
        <p class="vfp-text-fg-primary">{{ error }}</p>
      </div>
    </div>

    <!-- 加载覆盖层 -->
    <div
      v-if="loading"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-surface-3 vfp-z-10"
    >
      <div class="vfp-text-center">
        <div class="vfp-inline-block vfp-w-8 vfp-h-8 vfp-border-4 vfp-border-spinner-track vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin" />
        <p class="vfp-mt-4 vfp-text-fg-secondary">{{ t('cad.loading') }}</p>
      </div>
    </div>
  </div>
</template>
