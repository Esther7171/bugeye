import { browser } from 'wxt/browser';

export function AppHeader() {
  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-card/60 px-3 py-1.5">
      <img src={browser.runtime.getURL('/icon/32.png')} alt="" className="size-4 shrink-0" />
      <span className="text-xs font-semibold tracking-tight">BugEye</span>
      <span className="text-[10px] text-muted-foreground">- spot what others miss</span>
    </div>
  );
}
