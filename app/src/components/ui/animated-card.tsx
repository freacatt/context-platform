"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { ComponentProps, forwardRef } from "react"

type CardProps = ComponentProps<typeof Card>

export const AnimatedCard = forwardRef<HTMLDivElement, CardProps & { delay?: number }>(
  ({ className, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="h-full" 
      >
        <Card className={className} {...props} ref={ref} />
      </motion.div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard"
