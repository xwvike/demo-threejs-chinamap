import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { drawLineBetween2Spot, draw2dLabel, drawSpot } from "./drawFunc";
import { mapConfig } from "./mapConfig";

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
  }
}
