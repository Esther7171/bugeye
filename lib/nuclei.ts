import type { Payload } from './payloads';
import { slugify } from './export';

export interface NucleiTemplateResult {
  yaml: string;
  filename: string;
  command: string;
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Builds a ready-to-run Nuclei YAML template plus a `nuclei -u ... -t ...`
 * command line for a payload that has a nucleiMatcher. BugEye never runs this
 * itself, the user copies the template and command and runs their own nuclei
 * binary.
 */
export function buildNucleiTemplate(
  payload: Payload,
  options: { paramName?: string; target?: string } = {},
): NucleiTemplateResult | null {
  const matcher = payload.nucleiMatcher;
  if (!matcher) return null;

  const paramName = options.paramName?.trim() || 'id';
  const templateId = `bugeye-${slugify(payload.id)}`;
  const filename = `${templateId}.yaml`;
  const injected = encodeURIComponent(payload.value);

  const matchersLines =
    matcher.kind === 'sqli-time'
      ? [
          '    matchers:',
          '      - type: dsl',
          '        dsl:',
          `          - "duration>=${matcher.delaySeconds ?? 5}"`,
        ]
      : [
          '    matchers:',
          '      - type: word',
          '        part: body',
          '        words:',
          `          - "${escapeYamlDoubleQuoted(payload.value)}"`,
        ];

  const yaml = [
    `id: ${templateId}`,
    '',
    'info:',
    `  name: BugEye - ${payload.label}`,
    '  author: bugeye',
    `  severity: ${matcher.severity}`,
    `  description: ${matcher.description}`,
    `  tags: bugeye,${matcher.kind}`,
    '',
    'http:',
    '  - raw:',
    '      - |',
    `        GET /?${paramName}=${injected} HTTP/1.1`,
    '        Host: {{Hostname}}',
    '',
    ...matchersLines,
    '',
  ].join('\n');

  const command = `nuclei -u ${options.target || '<target>'} -t ${filename}`;

  return { yaml, filename, command };
}
