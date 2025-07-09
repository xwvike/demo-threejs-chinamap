import * as THREE from "three";
import * as d3 from "d3";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

import {
  GeoJsonType,
  GeoJsonFeature,
  GeometryCoordinates,
  GeometryType,
  ExtendObject3D,
} from "./typed";
import { ProjectionFnParamType } from ".";
import { mapConfig } from "./mapConfig";

export function getDynamicMapScale(
  mapObject3D: THREE.Object3D,
  containerRef: any
) {
  // const width = containerRef.offsetWidth;
  // const height = containerRef.offsetHeight;
  const width = containerRef.clientWidth;
  const height = containerRef.clientHeight;
  const refArea = width * height;

  const boundingBox = new THREE.Box3().setFromObject(mapObject3D);
  // 获取包围盒的尺寸
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  // 新增 Math.random避免缩放为1，没有动画效果
  const scale =
    Math.round(Math.sqrt(refArea / (size.x * size.y * 400))) +
    parseFloat((Math.random() + 0.5).toFixed(2));
  return scale;
}

// 绘制挤出的材质
export function drawExtrudeMesh(
  point: [number, number][],
  projectionFn: any
): any {
  const shape = new THREE.Shape();
  const pointsArray = [];

  for (let i = 0; i < point.length; i++) {
    const [x, y]: any = projectionFn(point[i]); // 将每一个经纬度转化为坐标点
    if (i === 0) {
      shape.moveTo(x, -y);
    }
    shape.lineTo(x, -y);
    pointsArray.push(x, -y, mapConfig.topLineZIndex);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: mapConfig.mapDepth, // 挤出的形状深度
    bevelEnabled: false, // 对挤出的形状应用是否斜角
  });

  const material = new THREE.MeshPhongMaterial({
    // color: mapConfig.mapColor,
    color: mapConfig.mapColorGradient[Math.floor(Math.random() * 4)], // 随机颜色
    transparent: mapConfig.mapTransparent,
    opacity: mapConfig.mapOpacity,
  });

  const materialSide = new THREE.ShaderMaterial({
    uniforms: {
      color1: {
        value: new THREE.Color(mapConfig.mapSideColor1),
      },
      color2: {
        value: new THREE.Color(mapConfig.mapSideColor2),
      },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec3 vPosition;
      void main() {
        vec3 mixColor = mix(color1, color2, 0.5 - vPosition.z * 0.2); // 使用顶点坐标 z 分量来控制混合
        gl_FragColor = vec4(mixColor, 1.0);
      }
    `,
    //   wireframe: true,
  });

  const mesh: any = new THREE.Mesh(geometry, [material, materialSide]);
  // userData 存储自定义属性
  mesh.userData = {
    isChangeColor: true,
  };

  // 边框线，赋值空间点坐标，3个一组
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(pointsArray);

  const lineMaterial = new LineMaterial({
    color: mapConfig.topLineColor,
    linewidth: mapConfig.topLineWidth,
  });
  lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(lineGeometry, lineMaterial);

  return { mesh, line };
}

// 生成地图3D模型（仅包含地图本身，不包含标签、点位等元素）
export function generateMapObject3D(
  mapdata: GeoJsonType,
  projectionFnParam: ProjectionFnParamType
) {
  // 地图对象
  const mapObject3D = new THREE.Object3D();
  // 地图数据
  const { features: basicFeatures } = mapdata;

  const { center, scale } = projectionFnParam;

  // 验证投影参数
  if (!center || !Array.isArray(center) || center.length !== 2) {
    console.error('Invalid projection center:', center);
    throw new Error('投影中心点参数无效');
  }

  if (typeof scale !== 'number' || scale <= 0) {
    console.error('Invalid projection scale:', scale);
    throw new Error('投影缩放参数无效');
  }

  const projectionFn = d3
    .geoMercator()
    .center(center)
    .scale(scale)
    .translate([0, 0]);

  const label2dData: any = []; // 存储自定义 2d 标签数据

  // 每个省的数据
  basicFeatures.forEach((basicFeatureItem: GeoJsonFeature) => {
    // 每个省份的地图对象
    const provinceMapObject3D = new THREE.Object3D() as ExtendObject3D;
    // 将地图数据挂在到模型数据上
    provinceMapObject3D.customProperties = basicFeatureItem.properties;

    // 每个坐标类型
    const featureType = basicFeatureItem.geometry.type;
    // 每个坐标数组
    const featureCoords: GeometryCoordinates<GeometryType> =
      basicFeatureItem.geometry.coordinates;
    // 每个中心点位置
    const featureCenterCoord: any =
      basicFeatureItem.properties.centroid &&
      projectionFn(basicFeatureItem.properties.centroid);
    // 名字
    const featureName: string = basicFeatureItem.properties.name;

    if (featureCenterCoord) {
      label2dData.push({
        featureCenterCoord,
        featureName,
      });
    }

    // MultiPolygon 类型
    if (featureType === "MultiPolygon") {
      featureCoords.forEach((multiPolygon: [number, number][][]) => {
        multiPolygon.forEach((polygon: [number, number][]) => {
          const { mesh, line } = drawExtrudeMesh(polygon, projectionFn);
          provinceMapObject3D.add(mesh);
          provinceMapObject3D.add(line);
        });
      });
    }

    // Polygon 类型
    if (featureType === "Polygon") {
      featureCoords.forEach((polygon: [number, number][]) => {
        const { mesh, line } = drawExtrudeMesh(polygon, projectionFn);
        provinceMapObject3D.add(mesh);
        provinceMapObject3D.add(line);
      });
    }

    mapObject3D.add(provinceMapObject3D);
  });

  return { mapObject3D, label2dData };
}

// 根据地图数据生成元素数据（用于MapManager）
export function generateElementsData(label2dData: any[]) {
  const elements: any[] = [];
  console.log("生成元素数据", label2dData);
  
  label2dData.forEach((item: any, index: number) => {
    const { featureCenterCoord, featureName } = item;
    
    // 生成标签元素
    elements.push({
      id: `label-${index}`,
      type: 'label',
      position: featureCenterCoord,
      text: featureName.replace('特别行政区', ''),
    });
    
    // 生成点位元素
    // elements.push({
    //   id: `spot-${index}`,
    //   type: 'spot',
    //   position: featureCenterCoord,
    // });
    
    // 生成模型元素
    // elements.push({
    //   id: `model-${index}`,
    //   type: 'model',
    //   position: featureCenterCoord,
    //   modelPath: '/models/cone.glb',
    //   scale: [0.3, 0.3, 0.6],
    //   animation: true,
    // });
  });
  
  return elements;
}

// 生成连线元素数据
export function generateLineElementsData(label2dData: any[], maxLineCount: number = 5) {
  const elements: any[] = [];
  
  for (let count = 0; count < maxLineCount; count++) {
    const midIndex = Math.floor(label2dData.length / 2);
    const indexStart = Math.floor(Math.random() * midIndex);
    const indexEnd = Math.floor(Math.random() * midIndex) + midIndex - 1;
    
    if (indexStart < label2dData.length && indexEnd < label2dData.length) {
      elements.push({
        id: `line-${count}`,
        type: 'line',
        position: label2dData[indexStart].featureCenterCoord,
        startPosition: label2dData[indexStart].featureCenterCoord,
        endPosition: label2dData[indexEnd].featureCenterCoord,
      });
    }
  }
  
  return elements;
}

// 生成地图2D标签
export function generateMapLabel2D(label2dData: any) {
  const labelObject2D = new THREE.Object3D();
  label2dData.forEach((item: any) => {
    const { featureCenterCoord, featureName } = item;
    const labelObjectItem = draw2dLabel(featureCenterCoord, featureName);
    if (labelObjectItem) {
      labelObject2D.add(labelObjectItem);
    }
  });
  return labelObject2D;
}

// 生成地图spot点位
export function generateMapSpot(label2dData: any) {
  const spotObject3D = new THREE.Object3D();
  const spotList: any = [];
  label2dData.forEach((item: any) => {
    const { featureCenterCoord } = item;
    const spotObjectItem = drawSpot(featureCenterCoord);
    if (spotObjectItem && spotObjectItem.circle && spotObjectItem.ring) {
      spotObject3D.add(spotObjectItem.circle);
      spotObject3D.add(spotObjectItem.ring);
      spotList.push(spotObjectItem.ring);
    }
  });
  return { spotObject3D, spotList };
}

// 绘制二维标签
export const draw2dLabel = (coord: [number, number], proviceName: string) => {
  if (coord && coord.length) {
    // 模版字符串
    const innerHTML = `<div class="your-classname" style="color: #fff;font-size:12px">${proviceName}</div>`;
    const labelDiv = document.createElement("div");
    labelDiv.innerHTML = innerHTML;
    labelDiv.style.pointerEvents = "none"; // 禁用事件
    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(coord[0], -coord[1], mapConfig.label2dZIndex);
    return labelObject;
  }
};

// 绘制气泡标签
export const draw2dBubble = (coord: [number, number], text: string, options?: {
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
}) => {
  if (coord && coord.length) {
    const {
      bgColor = "#1a1a1a",
      textColor = "#ffffff",
      borderColor = "#00d4ff",
      fontSize = 12
    } = options || {};

    // 创建SVG背景
    const svgBg = `
      <svg width="120" height="36" viewBox="0 0 120 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:${bgColor};stop-opacity:0.7" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="2" y="2" width="116" height="24" rx="12" ry="12" 
              fill="url(#bubbleGradient)" 
              stroke="${borderColor}" 
              stroke-width="1" 
              filter="url(#glow)"/>
      </svg>
    `;

    const bubbleDiv = document.createElement("div");
    bubbleDiv.style.position = "relative";
    bubbleDiv.style.pointerEvents = "none";
    bubbleDiv.style.filter = "drop-shadow(0 4px 8px rgba(0, 212, 255, 0.3))";
    
    bubbleDiv.innerHTML = `
      <div style="position: relative; display: inline-block;">
        ${svgBg}
        <div style="
          position: absolute;
          top: 2px;
          left: 2px;
          width: 116px;
          height: 24px;
          display: flex;
          z-index: 9999;
          align-items: center;
          justify-content: center;
          color: ${textColor};
          font-size: ${fontSize}px;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 8px;
          box-sizing: border-box;
        ">${text}</div>
      </div>
    `;

    const bubbleObject = new CSS2DObject(bubbleDiv);
    bubbleObject.position.set(coord[0], -coord[1], mapConfig.label2dZIndex + 1);
    return bubbleObject;
  }
};

// 绘制圆点
export const drawSpot = (coord: [number, number]) => {
  if (coord && coord.length) {
    /**
     * 绘制圆点
     */
    const spotGeometry = new THREE.CircleGeometry(0.2, 200);
    const spotMaterial = new THREE.MeshBasicMaterial({
      color: "#3EC5FB",
      side: THREE.DoubleSide,
    });
    const circle = new THREE.Mesh(spotGeometry, spotMaterial);
    circle.position.set(coord[0], -coord[1], mapConfig.spotZIndex);

    // 圆环
    const ringGeometry = new THREE.RingGeometry(0.2, 0.3, 50);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: "#3FC5FB",
      side: THREE.DoubleSide,
      transparent: true,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(coord[0], -coord[1], mapConfig.spotZIndex);
    return { circle, ring };
  }
};

/**
 * 线上移动物体
 */
export const drawflySpot = (curve: any) => {
  const aGeo = new THREE.SphereGeometry(0.2);
  const aMater = new THREE.MeshBasicMaterial({
    color: "#77f077",
    side: THREE.DoubleSide,
  });
  const aMesh: any = new THREE.Mesh(aGeo, aMater);
  // 保存曲线实例
  aMesh.curve = curve;
  aMesh._s = 0;
  return aMesh;
};

// 绘制两点链接飞线
export const drawLineBetween2Spot = (
  coordStart: [number, number],
  coordEnd: [number, number]
) => {
  const [x0, y0, z0] = [...coordStart, mapConfig.spotZIndex];
  const [x1, y1, z1] = [...coordEnd, mapConfig.spotZIndex];
  // 使用 QuadraticBezierCurve3 创建 三维二次贝塞尔曲线
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x0, -y0, z0),
    new THREE.Vector3((x0 + x1) / 2, -(y0 + y1) / 2, 20),
    new THREE.Vector3(x1, -y1, z1)
  );

  const flySpot = drawflySpot(curve);

  const lineGeometry = new THREE.BufferGeometry();
  // 获取曲线上50个点
  const points = curve.getPoints(50);
  const positions = [];
  const colors = [];
  const color = new THREE.Color();

  // 给每个顶点设置演示 实现渐变
  for (let j = 0; j < points.length; j++) {
    color.setHSL(0.21 + j, 0.77, 0.55 + j * 0.0025); // 色
    colors.push(color.r, color.g, color.b);
    positions.push(points[j].x, points[j].y, points[j].z);
  }
  // 放入顶点 和 设置顶点颜色
  lineGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3, true)
  );
  lineGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3, true)
  );

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    // color: "red",
    side: THREE.DoubleSide,
  });
  const flyLine = new THREE.Line(lineGeometry, material);

  return { flyLine, flySpot };
};
