import { useEffect, useState } from 'react';

export default function TypeText({ text, delay = 0, speed = 70, className = '' }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let iv;
    const start = setTimeout(() => {
      iv = setInterval(() => {
        setN((v) => {
          if (v >= text.length) {
            clearInterval(iv);
            return v;
          }
          return v + 1;
        });
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      if (iv) clearInterval(iv);
    };
  }, [text, delay, speed]);
  return (
    <span className={`type-text ${className}`}>
      {text.slice(0, n)}
      <i className="type-caret" />
    </span>
  );
}
