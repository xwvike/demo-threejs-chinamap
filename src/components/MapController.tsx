import React, { useRef, useState } from "react";
import * as d3 from "d3";
import Map3D, { Map3DRef } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import { LineElement } from "../map3d/mapManager";
import bg from "../assets/bg.png";

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

  // 中国地图坐标范围（经纬度）
  const CHINA_BOUNDS = {
    minLng: 73.5, // 最西端
    maxLng: 135.0, // 最东端
    minLat: 18.2, // 最南端
    maxLat: 53.6, // 最北端
  };

  // 内蒙古中心坐标（经纬度）
  const INNER_MONGOLIA_CENTER: [number, number] = [111.765617, 40.817498];

  // 创建投影函数
  const createProjectionFn = () => {
    const { center, scale } = projectionFnParam;
    return d3.geoMercator().center(center).scale(scale).translate([0, 0]);
  };

  // 在中国地图范围内生成随机坐标并转换为投影坐标
  const generateRandomPositionInChina = (): [number, number] => {
    const lng =
      Math.random() * (CHINA_BOUNDS.maxLng - CHINA_BOUNDS.minLng) +
      CHINA_BOUNDS.minLng;
    const lat =
      Math.random() * (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat) +
      CHINA_BOUNDS.minLat;

    const projectionFn = createProjectionFn();
    const projectedCoords = projectionFn([lng, lat]);

    return projectedCoords as [number, number];
  };

  // 将内蒙古坐标转换为投影坐标
  const getInnerMongoliaProjectedPosition = (): [number, number] => {
    const projectionFn = createProjectionFn();
    const projectedCoords = projectionFn(INNER_MONGOLIA_CENTER);
    return projectedCoords as [number, number];
  };

  // 合并的点位创建（包含标签、点位和模型）
  const addIntegratedSpot = () => {
    if (mapRef.current?.addElements) {
      const position = generateRandomPositionInChina();
      const timestamp = Date.now();
      const spotId = `integrated-spot-${timestamp}`;

      const newElements = [
        // 标签
        {
          id: `${spotId}-label`,
          type: "label" as const,
          position,
          text: `综合点位 ${elementCount + 1}`,
        },
        // 点位
        {
          id: `${spotId}-spot`,
          type: "spot" as const,
          position,
        },
        // 模型
        {
          id: `${spotId}-model`,
          type: "model" as const,
          position,
          modelPath: "./models/cone.glb",
          scale: [0.4, 0.4, 0.8] as [number, number, number],
          animation: true,
        },
      ];

      mapRef.current.addElements(newElements);
      setElementCount((prev) => prev + 3); // 一次性添加了3个元素
    }
  };

  // 添加到内蒙古的连线
  const addLineToInnerMongolia = () => {
    if (mapRef.current?.addElements) {
      const startPos = generateRandomPositionInChina();
      const endPos = getInnerMongoliaProjectedPosition();

      const newElements: LineElement[] = [
        {
          id: `line-to-inner-mongolia-${Date.now()}`,
          type: "line",
          position: startPos,
          startPosition: startPos,
          endPosition: endPos,
        },
      ];
      mapRef.current.addElements(newElements);
      setElementCount((prev) => prev + 1);
    }
  };

  // 清空所有动态元素
  const clearAllElements = () => {
    if (mapRef.current?.clearElements) {
      mapRef.current.clearElements();
      setElementCount(0);
    }
  };

  // 高亮指定区域
  const highlightRandomProvince = () => {
    // 一些常见的省份名称用于测试
    const provinces = [
      "北京市",
      "上海市",
      "广东省",
      "江苏省",
      "浙江省",
      "山东省",
      "河南省",
      "四川省",
      "湖北省",
      "湖南省",
    ];
    const randomProvince =
      provinces[Math.floor(Math.random() * provinces.length)];

    if (mapRef.current?.highlightRegion) {
      const success = mapRef.current.highlightRegion(randomProvince, 3000);
      if (success) {
        console.log(`高亮区域: ${randomProvince}`);
      } else {
        console.warn(`未找到区域: ${randomProvince}`);
      }
    }
  };

  // 高亮特定省份
  const highlightSpecificProvince = (provinceName: string) => {
    if (mapRef.current?.highlightRegion) {
      const success = mapRef.current.highlightRegion(provinceName, 3000);
      if (success) {
        console.log(`高亮区域: ${provinceName}`);
      } else {
        console.warn(`未找到区域: ${provinceName}`);
      }
    }
  };

  // 清除所有高亮
  const clearAllHighlights = () => {
    if (mapRef.current?.clearAllHighlights) {
      mapRef.current.clearAllHighlights();
      console.log("已清除所有高亮区域");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 控制面板 */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.8)",
          padding: "15px",
          borderRadius: "8px",
          color: "white",
          minWidth: "200px",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>地图元素控制</h3>

        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={addIntegratedSpot}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "8px",
              fontSize: "12px",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            添加点位
          </button>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={addLineToInnerMongolia}
            style={{
              background: "#2196F3",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            添加连线
          </button>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={clearAllElements}
            style={{
              background: "#F44336",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              width: "100%",
            }}
          >
            清空所有元素
          </button>
        </div>

        {/* 高亮区域控制 */}
        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: "10px",
            marginTop: "15px",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#ccc" }}>
            区域高亮
          </h4>

          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={highlightRandomProvince}
              style={{
                background: "#FF9800",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                marginBottom: "8px",
              }}
            >
              高亮随机省份
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={() => highlightSpecificProvince("北京市")}
              style={{
                background: "#9C27B0",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                marginBottom: "8px",
              }}
            >
              高亮北京市
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={() => highlightSpecificProvince("广东省")}
              style={{
                background: "#9C27B0",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                marginBottom: "8px",
              }}
            >
              高亮广东省
            </button>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={clearAllHighlights}
              style={{
                background: "#607D8B",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
              }}
            >
              清除高亮
            </button>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#ccc", marginTop: "10px" }}>
          当前元素数量: {elementCount}
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#999",
            marginTop: "8px",
            lineHeight: "1.4",
          }}
        >
          <div>• 综合点位：在中国地图范围内随机创建</div>
          <div>• 连线：起点随机，终点固定为内蒙古</div>
        </div>
      </div>

      {/* 3D地图 */}
      <div
        style={{
          position: "absolute",
          top: "171px",
          left: "42px",
          width: "1366px",
          height: "858px",
        }}
      >
        <Map3D
          ref={mapRef}
          geoJson={geoJson}
          dblClickFn={dblClickFn}
          projectionFnParam={projectionFnParam}
        />
      </div>
      <div></div>
    </div>
  );
};

export default MapController;
