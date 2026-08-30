import { useMemo, useState } from 'react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STEG_COMMANDS } from '@/lib/steggen';
import type { ModuleComponentProps } from '@/types';

export function StegGen({ onBack }: ModuleComponentProps) {
  const [fileName, setFileName] = useState('image.jpg');
  const [password, setPassword] = useState('');
  const [outFile, setOutFile] = useState('');

  const commands = useMemo(
    () => STEG_COMMANDS.map((c) => ({ ...c, command: c.build(fileName || 'file.bin', { password, outFile }) })),
    [fileName, password, outFile],
  );

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="StegGen"
        description="Generates steghide/zsteg/exiftool/binwalk command lines for a given file. Nothing is executed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">File name</Label>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Password (optional, steghide)</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Output file (optional)</Label>
            <Input value={outFile} onChange={(e) => setOutFile(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {commands.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-1.5 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="normal-case">
                      {c.tool}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground">{c.purpose}</p>
                  </div>
                  <CopyButton text={c.command} />
                </div>
                <code className="block break-all rounded bg-muted p-2 text-[11px]">{c.command}</code>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StegGen;
