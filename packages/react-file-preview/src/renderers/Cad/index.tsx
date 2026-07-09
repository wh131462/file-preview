import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DXFLoader } from 'three-dxf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import type { RendererHandle } from '../base.types';
import { getCadToolbarGroups } from './toolbar';

export interface CadRendererProps {
  url: string;
  file?: File;
  fileName?: string;
}

export const CadRenderer = forwardRef<RendererHandle, CadRendererProps>(({ url, file, fileName }, ref) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const cadRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  const listenersRef = useRef<Set<() => void>>(new Set());

  const notifyToolbarChange = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

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

  // 释放 THREE.js 资源
  const disposeThreeResources = useCallback((obj: THREE.Object3D) => {
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
  }, []);

  const disposeMaterial = (material: any) => {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
  };

  // 重置视图
  const resetView = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current || !modelRef.current) return;

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    cameraRef.current.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    cameraRef.current.lookAt(center);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  // 切换线框模式
  const toggleWireframe = useCallback(() => {
    setWireframe((prev) => {
      const newWireframe = !prev;
      if (modelRef.current) {
        modelRef.current.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material;
            if (material) {
              if (Array.isArray(material)) {
                material.forEach((mat: any) => {
                  mat.wireframe = newWireframe;
                });
              } else {
                (material as any).wireframe = newWireframe;
              }
            }
          }
        });
      }
      notifyToolbarChange();
      return newWireframe;
    });
  }, [notifyToolbarChange]);

  // 切换网格
  const toggleGrid = useCallback(() => {
    setShowGrid((prev) => {
      const newShow = !prev;
      if (gridRef.current) {
        gridRef.current.visible = newShow;
      }
      notifyToolbarChange();
      return newShow;
    });
  }, [notifyToolbarChange]);

  // 切换坐标轴
  const toggleAxes = useCallback(() => {
    setShowAxes((prev) => {
      const newShow = !prev;
      if (axesRef.current) {
        axesRef.current.visible = newShow;
      }
      notifyToolbarChange();
      return newShow;
    });
  }, [notifyToolbarChange]);

  // 构建 cadRef handle
  cadRef.current = {
    resetView,
    toggleWireframe,
    toggleGrid,
    toggleAxes,
  };

  useImperativeHandle(
    ref,
    () => ({
      getToolbarGroups: () => {
        return getCadToolbarGroups({
          cadRef: { current: cadRef.current },
          wireframe,
          showGrid,
          showAxes,
          t,
        });
      },
      onToolbarChange: (listener: () => void) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [wireframe, showGrid, showAxes, t]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建 AbortController 来支持取消请求
    const abortController = new AbortController();
    let animationId: number;
    let isCleanedUp = false;

    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // 初始化相机
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // 初始化渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 初始化控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

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
    const grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    grid.visible = showGrid;
    scene.add(grid);
    gridRef.current = grid;

    // 添加坐标轴
    const axes = new THREE.AxesHelper(100);
    axes.visible = showAxes;
    scene.add(axes);
    axesRef.current = axes;

    // 加载模型 - 优先使用 File 对象，回退到 fetcher
    const ext = getExtension(url, fileName, file);
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
      setError(t('cad.parse_failed'));
      setLoading(false);
      return;
    }

    // 如果有 File 对象，直接读取；否则使用 fetcher
    const loadPromise = file
      ? file.arrayBuffer()
      : fetcher(url, { signal: abortController.signal }).then((response) => {
          if (isCleanedUp) return undefined;
          if (!response.ok) throw new Error('Failed to fetch file');
          return response.arrayBuffer();
        });

    loadPromise
      .then((data: ArrayBuffer | undefined) => {
        if (isCleanedUp || !data) return;

        if (ext === 'stl') {
          const object = loader.parse(data);
          handleLoadSuccess(object, ext, scene, camera, controls);
        } else if (ext === 'obj') {
          // OBJLoader 需要字符串，转换 ArrayBuffer
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(data);
          const object = loader.parse(text);
          handleLoadSuccess(object, ext, scene, camera, controls);
        } else if (ext === 'gltf' || ext === 'glb') {
          loader.parse(
            data,
            '',
            (gltf: any) => {
              if (!isCleanedUp) {
                handleLoadSuccess(gltf, ext, scene, camera, controls);
              }
            },
            (err: Error) => handleLoadError(err)
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
                  handleLoadSuccess(obj, ext, scene, camera, controls);
                }
              },
              (err: Error) => {
                handleLoadError(err);
              }
            );
          } catch (err: any) {
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

    // 处理加载成功
    const handleLoadSuccess = (
      object: any,
      ext: string,
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      controls: OrbitControls
    ) => {
      if (isCleanedUp) return;

      // 验证对象有效性
      if (!object) {
        setError(t('cad.parse_failed'));
        setLoading(false);
        return;
      }

      let model: THREE.Object3D;

      if (ext === 'stl') {
        // STL 返回 geometry
        const geometry = object as THREE.BufferGeometry;
        const material = new THREE.MeshPhongMaterial({
          color: 0x888888,
          flatShading: true,
          side: THREE.DoubleSide,
        });
        model = new THREE.Mesh(geometry, material);
      } else if (ext === 'gltf' || ext === 'glb') {
        // GLTF/GLB 返回 { scene, ... }
        model = object.scene as THREE.Object3D;
      } else {
        // DXF 和 OBJ 返回 Object3D
        model = object as THREE.Object3D;

        // 为没有材质的对象添加默认材质
        model.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !child.material) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0x888888,
              side: THREE.DoubleSide,
            });
          }
        });
      }

      scene.add(model);
      modelRef.current = model;

      // 自动调整视角
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

      setLoading(false);
      notifyToolbarChange();
    };

    // 处理加载错误
    const handleLoadError = (err: Error) => {
      if (isCleanedUp) return;
      if (err.name === 'AbortError') {
        return;
      }
      setError(t('cad.load_failed'));
      setLoading(false);
    };

    // 动画循环
    const animate = () => {
      if (isCleanedUp) return;
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      if (!container || isCleanedUp) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      isCleanedUp = true;
      abortController.abort();
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener('resize', handleResize);

      // 释放 THREE.js 资源
      if (modelRef.current) {
        disposeThreeResources(modelRef.current);
        scene.remove(modelRef.current);
        modelRef.current = null;
      }
      if (gridRef.current) {
        gridRef.current.geometry.dispose();
        (gridRef.current.material as any).dispose();
        scene.remove(gridRef.current);
        gridRef.current = null;
      }
      if (axesRef.current) {
        axesRef.current.geometry.dispose();
        (axesRef.current.material as any).dispose();
        scene.remove(axesRef.current);
        axesRef.current = null;
      }

      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [url, t, notifyToolbarChange, disposeThreeResources, file, fetcher]);

  return (
    <div ref={containerRef} className="rfp-relative rfp-w-full rfp-h-full rfp-bg-media-bg">
      {/* 错误覆盖层 */}
      {error && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-3 rfp-z-10">
          <div className="rfp-text-center">
            <p className="rfp-text-fg-primary">{error}</p>
          </div>
        </div>
      )}

      {/* 加载覆盖层 */}
      {loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-3 rfp-z-10">
          <div className="rfp-text-center">
            <div className="rfp-inline-block rfp-w-8 rfp-h-8 rfp-border-4 rfp-border-spinner-track rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
            <p className="rfp-mt-4 rfp-text-fg-secondary">{t('cad.loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
});

CadRenderer.displayName = 'CadRenderer';
