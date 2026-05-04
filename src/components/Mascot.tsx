import mascot from "@/assets/robot-mascot.png";
import { cn } from "@/lib/utils";

export function Mascot({ size = 160, float = true, className }: { size?: number; float?: boolean; className?: string }) {
  return (
    <img
      src={mascot}
      alt="Buddy the study robot"
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
      className={cn(float && "animate-float", "drop-shadow-2xl", className)}
    />
  );
}
