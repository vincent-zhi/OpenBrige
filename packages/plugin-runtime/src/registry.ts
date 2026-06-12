import type { Plugin, NotificationProvider, NotificationMessage, AgentProfile, PluginEventPayload } from '@openbrige/shared-types';

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private profiles = new Map<string, AgentProfile>();
  private notificationProviders = new Map<string, NotificationProvider>();
  private eventHandlers: ((sessionId: string, payload: PluginEventPayload) => void)[] = [];

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.manifest.id, plugin);
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
