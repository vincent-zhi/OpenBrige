import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import type { PluginManifest, Plugin, AgentProfile } from '@openbrige/shared-types';

export class PluginLoader {
  async loadPlugins(dirs: string[]): Promise<Plugin[]> {
    const plugins: Plugin[] = [];
    for (const dir of dirs) {
      const entries = await this.scanForManifests(dir);
      for (const manifestPath of entries) {
        try {
          const raw = await readFile(manifestPath, 'utf-8');
          const json = JSON.parse(raw);
          const manifest = this.parseManifest(json);
          plugins.push({
            manifest,
            basePath: join(manifestPath, '..'),
            enabled: true,
          });
        } catch {
          // skip invalid manifests
        }
      }
    }
    return plugins;
  }

  async loadProfiles(dirs: string[]): Promise<AgentProfile[]> {
    const profiles: AgentProfile[] = [];
    for (const dir of dirs) {
      const files = await this.scanForProfiles(dir);
      for (const filePath of files) {
        try {
          const raw = await readFile(filePath, 'utf-8');
          const ext = extname(filePath).toLowerCase();
          const data = ext === '.yaml' || ext === '.yml'
            ? await this.parseYaml(raw)
            : JSON.parse(raw);
          if (Array.isArray(data)) {
            profiles.push(...data.filter((p): p is AgentProfile => this.isProfile(p)));
          } else if (data && Array.isArray(data.profiles)) {
            profiles.push(...data.profiles.filter((p: unknown): p is AgentProfile => this.isProfile(p)));
          } else if (this.isProfile(data)) {
            profiles.push(data);
          }
        } catch {
          // skip invalid profiles
        }
      }
    }
    return profiles;
  }

  parseManifest(json: unknown): PluginManifest {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid manifest: not an object');
    }
    const obj = json as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !obj.id) {
      throw new Error('Invalid manifest: missing or invalid "id"');
    }
    if (typeof obj.name !== 'string' || !obj.name) {
      throw new Error('Invalid manifest: missing or invalid "name"');
    }
    if (typeof obj.version !== 'string' || !obj.version) {
      throw new Error('Invalid manifest: missing or invalid "version"');
    }
    const validTypes = ['profile', 'ui-panel', 'action', 'notification', 'connection'];
    if (!validTypes.includes(obj.type as string)) {
      throw new Error(`Invalid manifest: "type" must be one of ${validTypes.join(', ')}`);
    }
    return {
      id: obj.id as string,
      name: obj.name as string,
      version: obj.version as string,
      type: obj.type as PluginManifest['type'],
      entry: typeof obj.entry === 'string' ? obj.entry : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      permissions: Array.isArray(obj.permissions) ? obj.permissions as string[] : undefined,
      placement: Array.isArray(obj.placement) ? obj.placement as string[] : undefined,
    };
  }

  private async scanForManifests(dir: string): Promise<string[]> {
    const results: string[] = [];
    let entries: string[];
    try {
      entries = (await readdir(dir)).map((e) => join(dir, e));
    } catch {
      return results;
    }
    for (const entry of entries) {
      try {
        const s = await stat(entry);
        if (s.isDirectory()) {
          const manifestPath = join(entry, 'plugin.json');
          try {
            await stat(manifestPath);
            results.push(manifestPath);
          } catch {
            // no plugin.json in this subdir
          }
        }
      } catch {
        // skip
      }
    }
    return results;
  }

  private async scanForProfiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    await this.scanDirRecursive(dir, results);
    return results;
  }

  private async scanDirRecursive(dir: string, results: string[]): Promise<void> {
    let entries: string[];
    try {
      entries = (await readdir(dir)).map((e) => join(dir, e));
    } catch {
      return;
    }
    for (const entry of entries) {
      const ext = extname(entry).toLowerCase();
      if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
        results.push(entry);
      } else {
        try {
          const s = await stat(entry);
          if (s.isDirectory()) {
            await this.scanDirRecursive(entry, results);
          }
        } catch {
          // skip
        }
      }
    }
  }

  private async parseYaml(raw: string): Promise<unknown> {
    try {
      const yaml = await import('yaml');
      return yaml.parse(raw);
    } catch {
      throw new Error('YAML parsing requires the "yaml" package');
    }
  }

  private isProfile(data: unknown): data is AgentProfile {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.command === 'string' &&
      Array.isArray(obj.args) &&
      typeof obj.cwd === 'string' &&
      typeof obj.icon === 'string'
    );
  }
}
