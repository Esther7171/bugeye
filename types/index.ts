export type PillarId =
  | 'tab-inspector'
  | 'page-recon'
  | 'list-triage'
  | 'traffic'
  | 'encode-payload'
  | 'cli-bridge'
  | 'osint'
  | 'vuln-hunting'
  | 'utility';

export interface ModuleMeta {
  id: string;
  pillar: PillarId;
  name: string;
  description: string;
  status: 'live' | 'soon';
}

export interface ModuleComponentProps {
  onBack: () => void;
  onNavigate: (pillar: PillarId, moduleId?: string) => void;
}

export interface FetchResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AliveCheckResult {
  url: string;
  ok: boolean;
  status: number | null;
  statusText: string;
  category: 'live' | 'dead' | 'blocked';
  ms: number;
}

export interface UrlHeadersResult {
  url: string;
  status: number | null;
  headers: Record<string, string>;
  error?: string;
}

export interface TabHeadersResult {
  url: string;
  status: number | null;
  headers: Record<string, string>;
  method: 'webrequest' | 'fetch';
  error?: string;
}
