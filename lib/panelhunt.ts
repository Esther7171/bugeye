export interface PanelPathDef {
  path: string;
  label: string;
}

// A curated set of commonly-exposed admin/login/sensitive paths for light,
// single-request-per-path probing. This is not a wordlist bruteforcer.
const ADMIN_KEYWORDS = [
  'admin',
  'wp-admin',
  'wp-login',
  'login',
  'signin',
  'dashboard',
  'cpanel',
  'phpmyadmin',
  'manager',
  'console',
  'cms',
  'portal',
];

// Shared with RobotsPeek and AutoFinder: flags a disclosed path as
// admin-panel-shaped, e.g. WordPress sites always Disallow /wp-admin/ in
// robots.txt, which is exactly the kind of hit PanelHunt is also looking for.
export function looksLikeAdminPath(path: string): boolean {
  const lower = path.toLowerCase();
  return ADMIN_KEYWORDS.some((k) => lower.includes(k));
}

export const PANEL_PATHS: PanelPathDef[] = [
  { path: '/admin', label: 'Admin panel' },
  { path: '/admin/login', label: 'Admin login' },
  { path: '/login', label: 'Login page' },
  { path: '/wp-admin/', label: 'WordPress admin' },
  { path: '/wp-login.php', label: 'WordPress login' },
  { path: '/administrator', label: 'Joomla admin' },
  { path: '/.git/HEAD', label: 'Exposed .git' },
  { path: '/.env', label: 'Exposed .env' },
  { path: '/api', label: 'API root' },
  { path: '/api/docs', label: 'API docs' },
  { path: '/swagger.json', label: 'Swagger spec' },
  { path: '/swagger-ui.html', label: 'Swagger UI' },
  { path: '/graphql', label: 'GraphQL endpoint' },
  { path: '/phpmyadmin/', label: 'phpMyAdmin' },
  { path: '/manager/html', label: 'Tomcat manager' },
  { path: '/actuator', label: 'Spring Boot Actuator' },
  { path: '/actuator/health', label: 'Actuator health' },
  { path: '/server-status', label: 'Apache server-status' },
  { path: '/.DS_Store', label: 'Exposed .DS_Store' },
  { path: '/backup/', label: 'Backup directory' },
  { path: '/config.php', label: 'Config file' },
  { path: '/jenkins/', label: 'Jenkins' },
  { path: '/grafana/', label: 'Grafana' },
  { path: '/kibana/', label: 'Kibana' },
];
