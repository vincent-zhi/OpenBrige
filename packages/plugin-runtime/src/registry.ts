import path from 'node:path';
import fs from 'node:fs';
import type { Plugin, NotificationProvider, NotificationMessage, AgentProfile, PluginEventPayload } from '@openbrige/shared-types';

interface RegisteredAction {
  id: string;
  label: string;
  text: string;
  icon?: string;
  pluginId: string;
  applicableStatuses?: string[];
}

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private profiles = new Map<string, AgentProfile>();
  private notificationProviders = new Map<string, NotificationProvider>();
  private actions = new Map<string, RegisteredAction>();
  private eventHandlers: ((sessionId: string, payload: PluginEventPayload) => void)[] = [];

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.manifest.id, plugin);

    if (plugin.manifest.type === 'action' && plugin.manifest.entry) {
      // Load action definitions from the plugin directory
      try {
        const actionPath = path.join(plugin.basePath, 'actions.json');
        if (fs.existsSync(actionPath)) {
          const content = fs.readFileSync(actionPath, 'utf-8');
          const actions = JSON.parse(content);
          if (Array.isArray(actions)) {
            for (const action of actions) {
              this.registerAction({ ...action, pluginId: plugin.manifest.id });
            }
          }
        }
      } catch {
        // Failed to load actions
      }
    }
  }

  getPlugins(): Plugin[] {
    return [...this.plugins.values()];
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  registerProfile(profile: AgentProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getProfiles(): AgentProfile[] {
    return [...this.profiles.values()];
  }

  getProfile(id: string): AgentProfile | undefined {
    return this.profiles.get(id);
  }

  registerNotificationProvider(provider: NotificationProvider): void {
    this.notificationProviders.set(provider.id, provider);
  }

  getNotificationProviders(): NotificationProvider[] {
    return [...this.notificationProviders.values()];
  }

  getNotificationProvider(id: string): NotificationProvider | undefined {
    return this.notificationProviders.get(id);
  }

  registerAction(action: RegisteredAction): void {
    this.actions.set(action.id, action);
  }

  getActions(status?: string): RegisteredAction[] {
    const all = Array.from(this.actions.values());
    if (!status) return all;
    return all.filter(a => !a.applicableStatuses || a.applicableStatuses.includes(status));
  }

  unregisterAction(id: string): void {
    this.actions.delete(id);
  }

  async sendNotification(message: NotificationMessage): Promise<void> {
    const providers = this.getNotificationProviders();
    await Promise.all(providers.map((p) => p.send(message)));
  }

  handlePluginEvent(sessionId: string, payload: PluginEventPayload): void {
    for (const handler of this.eventHandlers) {
      handler(sessionId, payload);
    }
  }

  onPluginEvent(handler: (sessionId: string, payload: PluginEventPayload) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }
}
