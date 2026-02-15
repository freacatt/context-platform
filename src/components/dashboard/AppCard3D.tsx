import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { cn } from "@/lib/utils";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  to: string;
  icon?: LucideIcon;
  colorClass?: string;
  buttonColorClass?: string;
};

export const AppCard3D: React.FC<Props> = ({
  title,
  description,
  to,
  icon,
  colorClass = "bg-primary",
  buttonColorClass,
}) => {
  const Line = ({ className = "" }) => (
    <div
      className={cn(
        "h-px w-full via-zinc-400 from-1% from-zinc-200 to-zinc-600 absolute z-0 dark:via-zinc-700 dark:from-zinc-900 dark:to-zinc-500",
        className,
      )}
    />
  );
  const Lines = () => (
    <>
      <Line className="bg-linear-to-l left-0 top-2 sm:top-4 md:top-6" />
      <Line className="bg-linear-to-r bottom-2 sm:bottom-4 md:bottom-6 left-0" />
      <Line className="w-px bg-linear-to-t right-2 sm:right-4 md:right-6 h-full inset-y-0" />
      <Line className="w-px bg-linear-to-t left-2 sm:left-4 md:left-6 h-full inset-y-0" />
    </>
  );

  return (
    <div className="relative">
      <Lines />
      <Card className="w-full border-none shadow-none bg-card/60 backdrop-blur rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-4">
          <div
            className={cn(
              "w-full h-2 rounded-md",
              colorClass ?? "bg-primary"
            )}
          />
        </div>
        <CardHeader className="pt-0">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", colorClass)}>
                <AnimatedIcon icon={icon} size={18} className="text-white" animation="scale" />
              </div>
            ) : null}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <Link to={to} className="w-full block">
            <AnimatedButton
              variant="secondary"
              className={cn(
                "w-full justify-between group backdrop-blur-md border border-white/10 dark:border-white/5",
                buttonColorClass ?? "bg-background/60 hover:bg-background/80"
              )}
            >
              Open App <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </AnimatedButton>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
