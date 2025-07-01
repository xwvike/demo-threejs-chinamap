# 地图元素动态管理使用指南

## 概述

通过重构，我们实现了地图创建和点位、标签、模型等元素的分离管理。现在支持动态添加和删除地图元素，提供了更好的灵活性和可扩展性。

## 主要改进

### 1. 架构分离
- **地图创建**: `generateMapObject3D()` 只负责创建基础地图几何体
- **元素管理**: `MapManager` 类负责管理所有动态元素（标签、点位、模型、连线）
- **数据生成**: 提供了 `generateElementsData()` 和 `generateLineElementsData()` 来生成元素数据

### 2. 新增的核心类

#### MapManager 类
负责统一管理地图上的所有动态元素：

```typescript
class MapManager {
  // 添加元素
  async addElements(elements: MapElement[]): Promise<void>
  
  // 移除元素
  removeElements(ids: string[]): void
  
  // 清空所有元素
  clearAllElements(): void
  
  // 获取元素
  getElement(id: string): MapElement | undefined
  getAllElements(): MapElement[]
  getElementsByType(type: MapElement['type']): MapElement[]
  
  // 更新动画
  updateAnimations(delta: number): void
}
```

#### 元素类型定义
```typescript
interface MapElement {
  id: string;
  type: 'label' | 'spot' | 'model' | 'line';
  position: [number, number];
  data?: any;
  object3D?: THREE.Object3D;
}

interface LabelElement extends MapElement {
  type: 'label';
  text: string;
}

interface ModelElement extends MapElement {
  type: 'model';
  modelPath: string;
  scale?: [number, number, number];
  animation?: boolean;
}

interface LineElement extends MapElement {
  type: 'line';
  startPosition: [number, number];
  endPosition: [number, number];
}

interface SpotElement extends MapElement {
  type: 'spot';
}
```

## 使用方法

### 1. 基础使用
```tsx
import React, { useRef } from 'react';
import Map3D, { Map3DRef } from './map3d';

function MyComponent() {
  const mapRef = useRef<Map3DRef>(null);

  // 添加标签
  const addLabel = async () => {
    await mapRef.current?.addElements([
      {
        id: 'label-1',
        type: 'label',
        position: [100, 50],
        text: '我的标签'
      }
    ]);
  };

  // 添加点位
  const addSpot = async () => {
    await mapRef.current?.addElements([
      {
        id: 'spot-1',
        type: 'spot',
        position: [120, 60]
      }
    ]);
  };

  // 添加模型
  const addModel = async () => {
    await mapRef.current?.addElements([
      {
        id: 'model-1',
        type: 'model',
        position: [110, 55],
        modelPath: '/models/cone.glb',
        scale: [0.3, 0.3, 0.6],
        animation: true
      }
    ]);
  };

  // 添加连线
  const addLine = async () => {
    await mapRef.current?.addElements([
      {
        id: 'line-1',
        type: 'line',
        position: [100, 50],
        startPosition: [100, 50],
        endPosition: [120, 60]
      }
    ]);
  };

  // 移除元素
  const removeElements = () => {
    mapRef.current?.removeElements(['label-1', 'spot-1']);
  };

  // 清空所有元素
  const clearAll = () => {
    mapRef.current?.clearElements();
  };

  return (
    <div>
      <Map3D
        ref={mapRef}
        geoJson={geoJson}
        dblClickFn={dblClickFn}
        projectionFnParam={projectionFnParam}
      />
      <button onClick={addLabel}>添加标签</button>
      <button onClick={addSpot}>添加点位</button>
      <button onClick={addModel}>添加模型</button>
      <button onClick={addLine}>添加连线</button>
      <button onClick={removeElements}>移除元素</button>
      <button onClick={clearAll}>清空所有</button>
    </div>
  );
}
```

### 2. 批量操作
```tsx
// 批量添加多个元素
const addMultipleElements = async () => {
  const elements = [
    {
      id: 'batch-label-1',
      type: 'label',
      position: [100, 50],
      text: '批量标签1'
    },
    {
      id: 'batch-spot-1',
      type: 'spot',
      position: [110, 60]
    },
    {
      id: 'batch-model-1',
      type: 'model',
      position: [120, 70],
      modelPath: '/models/cone.glb',
      animation: true
    }
  ];
  
  await mapRef.current?.addElements(elements);
};
```

### 3. 动态数据驱动
```tsx
// 根据数据动态生成元素
const loadDataAndCreateElements = async (dataList: any[]) => {
  const elements = dataList.map((item, index) => ({
    id: `data-${index}`,
    type: 'label',
    position: [item.longitude, item.latitude],
    text: item.name
  }));
  
  await mapRef.current?.addElements(elements);
};
```

## 示例组件

我们提供了一个完整的示例组件 `MapController`，展示了如何使用所有功能：

```tsx
import MapController from './components/MapController';

function App() {
  return (
    <MapController
      geoJson={geoJson}
      dblClickFn={dblClickFn}
      projectionFnParam={projectionFnParam}
    />
  );
}
```

该组件包含了一个控制面板，可以：
- 动态添加标签
- 动态添加点位
- 动态添加模型
- 动态添加连线
- 清空所有元素

## 优势

1. **职责分离**: 地图渲染和元素管理分开，代码更清晰
2. **动态管理**: 支持运行时动态添加/删除元素
3. **性能优化**: 统一管理动画和资源，避免内存泄漏
4. **类型安全**: 完整的 TypeScript 类型定义
5. **易于扩展**: 可以轻松添加新的元素类型
6. **批量操作**: 支持批量添加/删除元素

## 注意事项

1. 确保为每个元素设置唯一的 `id`
2. 模型路径需要正确，并确保模型文件存在
3. 位置坐标需要与地图投影一致
4. 清理组件时会自动释放所有资源
5. 动画会自动处理，无需手动管理

通过这次重构，您的地图应用现在具备了更强的灵活性和可维护性，可以轻松应对各种动态数据展示需求。
