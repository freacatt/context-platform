"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ComponentProps, forwardRef } from "react"

// Framer Motion redefines these DOM handlers with different signatures.
type ButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>

const MotionButton = motion.create(Button)

export const AnimatedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <MotionButton
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={className}
        {...props}
        ref={ref}
      />
    )
  }
)

AnimatedButton.displayName = "AnimatedButton"
