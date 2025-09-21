import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";

interface HelpTipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function HelpTip({ content, side = "top", className }: HelpTipProps) {
  const title = typeof content === "string" ? content : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          title={title}
          aria-label={title || "Help"}
          className={[
            "inline-flex items-center justify-center h-5 w-5 p-0 text-foreground/80 hover:text-foreground rounded-full border border-border",
            className || "",
          ].join(" ")}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {typeof content === "string" ? <span>{content}</span> : content}
      </TooltipContent>
    </Tooltip>
  );
}

export default HelpTip;
