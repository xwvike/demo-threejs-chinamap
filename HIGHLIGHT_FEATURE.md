# 区域高亮功能说明

## 功能概述

新增了区域高亮功能，可以高亮地图上的省份或地市区域，高亮效果会在指定时间后自动渐变恢复为普通颜色。

## 核心实现

### 1. MapManager 类中的高亮方法

- `highlightRegion(regionName: string, duration?: number): boolean`
  - 高亮指定区域
  - `regionName`: 区域名称（如："北京市", "广东省"）
  - `duration`: 高亮持续时间（毫秒），默认3000ms
  - 返回: 成功返回true，失败返回false

- `clearRegionHighlight(regionName: string): boolean`
  - 清除指定区域的高亮
  - 返回: 成功返回true，失败返回false

- `clearAllHighlights(): void`
  - 清除所有高亮区域

- `getHighlightedRegions(): string[]`
  - 获取当前高亮的区域列表

### 2. 高亮效果

- **高亮颜色**: 金色 (#FFD700) 带发光效果
- **渐变恢复**: 使用线性插值实现平滑的颜色过渡
- **持续时间**: 默认3秒，可自定义

### 3. 区域查找机制

支持通过以下字段匹配区域：
- `name`: 区域名称
- `NAME`: 区域名称（大写）
- `adcode`: 行政区划代码
- `code`: 区域代码

## 使用方法

### 在 React 组件中使用

```tsx
import { useRef } from 'react';
import Map3D, { Map3DRef } from './map3d';

const MyComponent = () => {
  const mapRef = useRef<Map3DRef>(null);

  // 高亮北京市，持续5秒
  const highlightBeijing = () => {
    if (mapRef.current) {
      mapRef.current.highlightRegion('北京市', 5000);
    }
  };

  // 清除所有高亮
  const clearHighlights = () => {
    if (mapRef.current) {
      mapRef.current.clearAllHighlights();
    }
  };

  return (
    <div>
      <button onClick={highlightBeijing}>高亮北京</button>
      <button onClick={clearHighlights}>清除高亮</button>
      <Map3D ref={mapRef} {...otherProps} />
    </div>
  );
};
```

### 在控制面板中使用

MapController 组件已经集成了高亮功能的控制按钮：

- **高亮随机省份**: 随机选择一个省份进行高亮
- **高亮北京市**: 高亮北京市
- **高亮广东省**: 高亮广东省
- **清除高亮**: 清除所有高亮效果

## 技术细节

### 1. 材质管理

- 保存原始材质信息，确保能够正确恢复
- 支持多材质对象（如有侧面和顶面不同材质的区域）
- 内存管理：及时清理材质副本

### 2. 动画实现

- 使用 `requestAnimationFrame` 实现流畅的颜色过渡
- 线性插值算法确保平滑的渐变效果
- 自动清理动画资源

### 3. 状态管理

- 使用 Map 数据结构存储高亮状态
- 支持同时高亮多个区域
- 自动处理重复高亮和冲突情况

## 注意事项

1. **区域名称匹配**: 确保传入的区域名称与 GeoJSON 数据中的名称一致
2. **性能考虑**: 避免频繁调用高亮方法，建议添加防抖处理
3. **资源清理**: 组件卸载时会自动清理所有高亮状态和定时器
4. **并发高亮**: 支持同时高亮多个区域，每个区域独立管理

## 扩展建议

1. **自定义高亮颜色**: 可以扩展方法参数支持自定义高亮颜色
2. **动画效果**: 可以添加更多动画效果，如脉冲、闪烁等
3. **交互触发**: 可以结合鼠标事件实现点击高亮功能
4. **数据驱动**: 可以根据数据值动态设置高亮颜色和强度
