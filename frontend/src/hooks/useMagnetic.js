import { useState } from "react";

const MAX_OFFSET = 14;

export function useMagnetic(strength = 0.25) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function onMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    const nextX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, x * strength));
    const nextY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, y * strength));

    setOffset({ x: nextX, y: nextY });
  }

  function onMouseLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return {
    onMouseMove,
    onMouseLeave,
    style: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    },
  };
}
