import { motion } from "framer-motion";
import React from "react";

const sceneTransitions = [
  {
    name: "fade",
    variants: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  {
    name: "slide-left",
    variants: {
      hidden: { x: "-100%", opacity: 0 },
      visible: { x: 0, opacity: 1 },
    },
  },
  {
    name: "slide-right",
    variants: {
      hidden: { x: "100%", opacity: 0 },
      visible: { x: 0, opacity: 1 },
    },
  },
  {
    name: "slide-up",
    variants: {
      hidden: { y: "100%", opacity: 0 },
      visible: { y: 0, opacity: 1 },
    },
  },
  {
    name: "slide-down",
    variants: {
      hidden: { y: "-100%", opacity: 0 },
      visible: { y: 0, opacity: 1 },
    },
  },
  {
    name: "zoom-in",
    variants: {
      hidden: { scale: 0.85, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
    },
  },
  {
    name: "zoom-out",
    variants: {
      hidden: { scale: 1.1, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
    },
  },
  {
    name: "rotate-in",
    variants: {
      hidden: { rotate: -15, opacity: 0 },  // menos ángulo para suavizar
      visible: { rotate: 0, opacity: 1 },
    },
  },
];

export const AnimatedScene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const randomTransition =
    sceneTransitions[Math.floor(Math.random() * sceneTransitions.length)];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={randomTransition.variants}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      style={{ height: "100%", width: "100%" }}
    >
      {children}
    </motion.div>
  );
};
