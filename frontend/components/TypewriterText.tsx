"use client";

import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  delay?: number;
}

export const TypewriterText = ({ text, delay = 30 }: TypewriterTextProps) => {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentText(""); 
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  // 本文は Noto Sans JP を適用
  return (
    <p className="text-base leading-relaxed italic text-[#f5f0e8]/90 whitespace-pre-wrap font-sans">
      {currentText}
    </p>
  );
};