import { cn } from "@/lib/utils"

const NOISE_TEXTURE_DATA_URL =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20160%20160'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.8'%20numOctaves='4'%20stitchTiles='noStitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'%20opacity='0.45'/%3E%3C/svg%3E"

type GlobalShaderOverlayProps = {
  className?: string
}

export const GlobalShaderOverlay = ({ className }: GlobalShaderOverlayProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-30 overflow-hidden",
        "opacity-60 mix-blend-normal dark:mix-blend-screen",
        className
      )}
    >
      <div className="absolute inset-0 dark:hidden">
        <div
          className="absolute -top-[25%] left-[-10%] h-[85%] w-[130%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(30, 64, 175, 0.45) 0%, rgba(15, 23, 42, 0) 60%)",
          }}
        />
        <div
          className="absolute -top-[10%] right-[-15%] h-[65%] w-[55%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.8) 0%, rgba(56, 189, 248, 0) 55%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-20%] h-[90%] w-[140%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 100%, rgba(30, 64, 175, 0.35) 0%, rgba(15, 23, 42, 0) 65%)",
          }}
        />
        <div
          className="absolute inset-[6%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 35% 55%, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0) 55%)",
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[-5%] h-[40%] w-[45%] blur-2xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 100%, rgba(37, 99, 235, 0.5) 0%, rgba(15, 23, 42, 0) 55%)",
          }}
        />
      </div>

      <div className="absolute inset-0 hidden dark:block">
        <div
          className="absolute -top-[45%] left-[-25%] h-[100%] w-[150%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 0%, rgba(59, 130, 246, 0.75) 0%, rgba(15, 23, 42, 0) 55%)",
          }}
        />
        <div
          className="absolute -top-[5%] right-[-20%] h-[70%] w-[60%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.8) 0%, rgba(56, 189, 248, 0) 60%)",
          }}
        />
        <div
          className="absolute inset-[8%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 55% 80%, rgba(15, 23, 42, 0.9) 0%, rgba(0, 0, 0, 0.9) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] h-[45%] w-[50%] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 100%, rgba(96, 165, 250, 0.9) 0%, rgba(15, 23, 42, 0) 60%)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url(${NOISE_TEXTURE_DATA_URL})`,
        }}
      />
    </div>
  )
}
