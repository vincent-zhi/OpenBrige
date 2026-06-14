import fs from 'node:fs';
import path from 'node:path';

/**
 * Replace `{{varName}}` placeholders in a template string with provided values.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : `{{${key}}}`;
  });
}

/**
 * Load a template file from an agent directory's templates/ folder and render it.
 * The agentDir is the directory containing agent.json (e.g. plugins/agents/cursor/).
 * The template name is relative to the templates/ subdirectory.
 */
export function loadAndRenderTemplate(
  agentDir: string,
  templateName: string,
  vars: Record<string, string>,
): string {
  const templatePath = path.join(agentDir, 'templates', templateName);
  const raw = fs.readFileSync(templatePath, 'utf-8');
  return renderTemplate(raw, vars);
}

/**
 * Build the standard template variables from setup context.
 */
export function buildTemplateVars(opts: {
  serverUrl: string;
  wsUrl: string;
  openbrigeDir: string;
  cwd: string;
}): Record<string, string> {
  return {
    serverUrl: opts.serverUrl,
    wsUrl: opts.wsUrl,
    openbrigeDir: opts.openbrigeDir,
    cwd: opts.cwd,
  };
}
