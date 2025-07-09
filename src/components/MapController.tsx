import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import Map3D, { Map3DRef } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import { LineElement } from "../map3d/mapManager";
import bg from "../assets/bg.png";
import Danmaku from "./Danmaku";
import "./MapController.css";

interface MapControllerProps {
  geoJson: GeoJsonType;
  dblClickFn: (customProperties: any) => void;
  projectionFnParam: any;
}

let interval: NodeJS.Timeout | null = null;
let currentSpotIds: string[] = []; // 存储当前点位的ID

const MapController: React.FC<MapControllerProps> = ({
  geoJson,
  dblClickFn,
  projectionFnParam,
}) => {
  const [rankData, setRankData] = useState<any>([]);
  const [jrfb, setJrfb] = useState<number>(0);
  const [ljfb, setLjfb] = useState<number>(0);
  const [nowTime, setNowTime] = useState<string>(
    new Date().toLocaleTimeString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<any[]>([]); // 用于存储最近的弹幕数据
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
  const addIntegratedSpot = (title: string) => {
    if (mapRef.current?.addElements) {
      const position = generateRandomPositionInChina();
      const timestamp = Date.now();
      const spotId = `integrated-spot-${timestamp}`;

      const newElements = [
        // 气泡
        {
          id: `${spotId}-bubble`,
          type: "bubble" as const,
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

  // 发射数据的函数
  const launchNotices = (notices: any[]) => {
    if (mapRef.current?.clearElements) {
      mapRef.current.clearElements();
    }
    if (!notices || notices.length === 0) return;
    let currentIndex = 0;
    currentSpotIds = [];
    const intervalTime = notices.length <= 1 ? 30000 : 30000 / notices.length;
    console.log(
      `发射间隔时间: ${intervalTime} 毫秒, 数据量: ${notices.length}`
    );

    const displayNotice = (index: number) => {
      if (currentSpotIds.length > 0 && mapRef.current?.removeElements) {
        mapRef.current.removeElements(currentSpotIds);
      }

      if (index >= notices.length) return;

      const notice = notices[index];

      // 创建新的点位
      const position = createProjectionFn()([
        parseFloat(notice.lng),
        parseFloat(notice.lat),
      ]);
      const spotId = `${notice.id}`;

      const newElements = [
        {
          id: `${spotId}-bubble`,
          type: "bubble" as const,
          position: position as [number, number],
          text: notice.area_name+"+1",
        },
        {
          id: `${spotId}-spot`,
          type: "spot" as const,
          position: position as [number, number],
        },
        {
          id: `${spotId}-model`,
          type: "model" as const,
          position: position as [number, number],
          modelPath: "./models/cone.glb",
          scale: [0.4, 0.4, 0.8] as [number, number, number],
          animation: false,
        },
      ];

      if (mapRef.current?.addElements) {
        mapRef.current.addElements(newElements);
      }

      // 添加弹幕
      if (danmakuRef.current) {
        danmakuRef.current.addDanmaku(
          `${notice.created_at}  ${notice.area_name}   ${notice.notice_title}`
        );
      }

      // 更新当前点位ID
      currentSpotIds = [
        `${spotId}-bubble`,
        `${spotId}-spot`,
        `${spotId}-model`,
      ];
    };

    // 立即显示第一条
    displayNotice(currentIndex);
    currentIndex++;

    // 如果有多条数据，设置定时器显示剩余数据
    if (notices.length > 1) {
      const launchTimer = setInterval(() => {
        if (currentIndex >= notices.length) {
          clearInterval(launchTimer);
          return;
        }

        displayNotice(currentIndex);
        currentIndex++;
      }, intervalTime);
    }
  };
  const fetchData = async () => {
    let result = await fetch("https://api.xtjzx.cn/examhub/pub/stats/notice");
    if (result.ok) {
      const jsonData = await result.json();
      const {
        province_stats,
        cumulative_total_count,
        recent_30sec_notices,
        recent_notices,
        today_total_count,
      } = jsonData.data;
      if (recentRef.current.length <= 0) {
        let _recent = recent_notices.map((item: any) => {
          return {
            text:
              item.created_at + " " + item.area_name + " " + item.notice_title,
          };
        });
        recentRef.current = _recent;
      }
      setRankData(province_stats);
      setJrfb(today_total_count);
      setLjfb(cumulative_total_count+500000);
      launchNotices(recent_30sec_notices);
      return jsonData.data;
    } else {
      console.error("获取数据失败");
    }
  };
  useEffect(() => {
    fetchData();
    let inter= setInterval(() => {
      setNowTime(
        new Date().toLocaleTimeString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      )
    }, 1000);

    return () => {
      if (inter) {
        clearInterval(inter);
      }
    };
  }, []);
  useEffect(() => {
    fetchData();
    interval = setInterval(() => {
      fetchData();
    }, 30 * 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // 切换全屏
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // 进入全屏
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        }
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 页面重新加载函数
  const handleReload = () => {
    if (mapRef.current?.clearElements) {
      mapRef.current.clearElements();
    }
    recentRef.current = [];
    fetchData();
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "1920px",
        height: "1080px",
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
      <div className="fb jrfb">{jrfb}</div>
      <div className="fb ljfb ">{ljfb}</div>
      <div className="rank">
        {rankData.map((item: any, index: number) => {
          return (
            <div key={index} className={`rank-item`}>
              <span className={`index index-${index}`}>{index + 1}</span>
              <span>{item.province_name}</span>
              <span>{item.today_count}</span>
            </div>
          );
        })}
      </div>
      <div className="time">{nowTime}</div>
      <Danmaku ref={danmakuRef} initDanmu={recentRef.current} />

      {/* 全屏按钮 */}
      <button onClick={toggleFullscreen} className="fullscreen-btn">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isFullscreen ? (
            // 退出全屏图标
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
              <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
              <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
            </>
          ) : (
            // 进入全屏图标
            <>
              <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
            </>
          )}
        </svg>
      </button>

      {/* 重新加载按钮 */}
      <button onClick={handleReload} className="reload-btn">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
        </svg>
      </button>
    </div>
  );
};

export default MapController;
