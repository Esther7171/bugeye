import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
}

export function ModuleHeader({ title, description, onBack }: ModuleHeaderProps) {
  return (
    <div className="flex items-start gap-2 border-b border-border px-3 py-2.5">
      <Button variant="ghost" size="icon" className="mt-0.5 size-6 shrink-0" onClick={onBack}>
        <ArrowLeft className="size-3.5" />
      </Button>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
