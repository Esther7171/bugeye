export interface ApiSpecPath {
  path: string;
  label: string;
}

export const API_SPEC_PATHS: ApiSpecPath[] = [
  { path: '/swagger.json', label: 'Swagger JSON' },
  { path: '/swagger.yaml', label: 'Swagger YAML' },
  { path: '/swagger.yml', label: 'Swagger YAML' },
  { path: '/swagger/v1/swagger.json', label: 'Swagger v1 JSON' },
  { path: '/swagger/v2/swagger.json', label: 'Swagger v2 JSON' },
  { path: '/v2/swagger.json', label: 'Swagger v2' },
  { path: '/v3/api-docs', label: 'SpringDoc / OpenAPI v3' },
  { path: '/v3/api-docs.yaml', label: 'OpenAPI v3 YAML' },
  { path: '/v3/api-docs/swagger-config', label: 'SpringDoc swagger-config' },
  { path: '/api-docs', label: 'API docs JSON' },
  { path: '/api-docs.json', label: 'API docs JSON' },
  { path: '/api/swagger.json', label: 'API Swagger JSON' },
  { path: '/api/openapi.json', label: 'API OpenAPI JSON' },
  { path: '/openapi.json', label: 'OpenAPI JSON' },
  { path: '/openapi.yaml', label: 'OpenAPI YAML' },
  { path: '/openapi.yml', label: 'OpenAPI YAML' },
  { path: '/openapi', label: 'OpenAPI' },
  { path: '/.well-known/openapi.json', label: 'Well-known OpenAPI' },
  { path: '/docs/swagger.json', label: 'Docs Swagger' },
  { path: '/swagger-ui/swagger.json', label: 'Swagger UI spec' },
  { path: '/swagger-resources', label: 'Swagger resources' },
  { path: '/swagger-ui.html', label: 'Swagger UI HTML' },
  { path: '/swagger-ui/index.html', label: 'Swagger UI index' },
  { path: '/redoc', label: 'ReDoc' },
  { path: '/docs', label: 'Docs' },
  { path: '/api/docs', label: 'API docs UI' },
  { path: '/postman.json', label: 'Postman collection' },
  { path: '/postman_collection.json', label: 'Postman collection' },
  { path: '/collection.json', label: 'Collection JSON' },
  { path: '/api/postman.json', label: 'API Postman collection' },
  { path: '/docs/postman_collection.json', label: 'Docs Postman collection' },
];

export type SpecKind = 'openapi' | 'swagger' | 'postman' | 'swagger-ui' | 'unknown';

export function classifySpecBody(body: string): SpecKind | null {
  const text = body.trim();
  if (!text) return null;
  if (/postman_collection|schema["']?\s*:\s*["']https?:\/\/schema\.getpostman/i.test(text)) {
    return 'postman';
  }
  if (/"openapi"\s*:|^openapi\s*:/im.test(text)) return 'openapi';
  if (/"swagger"\s*:|^swagger\s*:/im.test(text)) return 'swagger';
  if (/swagger-ui|redoc|id=["']swagger/i.test(text)) return 'swagger-ui';
  return null;
}
