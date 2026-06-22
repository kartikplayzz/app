"use client";

import { useState, useRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface SpotlightCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  glowColor?: string;
  children?: React.ReactNode;
}

export function SpotlightCard({ 
  children, 
  className = "", 
  glowColor = "rgba(255, 255, 255, 0.05)", 
  ...props 
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {isHovered && (
        <div
          className="absolute pointer-events-none -z-10 transition-opacity duration-300 rounded-full animate-fade-in"
          style={{
            width: "350px",
            height: "350px",
            backgroundColor: glowColor,
            filter: "blur(60px)",
            left: `${coords.x - 175}px`,
            top: `${coords.y - 175}px`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
