import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { drawLineBetween2Spot, draw2dLabel, drawSpot } from "./drawFunc";
import { mapConfig } from "./mapConfig";
import { ExtendObject3D } from "./typed";

// 地图元素类型定义
export interface MapElement {
  id: string;
  type: 'label' | 'spot' | 'model' | 'line';
  position: [number, number];
  data?: any;
  object3D?: THREE.Object3D;
}

export interface ModelElement extends MapElement {
  type: 'model';
  modelPath: string;
  scale?: [number, number, number];
  animation?: boolean;
}

export interface LineElement extends MapElement {
  type: 'line';
  startPosition: [number, number];
  endPosition: [number, number];
}

export interface LabelElement extends MapElement {
  type: 'label';
  text: string;
}

export interface SpotElement extends MapElement {
  type: 'spot';
  spotData?: any;
}

// 地图管理器类
export class MapManager {
  private scene: THREE.Scene;
  private mapObject3D: THREE.Object3D;
  private elementsContainer: THREE.Object3D;
  private labelsContainer: THREE.Object3D;
  private spotsContainer: THREE.Object3D;
  private modelsContainer: THREE.Object3D;
  private linesContainer: THREE.Object3D;
  
  // 存储所有元素的映射
  private elements: Map<string, MapElement> = new Map();
  private animatedSpots: any[] = []; // 动画圆环
  private flySpots: any[] = []; // 飞行点
  private modelMixers: THREE.AnimationMixer[] = []; // 模型动画混合器
  
  // 高亮区域相关
  private highlightedRegions: Map<string, {
    meshes: THREE.Mesh[];
    originalMaterials: THREE.Material[];
    timeoutId: NodeJS.Timeout;
  }> = new Map();
  
  // 加载器
  private gltfLoader!: GLTFLoader;
  private dracoLoader!: DRACOLoader;

  constructor(scene: THREE.Scene, mapObject3D: THREE.Object3D) {
    this.scene = scene;
    this.mapObject3D = mapObject3D;
    
    // 创建各种容器
    this.elementsContainer = new THREE.Object3D();
    this.labelsContainer = new THREE.Object3D();
    this.spotsContainer = new THREE.Object3D();
    this.modelsContainer = new THREE.Object3D();
    this.linesContainer = new THREE.Object3D();
    
    // 将容器添加到地图对象
    this.elementsContainer.add(this.labelsContainer);
    this.elementsContainer.add(this.spotsContainer);
    this.elementsContainer.add(this.modelsContainer);
    this.elementsContainer.add(this.linesContainer);
    this.mapObject3D.add(this.elementsContainer);
    
    // 初始化加载器
    this.initLoaders();
  }

