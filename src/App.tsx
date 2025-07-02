import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import MapController from "./components/MapController";
import { GeoJsonType } from "./map3d/typed";

export type ProjectionFnParamType = {
  center: [number, number];
  scale: number;
};

// 地图放大倍率
const MapScale: any = {
  province: 100,
  city: 200,
  district: 300,
};

function App() {
  const [geoJson, setGeoJson] = useState<GeoJsonType>();
  const [mapAdCode, setMapAdCode] = useState<number>(100000);
  const [projectionFnParam, setProjectionFnParam] =
    useState<ProjectionFnParamType>({
      center: [104.0, 37.5],
      scale: 40,
    });

  // 请求地图数据
  const queryMapData = useCallback(async (code: number) => {
    const response = await axios.get(
      `https://web.xtjzx.cn/app/chinamap3d/geojson/${code}_full.json`
    );
    const { data } = response;
    setGeoJson(data);
  }, []);

  useEffect(() => {
    queryMapData(mapAdCode); // 默认的中国adcode码
  }, [mapAdCode, queryMapData]);

  // 双击事件
  const dblClickFn = (customProperties: any) => {
    console.log('Double click properties:', customProperties);
    
    // 确保 centroid 存在，否则使用 center 或默认值
    const centerCoords = customProperties.centroid || 
                        customProperties.center || 
                        [104.0, 37.5]; // 默认中心点
    
    const scale = MapScale[customProperties.level] || 40; // 默认缩放
    
    setMapAdCode(customProperties.adcode);
    setProjectionFnParam({
      center: centerCoords,
      scale: scale,
    });
  };

  return (
    <>
      {geoJson && (
        <MapController
          geoJson={geoJson}
          dblClickFn={dblClickFn}
          projectionFnParam={projectionFnParam}
        />
      )}
    </>
  );
}

export default App;
