import type { HTMLMotionProps } from "motion/react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";

type RevealDirection = "down" | "left" | "right" | "up";

type RevealProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "transition" | "viewport" | "whileInView"
> & {
  readonly delay?: number;
  readonly direction?: RevealDirection;
  readonly distance?: number;
};

const directionOffsets: Record<
  RevealDirection,
  { readonly x: number; readonly y: number }
> = {
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  up: { x: 0, y: 1 },
};

export const Reveal = ({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 24,
  ...props
}: RevealProps) => {
  const reduceMotion = useReducedMotion();
  const offset = directionOffsets[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              x: offset.x * distance,
              y: offset.y * distance,
            }
      }
      transition={{
        delay: reduceMotion ? 0 : delay,
        duration: reduceMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ amount: 0.15, once: true }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
