import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={title}
          aria-label={title || "Help"}
          className={[
            "h-5 w-5 p-0 text-foreground/80 hover:text-foreground rounded-full border border-border",
            className || "",
          ].join(" ")}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {typeof content === "string" ? <span>{content}</span> : content}
      </TooltipContent>
    </Tooltip>
  );
}

export default HelpTip;
