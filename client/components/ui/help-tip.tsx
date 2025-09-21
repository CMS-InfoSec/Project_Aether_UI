import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import React from 'react';

interface HelpTipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HelpTip({ content, side = 'top', className }: HelpTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={['h-5 w-5 p-0 text-muted-foreground hover:text-foreground', className||''].join(' ')} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {typeof content === 'string' ? <span>{content}</span> : content}
      </TooltipContent>
    </Tooltip>
  );
}

export default HelpTip;
