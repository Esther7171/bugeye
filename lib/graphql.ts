export interface GraphQLPathDef {
  path: string;
  label: string;
}

export const GRAPHQL_PATHS: GraphQLPathDef[] = [
  { path: '/graphql', label: 'GraphQL' },
  { path: '/api/graphql', label: 'API GraphQL' },
  { path: '/graphql/console', label: 'GraphQL console' },
  { path: '/v1/graphql', label: 'GraphQL v1' },
  { path: '/graphiql', label: 'GraphiQL playground' },
  { path: '/api/v1/graphql', label: 'API v1 GraphQL' },
];

// Deliberately shallow: only root type names, not fields/args/nested types.
// Enough to prove introspection is reachable without pulling the whole schema.
export const INTROSPECTION_QUERY =
  '{ __schema { queryType { name } mutationType { name } subscriptionType { name } types { name kind } } }';

export const INTROSPECTION_BODY = JSON.stringify({ query: INTROSPECTION_QUERY });

export interface GraphQLIntrospectionSummary {
  queryTypeName: string | null;
  hasMutation: boolean;
  hasSubscription: boolean;
  typeCount: number;
  typeNames: string[];
}

export type GraphQLVerdict = 'introspection-enabled' | 'introspection-disabled' | 'graphql-error' | 'not-graphql';

export interface GraphQLParsedResponse {
  verdict: GraphQLVerdict;
  summary: GraphQLIntrospectionSummary | null;
  errorMessage: string | null;
}

interface SchemaTypeRef {
  name?: string;
  kind?: string;
}

interface IntrospectionSchema {
  queryType?: { name?: string } | null;
  mutationType?: { name?: string } | null;
  subscriptionType?: { name?: string } | null;
  types?: SchemaTypeRef[];
}

interface GraphQLResponseBody {
  data?: { __schema?: IntrospectionSchema | null } | null;
  errors?: { message?: string }[];
}

export function parseIntrospectionResponse(body: string): GraphQLParsedResponse | null {
  const text = body.trim();
  if (!text) return null;

  let json: GraphQLResponseBody;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object') return null;

  const schema = json.data?.__schema;
  if (schema && Array.isArray(schema.types)) {
    const typeNames = schema.types
      .map((t) => t.name)
      .filter((n): n is string => !!n)
      .sort();
    return {
      verdict: 'introspection-enabled',
      summary: {
        queryTypeName: schema.queryType?.name ?? null,
        hasMutation: !!schema.mutationType?.name,
        hasSubscription: !!schema.subscriptionType?.name,
        typeCount: typeNames.length,
        typeNames,
      },
      errorMessage: null,
    };
  }

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message = json.errors
      .map((e) => e.message)
      .filter((m): m is string => !!m)
      .join('; ');
    const disabled = /introspection/i.test(message);
    return {
      verdict: disabled ? 'introspection-disabled' : 'graphql-error',
      summary: null,
      errorMessage: message || 'GraphQL error response',
    };
  }

  return null;
}

export interface GraphQLProbeResult {
  path: string;
  label: string;
  url: string;
  status: number | null;
  verdict: GraphQLVerdict;
  summary: GraphQLIntrospectionSummary | null;
  errorMessage: string | null;
}

export function graphqlResultsToMarkdown(target: string, results: GraphQLProbeResult[]): string {
  const lines: string[] = [`# GraphQLCheck: ${target}`, ''];
  const enabled = results.filter((r) => r.verdict === 'introspection-enabled');

  if (enabled.length === 0) {
    lines.push('No candidate endpoint had introspection enabled.');
  } else {
    lines.push(`${enabled.length} endpoint(s) with introspection enabled:`, '');
    for (const r of enabled) {
      lines.push(`## ${r.url}`);
      if (r.summary) {
        lines.push(
          `- Query type: ${r.summary.queryTypeName ?? 'unknown'}`,
          `- Mutation type present: ${r.summary.hasMutation ? 'yes' : 'no'}`,
          `- Subscription type present: ${r.summary.hasSubscription ? 'yes' : 'no'}`,
          `- Type count: ${r.summary.typeCount}`,
          `- Types: ${r.summary.typeNames.join(', ')}`,
        );
      }
      lines.push('');
    }
  }

  lines.push('## All candidates checked', '');
  for (const r of results) {
    lines.push(`- ${r.url} (${r.label}): ${r.verdict}${r.errorMessage ? ` - ${r.errorMessage}` : ''}`);
  }

  return lines.join('\n');
}
