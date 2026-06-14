import fs from 'node:fs';
import path from 'node:path';
import type { AgentManifest } from '@openbrige/shared-types';

export class AgentRegistry {
  private agents = new Map<string, AgentManifest>();
  private agentDirs = new Map<string, string>(); // agent id -> directory path

  /**
   * Scan directories for agent.json files and load all agent manifests.
   * Later directories override earlier ones (user-level overrides built-in).
   */
  loadAgents(dirs: string[]): AgentManifest[] {
    for (const dir of dirs) {
      this.scanDirectory(dir);
    }
    return this.listAgents();
  }

  /**
   * Get an agent manifest by id.
   */
  getAgent(id: string): AgentManifest | undefined {
    return this.agents.get(id);
  }

  /**
   * Get the directory path for an agent (where agent.json and templates live).
   */
  getAgentDir(id: string): string | undefined {
    return this.agentDirs.get(id);
  }

  /**
   * List all loaded agent manifests.
   */
  listAgents(): AgentManifest[] {
    return [...this.agents.values()];
  }

  /**
   * Load built-in agents from plugins/agents/ and user-level agents from .openbrige/agents/.
   * The monorepoRoot is used to locate the built-in plugins/agents/ directory.
   */
  loadDefaultAgents(cwd: string): AgentManifest[] {
    const dirs: string[] = [];

    // Built-in agents: walk up from cwd to find monorepo root
    const builtinDir = findBuiltinAgentsDir(cwd);
    if (builtinDir) {
      dirs.push(builtinDir);
    }

    // User-level agents
    const userDir = path.join(cwd, '.openbrige', 'agents');
    if (fs.existsSync(userDir)) {
      dirs.push(userDir);
    }

    return this.loadAgents(dirs);
  }

  private scanDirectory(dir: string): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(entryPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      const manifestPath = path.join(entryPath, 'agent.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const json = JSON.parse(raw) as AgentManifest;
        const manifest = validateManifest(json);
        // Later dirs override earlier ones (user-level overrides built-in)
        this.agents.set(manifest.id, manifest);
        this.agentDirs.set(manifest.id, entryPath);
      } catch {
        // skip invalid agent.json files
      }
    }
  }
}

/**
 * Validate and return an AgentManifest, throwing on invalid data.
 */
function validateManifest(json: AgentManifest): AgentManifest {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid agent manifest: not an object');
  }
  if (typeof json.id !== 'string' || !json.id) {
    throw new Error('Invalid agent manifest: missing or invalid "id"');
  }
  if (typeof json.name !== 'string' || !json.name) {
    throw new Error('Invalid agent manifest: missing or invalid "name"');
  }
  if (typeof json.command !== 'string' || !json.command) {
    throw new Error('Invalid agent manifest: missing or invalid "command"');
  }
  const validTypes = ['cli-agent', 'ide-agent', 'cloud-agent'];
  if (!validTypes.includes(json.type)) {
    throw new Error(`Invalid agent manifest: "type" must be one of ${validTypes.join(', ')}`);
  }
  if (typeof json.description !== 'string') {
    throw new Error('Invalid agent manifest: missing or invalid "description"');
  }
  if (typeof json.icon !== 'string') {
    throw new Error('Invalid agent manifest: missing or invalid "icon"');
  }
  if (typeof json.color !== 'string') {
    throw new Error('Invalid agent manifest: missing or invalid "color"');
  }
  if (!json.detection || !Array.isArray(json.detection.commands) || !Array.isArray(json.detection.configFiles)) {
    throw new Error('Invalid agent manifest: missing or invalid "detection"');
  }
  if (!json.integration || typeof json.integration.method !== 'string') {
    throw new Error('Invalid agent manifest: missing or invalid "integration.method"');
  }
  const validMethods = ['mcp', 'config-inject', 'instruction'];
  if (!validMethods.includes(json.integration.method)) {
    throw new Error(`Invalid agent manifest: "integration.method" must be one of ${validMethods.join(', ')}`);
  }
  if (typeof json.profile !== 'string' || !json.profile) {
    throw new Error('Invalid agent manifest: missing or invalid "profile"');
  }
  return json;
}

/**
 * Walk up from a starting directory to find the monorepo root (has pnpm-workspace.yaml)
 * and return the plugins/agents/ directory path.
 */
function findBuiltinAgentsDir(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const marker = path.join(dir, 'pnpm-workspace.yaml');
    if (fs.existsSync(marker)) {
      const agentsDir = path.join(dir, 'plugins', 'agents');
      if (fs.existsSync(agentsDir)) return agentsDir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
