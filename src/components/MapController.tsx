import React, { useRef, useState } from 'react';
import Map3D, { Map3DRef } from '../map3d';
import { GeoJsonType } from '../map3d/typed';
import {
  LabelElement,
  SpotElement,
  ModelElement,
  LineElement,
} from '../map3d/mapManager';

interface MapControllerProps {
  geoJson: GeoJsonType;
  dblClickFn: (customProperties: any) => void;
  projectionFnParam: any;
}

const MapController: React.FC<MapControllerProps> = ({
  geoJson,
  dblClickFn,
  projectionFnParam,
}) => {
  const mapRef = useRef<Map3DRef>(null);
  const [elementCount, setElementCount] = useState(0);

  // 动态添加标签
  const addRandomLabel = () => {
    if (mapRef.current?.addElements) {
      const newElements: LabelElement[] = [
        {
          id: `dynamic-label-${Date.now()}`,
          type: 'label',
          position: [Math.random() * 100 - 50, Math.random() * 100 - 50],
          text: `动态标签 ${elementCount + 1}`,
        },
      ];
      mapRef.current.addElements(newElements);
      setElementCount(prev => prev + 1);
    }
  };

  // 动态添加点位
  const addRandomSpot = () => {
    if (mapRef.current?.addElements) {
      const newElements: SpotElement[] = [
        {
          id: `dynamic-spot-${Date.now()}`,
          type: 'spot',
          position: [Math.random() * 100 - 50, Math.random() * 100 - 50],
        },
      ];
      mapRef.current.addElements(newElements);
      setElementCount(prev => prev + 1);
    }
  };

  // 动态添加模型
  const addRandomModel = () => {
    if (mapRef.current?.addElements) {
      const newElements: ModelElement[] = [
        {
          id: `dynamic-model-${Date.now()}`,
          type: 'model',
          position: [Math.random() * 100 - 50, Math.random() * 100 - 50],
          modelPath: '/models/cone.glb',
          scale: [0.2, 0.2, 0.4],
          animation: true,
        },
      ];
      mapRef.current.addElements(newElements);
      setElementCount(prev => prev + 1);
    }
  };

  // 动态添加连线
  const addRandomLine = () => {
    if (mapRef.current?.addElements) {
      const startPos: [number, number] = [Math.random() * 100 - 50, Math.random() * 100 - 50];
      const endPos: [number, number] = [Math.random() * 100 - 50, Math.random() * 100 - 50];
      
      const newElements: LineElement[] = [
        {
          id: `dynamic-line-${Date.now()}`,
          type: 'line',
          position: startPos,
          startPosition: startPos,
          endPosition: endPos,
        },
      ];
      mapRef.current.addElements(newElements);
      setElementCount(prev => prev + 1);
    }
  };

  // 清空所有动态元素
  const clearAllElements = () => {
    if (mapRef.current?.clearElements) {
      mapRef.current.clearElements();
      setElementCount(0);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* 控制面板 */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          minWidth: '200px',
        }}
      >
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>地图元素控制</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={addRandomLabel}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '12px',
            }}
          >
            添加标签
          </button>
          
          <button
            onClick={addRandomSpot}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '12px',
            }}
          >
            添加点位
          </button>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={addRandomModel}
            style={{
              background: '#FF9800',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '12px',
            }}
          >
            添加模型
          </button>
          
          <button
            onClick={addRandomLine}
            style={{
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '12px',
            }}
          >
            添加连线
          </button>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={clearAllElements}
            style={{
              background: '#F44336',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            清空所有元素
          </button>
        </div>
        
        <div style={{ fontSize: '12px', color: '#ccc' }}>
          当前元素数量: {elementCount}
        </div>
      </div>

      {/* 3D地图 */}
      <Map3D
        ref={mapRef}
        geoJson={geoJson}
        dblClickFn={dblClickFn}
        projectionFnParam={projectionFnParam}
      />
    </div>
  );
};

export default MapController;
