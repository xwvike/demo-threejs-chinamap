import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ToolTip from "../tooltip";
import {
  generateMapObject3D,
  generateElementsData,
  generateLineElementsData,
  getDynamicMapScale,
} from "./drawFunc";
import { GeoJsonType } from "./typed";
import gsap from "gsap";

import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

import { initScene } from "./scene";
import { mapConfig } from "./mapConfig";
import { initCamera } from "./camera";
import { MapManager } from "./mapManager";

export type ProjectionFnParamType = {
  center: [number, number];
  scale: number;
};

interface Props {
  geoJson: GeoJsonType;
  dblClickFn: (customProperties: any) => void;
  projectionFnParam: ProjectionFnParamType;
}

// 定义暴露给父组件的方法接口
export interface Map3DRef {
  addElements: (elements: any[]) => Promise<void>;
  removeElements: (ids: string[]) => void;
  clearElements: () => void;
  highlightRegion: (regionName: string, duration?: number) => boolean;
  clearRegionHighlight: (regionName: string) => boolean;
  clearAllHighlights: () => void;
  getHighlightedRegions: () => string[];
}

let lastPick: any = null;

const Map3D = forwardRef<Map3DRef, Props>((props, ref) => {
  const { geoJson, dblClickFn, projectionFnParam } = props;
  const mapRef = useRef<any>();
  const map2dRef = useRef<any>();
  const toolTipRef = useRef<any>();
  const mapManagerRef = useRef<MapManager | null>(null);

  const [toolTipData, setToolTipData] = useState<any>({
    text: "",
  });

  // 暴露给外部的方法
  const addMapElements = useCallback(async (elements: any[]) => {
    if (mapManagerRef.current) {
      await mapManagerRef.current.addElements(elements);
    }
  }, []);

  const removeMapElements = useCallback((ids: string[]) => {
    if (mapManagerRef.current) {
      mapManagerRef.current.removeElements(ids);
    }
  }, []);

  const clearAllMapElements = useCallback(() => {
    if (mapManagerRef.current) {
      mapManagerRef.current.clearAllElements();
    }
  }, []);

  // 高亮区域相关方法
  const highlightRegion = useCallback((regionName: string, duration?: number) => {
    if (mapManagerRef.current) {
      return mapManagerRef.current.highlightRegion(regionName, duration);
    }
    return false;
  }, []);

  const clearRegionHighlight = useCallback((regionName: string) => {
    if (mapManagerRef.current) {
      return mapManagerRef.current.clearRegionHighlight(regionName);
    }
    return false;
  }, []);

  const clearAllHighlights = useCallback(() => {
    if (mapManagerRef.current) {
      mapManagerRef.current.clearAllHighlights();
    }
  }, []);

  const getHighlightedRegions = useCallback(() => {
    if (mapManagerRef.current) {
      return mapManagerRef.current.getHighlightedRegions();
    }
    return [];
  }, []);

  // 使用 useImperativeHandle 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    addElements: addMapElements,
    removeElements: removeMapElements,
    clearElements: clearAllMapElements,
    highlightRegion,
    clearRegionHighlight,
    clearAllHighlights,
    getHighlightedRegions,
  }), [addMapElements, removeMapElements, clearAllMapElements, highlightRegion, clearRegionHighlight, clearAllHighlights, getHighlightedRegions]);

  useEffect(() => {
    const currentDom = mapRef.current;
    if (!currentDom) return;
    const ratio = {
      value: 0,
    };

    /**
     * 初始化场景
     */
    const scene = initScene();

    /**
     * 初始化摄像机
     */
    const { camera } = initCamera(currentDom);

    /**
     * 初始化渲染器
     */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
    
    if (currentDom.childNodes[0]) {
      currentDom.removeChild(currentDom.childNodes[0]);
    }
    currentDom.appendChild(renderer.domElement);

    /**
     * 创建css2 Renderer 渲染器
     */
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    const labelRendererDom = map2dRef.current;
    if (labelRendererDom?.childNodes[0]) {
      labelRendererDom.removeChild(labelRendererDom.childNodes[0]);
    }
    labelRendererDom.appendChild(labelRenderer.domElement);

    /**
     * 初始化地图3D模型（只包含地图本身）
     */
    if (!projectionFnParam || !projectionFnParam.center || !projectionFnParam.scale) {
      console.error('Invalid projectionFnParam:', projectionFnParam);
      return;
    }

    const { mapObject3D, label2dData } = generateMapObject3D(
      geoJson,
      projectionFnParam
    );
    scene.add(mapObject3D);

    /**
     * 初始化地图管理器
     */
    const mapManager = new MapManager(scene, mapObject3D);
    mapManagerRef.current = mapManager;

    /**
     * 动态地图缩放大小
     */
    const mapScale = getDynamicMapScale(mapObject3D, currentDom);

    /**
     * 初始化默认元素（标签、点位、模型、连线）
     */
    const initDefaultElements = async () => {
      // 生成基础元素数据
      const elementsData = generateElementsData(label2dData);
      const lineElementsData = generateLineElementsData(label2dData, 5);
      console.log(elementsData)
      
      // 添加所有元素
      await mapManager.addElements([...elementsData, ...lineElementsData]);
    };

    // 异步初始化默认元素
    initDefaultElements().catch(console.error);

    /**
     * 初始化控制器
     */
    new OrbitControls(camera, labelRenderer.domElement);

    /**
     * 新增光源
     */
    const light = new THREE.PointLight(0xffffff, 1.5);
    light.position.set(0, -5, 30);
    scene.add(light);

    // 视窗伸缩
    const onResizeEvent = () => {
      // 更新摄像头
      camera.aspect = currentDom.clientWidth / currentDom.clientHeight;
      // 更新摄像机的投影矩阵
      camera.updateProjectionMatrix();
      // 更新渲染器
      renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
      labelRenderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
      // 设置渲染器的像素比例
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    /**
     * 设置 raycaster
     */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // 鼠标移入事件
    const onMouseMoveEvent = (e: MouseEvent) => {
      const intersects = raycaster.intersectObjects(scene.children);
      pointer.x = (e.clientX / currentDom.clientWidth) * 2 - 1;
      pointer.y = -(e.clientY / currentDom.clientHeight) * 2 + 1;

      // 如果存在，则鼠标移出需要重置
      if (lastPick) {
        const color = mapConfig.mapColorGradient[Math.floor(Math.random() * 4)];
        lastPick.object.material[0].color.set(color);
        lastPick.object.material[0].opacity = mapConfig.mapOpacity;
      }
      lastPick = null;
      
      lastPick = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );

      if (lastPick) {
        const properties = lastPick.object.parent.customProperties;
        if (lastPick.object.material[0]) {
          lastPick.object.material[0].color.set(mapConfig.mapHoverColor);
          lastPick.object.material[0].opacity = 1;
        }

        if (toolTipRef.current && toolTipRef.current.style) {
          toolTipRef.current.style.left = e.clientX + 2 + "px";
          toolTipRef.current.style.top = e.clientY + 2 + "px";
          toolTipRef.current.style.visibility = "visible";
        }
        setToolTipData({
          text: properties.name,
        });
      } else {
        toolTipRef.current.style.visibility = "hidden";
      }
    };

    // 鼠标双击事件
    const onDblclickEvent = () => {
      const intersects = raycaster.intersectObjects(scene.children);
      const target = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );
      if (target) {
        const obj: any = target.object.parent;
        const p = obj.customProperties;
        dblClickFn(p);
      }
    };

    /**
     * 动画
     */
    gsap.to(mapObject3D.scale, { x: mapScale, y: mapScale, z: 1, duration: 1 });

    /**
     * Animate
     */
    const clock = new THREE.Clock();
    const animate = function () {
      const delta = clock.getDelta();
      
      // 更新地图管理器中的动画
      mapManager.updateAnimations(delta);

      // 雷达动画（如果需要的话）
      ratio.value += 0.01;

      requestAnimationFrame(animate);
      // 通过摄像机和鼠标位置更新射线
      raycaster.setFromCamera(pointer, camera);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    window.addEventListener("resize", onResizeEvent, false);
    // window.addEventListener("mousemove", onMouseMoveEvent, false);
    // window.addEventListener("dblclick", onDblclickEvent, false);

    return () => {
      // 清理资源
      mapManager.dispose();
      mapManagerRef.current = null;
      
      window.removeEventListener("resize", onResizeEvent);
      // window.removeEventListener("mousemove", onMouseMoveEvent);
      // window.removeEventListener("dblclick", onDblclickEvent);
    };
  }, [geoJson, dblClickFn, projectionFnParam]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div ref={map2dRef} />
      <div ref={mapRef} style={{ width: "100%", height: "100%" }}></div>
      <ToolTip innterRef={toolTipRef} data={toolTipData}></ToolTip>
    </div>
  );
});

Map3D.displayName = 'Map3D';

export default Map3D;
