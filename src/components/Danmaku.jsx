import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./Danmaku.css"; // 确保有对应的CSS文件来处理弹幕样式

const getRandomExcluding = (min, max, exclude) => {
  let random;
  do {
    random = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (random === exclude);
  return random;
};

const Danmaku = forwardRef((props, ref) => {
  const danmakuPoolRef = useRef(
    Array(50).fill().map(() => ({ 
      ref: React.createRef(), 
      text: "", 
      className: "danmaku-item" 
    }))
  );
  const [prevRow, setPrevRow] = useState(0);
  const currentIndexRef = useRef(0);
  const [danmakuList, setDanmakuList] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (danmakuList.length > 0) {
        const danmaku = danmakuList.shift();
        const currentIndex = currentIndexRef.current;
        const row = getRandomExcluding(1, 3, prevRow);
        danmakuPoolRef.current[currentIndex] = {
            ...danmakuPoolRef.current[currentIndex],
            text: danmaku.text,
            className: `danmaku-item active row-${row}`,
        };
        currentIndexRef.current = (currentIndex + 1) % danmakuPoolRef.current.length;
        setDanmakuList([...danmakuList, danmaku]); 
        setPrevRow(row);
        setTimeout(() => {
          const targetIndex = currentIndex;
          if (danmakuPoolRef.current[targetIndex]) {
            danmakuPoolRef.current[targetIndex].className = "danmaku-item";
            setDanmakuList(prev => [...prev]);
          }
        }, 10000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [danmakuList]);

  useImperativeHandle(ref, () => ({
    addDanmaku: (text) => {
        let list = [{ text },...danmakuList ];
        if (list.length > 50) {
            list = list.slice(0, 50);
        }
        console.log("addDanmaku", list);
        setDanmakuList(list);
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
