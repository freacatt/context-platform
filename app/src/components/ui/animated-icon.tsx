"use client"

import { motion, Variants } from "framer-motion"
import { LucideIcon, LucideProps } from "lucide-react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface AnimatedIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon
  animation?: "scale" | "rotate" | "wiggle" | "bounce" | "shake"
  containerClassName?: string
}

export const AnimatedIcon = forwardRef<SVGSVGElement, AnimatedIconProps>(
  ({ icon: Icon, animation = "scale", className, containerClassName, ...props }, ref) => {
    
    const variants: Record<string, Variants> = {
      scale: {
        hover: { scale: 1.2 },
        tap: { scale: 0.9 },
      },
      rotate: {
        hover: { rotate: 15 },
        tap: { rotate: -15 },
      },
      wiggle: {
        hover: { rotate: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } },
      },
      bounce: {
        hover: { y: -5, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.3 } },
      },
      shake: {
        hover: { x: [0, -5, 5, -5, 5, 0], transition: { duration: 0.5 } },
      }
    }

    const selectedVariant = variants[animation] || variants.scale

    return (
      <motion.div
        whileHover="hover"
        whileTap="tap"
        className={cn("inline-flex items-center justify-center", containerClassName)}
      >
        <motion.div variants={selectedVariant}>
          <Icon className={cn("shrink-0", className)} {...props} ref={ref} />
        </motion.div>
      </motion.div>
    )
  }
)

AnimatedIcon.displayName = "AnimatedIcon"
