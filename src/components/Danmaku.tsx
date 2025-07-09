import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./Danmaku.css"; // 确保有对应的CSS文件来处理弹幕样式

const getRandomExcluding = (min: number, max: number, exclude: number[]): number => {
  let random: number;
  do {
    random = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (exclude.includes(random));
  return random;
};

interface DanmakuItem {
  text: string;
}

interface DanmakuProps {
  initDanmu?: DanmakuItem[];
}

interface DanmakuRef {
  addDanmaku: (text: string) => void;
}


const Danmaku = forwardRef<DanmakuRef, DanmakuProps>(({ initDanmu }, ref) => {
  const danmakuPoolRef = useRef(
    Array(50).fill(null).map(() => ({ 
      ref: React.createRef<HTMLDivElement>(), 
      text: "", 
      className: "danmaku-item" 
    }))
  );
  const [prevRow,setPrevRow] = useState([] as number[]);
  const currentIndexRef = useRef(0);
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>(initDanmu || []);
  
  useEffect(() => { 
    if (initDanmu) {
      setDanmakuList(initDanmu);
    }
  }, [initDanmu]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (danmakuList.length > 0) {
        const danmaku = danmakuList.shift()!;
        const currentIndex = currentIndexRef.current;
        const row = getRandomExcluding(1, 4, prevRow);
        danmakuPoolRef.current[currentIndex] = {
          ...danmakuPoolRef.current[currentIndex],
          text: danmaku.text.length>40?danmaku.text.slice(0, 40)+"...":danmaku.text,
          className: `danmaku-item active row-${row}`,
        };
        currentIndexRef.current = (currentIndex + 1) % danmakuPoolRef.current.length;
        setDanmakuList([...danmakuList, danmaku]); 
        setPrevRow([...prevRow, row].slice(-2)); // 保留最近的2个行号
        setTimeout(() => {
          const targetIndex = currentIndex;
          if (danmakuPoolRef.current[targetIndex]) {
            danmakuPoolRef.current[targetIndex].className = "danmaku-item";
            setDanmakuList(prev => [...prev]);
          }
        }, 15000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [danmakuList]);

  useImperativeHandle(ref, () => ({
    addDanmaku: (text: string) => {
      let list = [{ text }, ...danmakuList];
      if (list.length > 50) {
        list = list.slice(0, 50);
      }
      setDanmakuList(list);
      console.log("弹幕添加成功", list);
    },
  }));
  
  return (
    <div className="danmaku-container">
      {danmakuPoolRef.current.map((item, index) => (
        <div
          key={index}
          className={item.className || "danmaku-item"}
          ref={item.ref}
        >
          {item.text || ""}
        </div>
      ))}
    </div>
  );
});

export default Danmaku;
