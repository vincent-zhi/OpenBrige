import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from './agent-registry.js';
import { loadAndRenderTemplate, buildTemplateVars } from './template-engine.js';
import type { AgentManifest } from '@openbrige/shared-types';

// ── Setup Context ──────────────────────────────────────────

export interface SetupContext {
  /** OpenBrige server URL (e.g. "http://192.168.1.100:7443") */
  serverUrl: string;
  /** WebSocket URL (e.g. "ws://192.168.1.100:7443") */
  wsUrl: string;
  /** Current working directory */
  cwd: string;
  /** .openbrige directory path */
  openbrigeDir: string;
  /** Whether .openbrige already existed */
  existingInstall: boolean;
}

export interface SetupStep {
  /** Step description */
  label: string;
  /** Execute the step */
  execute: () => void;
  /** Whether this step is optional */
  optional?: boolean;
}

// ── Setup Runner ────────────────────────────────────────────

export interface SetupResult {
  agent: string;
  serverUrl: string;
  steps: { label: string; success: boolean; optional: boolean; error?: string }[];
  profileInstalled: boolean;
  openbrigeDir: string;
}

export function runSetup(agentId: string, serverUrl: string, cwd?: string): SetupResult {
  const workDir = cwd ?? process.cwd();

  // Load agents via registry
  const registry = new AgentRegistry();
  registry.loadDefaultAgents(workDir);

  const manifest = registry.getAgent(agentId);
  if (!manifest) {
    const available = registry.listAgents().map((a) => a.id).join(', ');
    throw new Error(`Unknown agent: "${agentId}". Available: ${available}`);
  }

  const agentDir = registry.getAgentDir(agentId)!;

  // Normalize URLs
  const normalizedServerUrl = serverUrl.replace(/\/$/, '');
  const wsUrl = normalizedServerUrl.replace(/^http/, 'ws');

  // Ensure .openbrige directory
  const openbrigeDir = path.join(workDir, '.openbrige');
  const existingInstall = fs.existsSync(openbrigeDir);

  if (!existingInstall) {
    fs.mkdirSync(openbrigeDir, { recursive: true });
    fs.mkdirSync(path.join(openbrigeDir, 'plugins'), { recursive: true });
    fs.mkdirSync(path.join(openbrigeDir, 'profiles'), { recursive: true });

    const baseConfig = {
      version: '0.1.0',
      serverUrl: normalizedServerUrl,
    };
    fs.writeFileSync(
      path.join(openbrigeDir, 'config.json'),
      JSON.stringify(baseConfig, null, 2) + '\n',
    );
  } else {
    // Update existing config with server URL
    const configPath = path.join(openbrigeDir, 'config.json');
    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      existing.serverUrl = normalizedServerUrl;
      fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n');
    } catch { /* ignore */ }
  }

  // Copy profile
  let profileInstalled = false;
  try {
    const profileSource = findProfileSource(agentId, agentDir, workDir);
    if (profileSource && fs.existsSync(profileSource)) {
      const dest = path.join(openbrigeDir, 'profiles', agentId);
      if (!fs.existsSync(dest)) {
        copyDirSync(profileSource, dest);
      }
      profileInstalled = true;
    }
  } catch { /* profile copy is best-effort */ }

  // Build setup context and template vars
  const ctx: SetupContext = {
    serverUrl: normalizedServerUrl,
    wsUrl,
    cwd: workDir,
    openbrigeDir,
    existingInstall,
  };

  const templateVars = buildTemplateVars({
    serverUrl: ctx.serverUrl,
    wsUrl: ctx.wsUrl,
    openbrigeDir: ctx.openbrigeDir,
    cwd: ctx.cwd,
  });

  // Generate setup steps from manifest
  const steps = buildSetupSteps(manifest, agentDir, ctx, templateVars);

  // Execute steps
  const stepResults = steps.map((step) => {
    try {
      step.execute();
      return { label: step.label, success: true, optional: step.optional ?? false };
    } catch (err) {
      return {
        label: step.label,
        success: false,
        optional: step.optional ?? false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return {
    agent: agentId,
    serverUrl: normalizedServerUrl,
    steps: stepResults,
    profileInstalled,
    openbrigeDir,
  };
}

// ── Build Setup Steps from Manifest ────────────────────────

function buildSetupSteps(
  manifest: AgentManifest,
  agentDir: string,
  ctx: SetupContext,
  templateVars: Record<string, string>,
): SetupStep[] {
  const steps: SetupStep[] = [];
  const method = manifest.integration.method;

  if (method === 'mcp') {
    steps.push(...buildMcpSteps(manifest, agentDir, ctx, templateVars));
  } else if (method === 'config-inject') {
    steps.push(...buildConfigInjectSteps(manifest, agentDir, ctx, templateVars));
  }
  // 'instruction' method: no file steps needed, just instruction text

  // Handle fallback for MCP agents (e.g. CLAUDE.md for claude-code)
  if (manifest.integration.fallback) {
    const fallback = manifest.integration.fallback;
    if (fallback.method === 'config-inject' && fallback.files) {
      steps.push(...buildConfigInjectStepsFromFiles(fallback.files, agentDir, ctx, templateVars, true));
    }
  }

  return steps;
}

function buildMcpSteps(
  manifest: AgentManifest,
  _agentDir: string,
  ctx: SetupContext,
  _templateVars: Record<string, string>,
): SetupStep[] {
  const mcpConfig = manifest.integration.mcpConfig;
  if (!mcpConfig) return [];

  const targetPath = path.join(ctx.cwd, mcpConfig.target);
  const mcpEntry = {
    command: 'npx',
    args: ['-y', '@openbrige/cli', 'mcp', '--server', ctx.serverUrl],
  };

  return [
    {
      label: `Create ${manifest.name} MCP config`,
      execute: () => {
        // Ensure parent directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        let settings: Record<string, unknown> = {};
        if (fs.existsSync(targetPath)) {
          try {
            settings = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
          } catch { /* ignore */ }
        }

        // Merge MCP servers
        const existing = (settings.mcpServers as Record<string, unknown>) ?? {};
        settings.mcpServers = { ...existing, openbrige: mcpEntry };
        fs.writeFileSync(targetPath, JSON.stringify(settings, null, 2) + '\n');
      },
    },
  ];
}

function buildConfigInjectSteps(
  manifest: AgentManifest,
  agentDir: string,
  ctx: SetupContext,
  templateVars: Record<string, string>,
): SetupStep[] {
  const files = manifest.integration.files;
  if (!files || files.length === 0) return [];
  return buildConfigInjectStepsFromFiles(files, agentDir, ctx, templateVars);
}

function buildConfigInjectStepsFromFiles(
  files: Array<{ path: string; template: string }>,
  agentDir: string,
  ctx: SetupContext,
  templateVars: Record<string, string>,
  optional = false,
): SetupStep[] {
  return files.map((file) => ({
    label: `Create ${file.path}`,
    optional,
    execute: () => {
      const rendered = loadAndRenderTemplate(agentDir, file.template, templateVars);
      const targetPath = path.join(ctx.cwd, file.path);

      // Ensure parent directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (file.template.endsWith('.json')) {
        // JSON files: merge with existing if present
        if (fs.existsSync(targetPath)) {
          try {
            const existing = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
            const incoming = JSON.parse(rendered);
            const merged = { ...existing, ...incoming };
            fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
            return;
          } catch { /* fall through to overwrite */ }
        }
        fs.writeFileSync(targetPath, rendered + '\n');
      } else {
        // Non-JSON files: append if section not already present, or create
        const sectionMarker = 'OpenBrige Integration';
        if (fs.existsSync(targetPath)) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          if (!content.includes(sectionMarker)) {
            fs.appendFileSync(targetPath, '\n' + rendered);
          }
        } else {
          // For markdown-like files, add a header if the template doesn't start with one
          if (file.template.endsWith('.mdc') || file.template.endsWith('.md')) {
            fs.writeFileSync(targetPath, `# Project Instructions\n${rendered}`);
          } else {
            fs.writeFileSync(targetPath, rendered);
          }
        }
      }
    },
  }));
}

// ── Generate One-Liner Command ──────────────────────────────

export function generateSetupCommand(agentId: string, serverUrl: string): string {
  const registry = new AgentRegistry();
  registry.loadDefaultAgents(process.cwd());

  const manifest = registry.getAgent(agentId);
  if (!manifest) {
    const available = registry.listAgents().map((a) => a.id).join(', ');
    throw new Error(`Unknown agent: "${agentId}". Available: ${available}`);
  }
  return `npx @openbrige/cli@latest setup ${agentId} --server ${serverUrl}`;
}

// ── Generate Agent Instruction ──────────────────────────────

export function generateAgentInstruction(agentId: string, serverUrl: string): string {
  const registry = new AgentRegistry();
  registry.loadDefaultAgents(process.cwd());

  const manifest = registry.getAgent(agentId);
  if (!manifest) {
    throw new Error(`Unknown agent: "${agentId}"`);
  }
  const cmd = generateSetupCommand(agentId, serverUrl);
  return [
    `请运行以下命令来安装和配置 OpenBrige 集成：`,
    ``,
    `\`${cmd}\``,
    ``,
    `这个命令会自动完成以下操作：`,
    `1. 在当前项目目录初始化 .openbrige 配置`,
    `2. 安装 ${manifest.name} 的 Agent Profile`,
    `3. 配置 ${manifest.name} 与 OpenBrige 服务器的连接`,
    ``,
    `安装完成后，你可以通过 ${serverUrl} 在浏览器中监控 Agent 会话。`,
  ].join('\n');
}

// ── List Available Agents ───────────────────────────────────

export function listAvailableAgents(): { id: string; name: string; command: string; description: string }[] {
  const registry = new AgentRegistry();
  registry.loadDefaultAgents(process.cwd());

  return registry.listAgents().map((m) => ({
    id: m.id,
    name: m.name,
    command: m.command,
    description: m.description,
  }));
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Find the profile source directory for an agent.
 * Checks the agent directory first, then falls back to plugins/profiles/<agentId>.
 */
function findProfileSource(agentId: string, agentDir: string, cwd: string): string | null {
  // Check if the profile file exists in the agent directory
  const profileInAgentDir = path.join(agentDir, 'profile.yaml');
  if (fs.existsSync(profileInAgentDir)) {
    return agentDir;
  }

  // Try the monorepo plugins/profiles/<agentId> directory
  const monorepoProfileSource = findProfileInMonorepo(agentId);
  if (monorepoProfileSource) return monorepoProfileSource;

  // Try the node_modules path
  const nmProfileSource = path.resolve(
    path.join(cwd, 'node_modules', '@openbrige', 'cli', '..', '..', 'plugins', 'profiles', agentId),
  );
  if (fs.existsSync(nmProfileSource)) return nmProfileSource;

  return null;
}

function findProfileInMonorepo(agentId: string): string | null {
  // Walk up from cwd to find monorepo root (has pnpm-workspace.yaml)
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const marker = path.join(dir, 'pnpm-workspace.yaml');
    if (fs.existsSync(marker)) {
      const profileDir = path.join(dir, 'plugins', 'profiles', agentId);
      if (fs.existsSync(profileDir)) return profileDir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
