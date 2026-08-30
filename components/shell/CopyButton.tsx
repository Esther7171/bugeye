import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/utils';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy', className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={async () => {
        await copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      {...props}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
