import React, { useRef, useState } from "react";
import * as d3 from "d3";
import Map3D, { Map3DRef } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import { LineElement } from "../map3d/mapManager";
import bg from "../assets/bg.png";
import jrfb from "../assets/jrfb.png";
import ljfb from "../assets/ljfb.png";
import Danmaku from "./Danmaku";
import "./MapController.css";

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
  const danmakuRef = useRef<any>(null);
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
  const addIntegratedSpot = (title:string) => {
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
          text: `${title}`,
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

  // 创建点位，同时创建弹幕
  const createSpotAndDanmaku = () => {
    const title = `综合点位 ${elementCount + 1}`;
    addIntegratedSpot(title);
    if (danmakuRef.current) {
      danmakuRef.current.addDanmaku(`${title}`);
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
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}
    >
      {/* 3D地图 */}
      <div
        style={{
          position: "absolute",
          top: "174px",
          left: "42px",
          width: "min(1366px, calc(100vw - 84px))",
          height: "min(858px, calc(100vh - 174px - 20px))",
          maxWidth: "1366px",
          maxHeight: "858px",
        }}
      >
        <Map3D
          ref={mapRef}
          geoJson={geoJson}
          dblClickFn={dblClickFn}
          projectionFnParam={projectionFnParam}
        />
      </div>
      <button style={{position:'fixed', top: '200px'}} onClick={createSpotAndDanmaku}>
        add
      </button>
      <div className="fb jrfb">23</div>
      <div className="fb ljfb">3454</div>
      <Danmaku ref={danmakuRef} />
    </div>
  );
};

export default MapController;
