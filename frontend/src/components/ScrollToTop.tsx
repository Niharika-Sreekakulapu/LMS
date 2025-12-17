import React, { useState, useEffect } from 'react';

const ScrollToTop: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  // Calculate scroll progress
  const updateScrollProgress = () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    setScrollProgress(Math.min(progress, 100));
  };

  useEffect(() => {
    window.addEventListener('scroll', updateScrollProgress);
    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
    };
  }, []);

  return (
    <>
      {/* Scroll Progress Indicator */}
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />
    </>
  );
};

export default ScrollToTop;