  private initLoaders() {
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  // 添加标签
  addLabel(element: LabelElement): Promise<void> {
    return new Promise((resolve) => {
      const labelObject = draw2dLabel(element.position, element.text);
      if (labelObject) {
        element.object3D = labelObject;
        this.labelsContainer.add(labelObject);
        this.elements.set(element.id, element);
      }
      resolve();
    });
  }

  // 添加点位
  addSpot(element: SpotElement): Promise<void> {
    return new Promise((resolve) => {
      const spotObject = drawSpot(element.position);
      if (spotObject && spotObject.circle && spotObject.ring) {
        const container = new THREE.Object3D();
        container.add(spotObject.circle);
        container.add(spotObject.ring);
        
        element.object3D = container;
        element.data = spotObject;
        this.spotsContainer.add(container);
        this.elements.set(element.id, element);
        
        // 添加到动画列表
        this.animatedSpots.push(spotObject.ring);
      }
      resolve();
    });
  }

  // 添加模型
  addModel(element: ModelElement): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        element.modelPath,
        (glb) => {
          const clonedModel = glb.scene.clone();
          
          // 设置模型位置
          clonedModel.position.set(
            element.position[0],
            -element.position[1],
            mapConfig.spotZIndex
          );
          
          // 设置模型大小
          if (element.scale) {
            clonedModel.scale.set(...element.scale);
          } else {
            clonedModel.scale.set(0.3, 0.3, 0.6);
          }
          // 将模型材质改为红色
                clonedModel.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        if (Array.isArray(mesh.material)) {
                            mesh.material.forEach((mat) => {
                                if ((mat as THREE.Material).hasOwnProperty('color')) {
                                    (mat as any).color.set(0xff0000);
                                }
                            });
                        } else if ((mesh.material as any).color) {
                            (mesh.material as any).color.set(0xff0000);
                        }
                    }
                });
          
          // 处理动画
          if (element.animation && glb.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(clonedModel);
            const clonedAnimations = glb.animations.map((clip) => clip.clone());
            clonedAnimations.forEach((clip) => {
              mixer.clipAction(clip).play();
            });
            this.modelMixers.push(mixer);
          }
          
          element.object3D = clonedModel;
          this.modelsContainer.add(clonedModel);
          this.elements.set(element.id, element);
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
  }

  // 添加连线
  addLine(element: LineElement): Promise<void> {
    return new Promise((resolve) => {
      const { flyLine, flySpot } = drawLineBetween2Spot(
        element.startPosition,
        element.endPosition
      );
      
      const container = new THREE.Object3D();
      container.add(flyLine);
      container.add(flySpot);
      
      element.object3D = container;
      element.data = { flyLine, flySpot };
      this.linesContainer.add(container);
      this.elements.set(element.id, element);
      
      // 添加到飞行点列表
      this.flySpots.push(flySpot);
      resolve();
    });
  }

  // 移除元素
  removeElement(id: string): boolean {
    const element = this.elements.get(id);
    if (!element || !element.object3D) return false;

    // 从对应容器中移除
    switch (element.type) {
      case 'label':
        this.labelsContainer.remove(element.object3D);
        break;
      case 'spot':
        this.spotsContainer.remove(element.object3D);
        // 从动画列表中移除
        if (element.data && element.data.ring) {
          const index = this.animatedSpots.indexOf(element.data.ring);
          if (index > -1) {
            this.animatedSpots.splice(index, 1);
          }
        }
        break;
      case 'model':
        this.modelsContainer.remove(element.object3D);
        // 移除对应的动画混合器
        // 这里需要根据实际情况找到对应的mixer并移除
        break;
      case 'line':
        this.linesContainer.remove(element.object3D);
        // 从飞行点列表中移除
        if (element.data && element.data.flySpot) {
          const index = this.flySpots.indexOf(element.data.flySpot);
          if (index > -1) {
            this.flySpots.splice(index, 1);
          }
        }
        break;
    }

    // 清理资源
    this.disposeObject3D(element.object3D);
    this.elements.delete(id);
    return true;
  }

  // 批量添加元素
  async addElements(elements: MapElement[]): Promise<void> {
    const promises = elements.map(element => {
      switch (element.type) {
        case 'label':
          return this.addLabel(element as LabelElement);
        case 'spot':
          return this.addSpot(element as SpotElement);
        case 'model':
          return this.addModel(element as ModelElement);
        case 'line':
          return this.addLine(element as LineElement);
        default:
          return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
  }

  // 批量移除元素
  removeElements(ids: string[]): void {
    ids.forEach(id => this.removeElement(id));
  }

  // 清空所有元素
  clearAllElements(): void {
    const allIds = Array.from(this.elements.keys());
    this.removeElements(allIds);
  }

  // 获取元素
  getElement(id: string): MapElement | undefined {
    return this.elements.get(id);
  }

  // 获取所有元素
  getAllElements(): MapElement[] {
    return Array.from(this.elements.values());
  }

  // 根据类型获取元素
  getElementsByType(type: MapElement['type']): MapElement[] {
    return Array.from(this.elements.values()).filter(element => element.type === type);
  }

  // 更新动画
  updateAnimations(delta: number): void {
    // 更新模型动画
    this.modelMixers.forEach(mixer => mixer.update(delta));

    // 更新圆环动画
    this.animatedSpots.forEach((mesh: any) => {
      mesh._s += 0.01;
      mesh.scale.set(1 * mesh._s, 1 * mesh._s, 1 * mesh._s);
      if (mesh._s <= 2) {
        mesh.material.opacity = 2 - mesh._s;
      } else {
        mesh._s = 1;
      }
    });

    // 更新飞行点动画
    this.flySpots.forEach((mesh: any) => {
      mesh._s += 0.003;
      let tankPosition = new THREE.Vector3();
      tankPosition = mesh.curve.getPointAt(mesh._s % 1);
      mesh.position.set(tankPosition.x, tankPosition.y, tankPosition.z);
    });
  }

  // 清理资源
  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  // 销毁管理器
  dispose(): void {
    this.clearAllElements();
    this.modelMixers.length = 0;
    this.animatedSpots.length = 0;
    this.flySpots.length = 0;
    this.dracoLoader.dispose();
    
    // 清理所有高亮区域
    this.clearAllHighlights();
  }

  // 高亮指定区域
  highlightRegion(regionName: string, duration: number = 3000): boolean {
    // 如果该区域已经高亮，先清除之前的高亮
    if (this.highlightedRegions.has(regionName)) {
      this.clearRegionHighlight(regionName);
    }

    // 查找匹配的区域对象
    const targetRegion = this.findRegionByName(regionName);
    if (!targetRegion) {
      console.warn(`Region "${regionName}" not found`);
      return false;
    }

    console.log(`找到区域: ${regionName}`, targetRegion);

    // 收集所有mesh和原始材质
    const meshes: THREE.Mesh[] = [];
    const originalMaterials: THREE.Material[] = [];

    targetRegion.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isChangeColor) {
        console.log('找到可高亮的mesh:', child);
        meshes.push(child);
        // 保存原始材质
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat) {
              originalMaterials.push(mat.clone());
            }
          });
        } else {
          if (child.material) {
            originalMaterials.push(child.material.clone());
          }
        }
      }
    });

    console.log(`找到 ${meshes.length} 个可高亮的mesh，${originalMaterials.length} 个原始材质`);

    if (meshes.length === 0) {
      console.warn(`No highlightable meshes found in region "${regionName}"`);
      return false;
    }

    // 应用高亮材质
    this.applyHighlightMaterial(meshes);

    // 设置定时器，在指定时间后恢复原始颜色
    const timeoutId = setTimeout(() => {
      this.restoreRegionMaterial(regionName);
    }, duration);

    // 存储高亮信息
    this.highlightedRegions.set(regionName, {
      meshes,
      originalMaterials,
      timeoutId
    });

    console.log(`区域 "${regionName}" 高亮成功，将在 ${duration}ms 后恢复`);

    return true;
  }

  // 根据名称查找区域对象
  private findRegionByName(regionName: string): THREE.Object3D | null {
    let targetRegion: THREE.Object3D | null = null;
    const foundRegions: any[] = [];
    
    this.mapObject3D.traverse((child) => {
      const extendedChild = child as ExtendObject3D;
      if (extendedChild.customProperties) {
        const properties = extendedChild.customProperties;
        foundRegions.push({
          name: properties.name,
          adcode: properties.adcode,
          level: properties.level
        });
        
        // 支持多种名称字段
        if (properties.name === regionName || 
            properties.NAME === regionName ||
            properties.adcode === regionName ||
            properties.code === regionName) {
          targetRegion = child;
          console.log(`匹配到区域:`, properties);
        }
      }
    });

    if (!targetRegion) {
      console.log('所有可用区域:', foundRegions);
      console.log(`在以下区域中未找到 "${regionName}":`, foundRegions.map(r => r.name));
    }

    return targetRegion;
  }

  // 应用高亮材质
  private applyHighlightMaterial(meshes: THREE.Mesh[]): void {
    meshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material, index) => {
          if (material && index === 0) {
            // 顶面材质 - 使用高亮颜色
            if (material instanceof THREE.MeshPhongMaterial) {
              material.color.setHex(0xFFD700); // 金色高亮
              material.emissive.setHex(0x444400); // 添加发光效果
            }
          }
        });
      } else {
        // 单一材质
        if (mesh.material && mesh.material instanceof THREE.MeshPhongMaterial) {
          mesh.material.color.setHex(0xFFD700);
          mesh.material.emissive.setHex(0x444400);
        }
      }
    });
  }

  // 恢复区域原始材质（带渐变效果）
  private restoreRegionMaterial(regionName: string): void {
    const highlightInfo = this.highlightedRegions.get(regionName);
    if (!highlightInfo) return;

    const { meshes, originalMaterials } = highlightInfo;
    let materialIndex = 0;

    // 恢复材质
    meshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material, index) => {
          if (material && index === 0 && materialIndex < originalMaterials.length) {
            const originalMaterial = originalMaterials[materialIndex];
            if (originalMaterial && material instanceof THREE.MeshPhongMaterial && originalMaterial instanceof THREE.MeshPhongMaterial) {
              // 创建颜色渐变动画
              const startColor = material.color.clone();
              const endColor = originalMaterial.color.clone();
              const startEmissive = material.emissive.clone();
              const endEmissive = originalMaterial.emissive.clone();

              // 使用requestAnimationFrame实现渐变
              const colorTween = { t: 0 };
              
              const animate = () => {
                colorTween.t += 0.02; // 控制动画速度
                
                if (colorTween.t >= 1) {
                  // 动画完成，设置最终颜色
                  material.color.copy(endColor);
                  material.emissive.copy(endEmissive);
                  return;
                }
                
                // 插值计算
                material.color.lerpColors(startColor, endColor, colorTween.t);
                material.emissive.lerpColors(startEmissive, endEmissive, colorTween.t);
                
                requestAnimationFrame(animate);
              };
              
              animate();
            }
            materialIndex++;
          }
        });
      } else {
        if (mesh.material && materialIndex < originalMaterials.length) {
          const originalMaterial = originalMaterials[materialIndex];
          if (originalMaterial && mesh.material instanceof THREE.MeshPhongMaterial && originalMaterial instanceof THREE.MeshPhongMaterial) {
            const startColor = mesh.material.color.clone();
            const endColor = originalMaterial.color.clone();
            const startEmissive = mesh.material.emissive.clone();
            const endEmissive = originalMaterial.emissive.clone();

            const colorTween = { t: 0 };
            
            const animate = () => {
              colorTween.t += 0.02;
              
              if (colorTween.t >= 1) {
                (mesh.material as THREE.MeshPhongMaterial).color.copy(endColor);
                (mesh.material as THREE.MeshPhongMaterial).emissive.copy(endEmissive);
                return;
              }
              
              (mesh.material as THREE.MeshPhongMaterial).color.lerpColors(startColor, endColor, colorTween.t);
              (mesh.material as THREE.MeshPhongMaterial).emissive.lerpColors(startEmissive, endEmissive, colorTween.t);
              
              requestAnimationFrame(animate);
            };
            
            animate();
          }
          materialIndex++;
        }
      }
    });

    // 清理高亮信息
    this.highlightedRegions.delete(regionName);
  }

  // 清除指定区域的高亮
  clearRegionHighlight(regionName: string): boolean {
    const highlightInfo = this.highlightedRegions.get(regionName);
    if (!highlightInfo) return false;

    // 清除定时器
    clearTimeout(highlightInfo.timeoutId);
    
    // 立即恢复原始材质
    this.restoreRegionMaterial(regionName);
    
    return true;
  }

  // 清除所有高亮区域
  clearAllHighlights(): void {
    const regionNames = Array.from(this.highlightedRegions.keys());
    regionNames.forEach(regionName => {
      this.clearRegionHighlight(regionName);
    });
  }

  // 获取当前高亮的区域列表
  getHighlightedRegions(): string[] {
    return Array.from(this.highlightedRegions.keys());
  }
}
