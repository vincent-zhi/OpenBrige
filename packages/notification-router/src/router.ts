import type { NotificationProvider, NotificationMessage } from '@openbrige/shared-types';

export class NotificationRouter {
  private providers = new Map<string, NotificationProvider>();
  private enabled = new Map<string, boolean>();

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.id, provider);
    this.enabled.set(provider.id, true);
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.enabled.delete(id);
  }

  enableProvider(id: string): void {
    this.enabled.set(id, true);
  }

  disableProvider(id: string): void {
    this.enabled.set(id, false);
  }

  getProviders(): Array<NotificationProvider & { enabled: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      ...p,
      enabled: this.enabled.get(p.id) ?? false,
    }));
  }

  async send(message: NotificationMessage): Promise<void> {
    const sendPromises: Promise<void>[] = [];

    for (const [id, provider] of this.providers) {
      if (this.enabled.get(id) === true) {
        sendPromises.push(
          provider.send(message).catch((err) => {
            console.error(`Notification provider "${id}" failed:`, err);
          }),
        );
      }
    }

    await Promise.all(sendPromises);
  }

  /**
   * Send notification only if severity meets the threshold.
   * Order: info < success < warning < error
   */
  async sendIfSeverity(
    message: NotificationMessage,
    minSeverity: 'info' | 'success' | 'warning' | 'error' = 'info',
  ): Promise<void> {
    const levels: Record<string, number> = { info: 0, success: 1, warning: 2, error: 3 };
    if ((levels[message.severity] ?? 0) >= (levels[minSeverity] ?? 0)) {
      await this.send(message);
    }
  }
}

// ── Built-in providers ──────────────────────────────────────

/** PWA foreground notification using the Notification API */
export class PwaNotificationProvider implements NotificationProvider {
  readonly id = 'pwa-foreground';
  readonly name = 'PWA Foreground';

  async send(message: NotificationMessage): Promise<void> {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    new Notification(message.title, {
      body: message.body,
      tag: message.sessionId ?? 'openbrige',
    });
  }
}

/** Webhook notification provider */
export class WebhookNotificationProvider implements NotificationProvider {
  readonly id = 'webhook';
  readonly name = 'Webhook';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: message.title,
        body: message.body,
        severity: message.severity,
        sessionId: message.sessionId,
        url: message.url,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

/** ntfy.sh notification provider */
export class NtfyNotificationProvider implements NotificationProvider {
  readonly id = 'ntfy';
  readonly name = 'ntfy';
  private topic: string;
  private serverUrl: string;

  constructor(topic: string, serverUrl = 'https://ntfy.sh') {
    this.topic = topic;
    this.serverUrl = serverUrl;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(`${this.serverUrl}/${this.topic}`, {
      method: 'POST',
      headers: {
        'Title': message.title,
        'Priority': message.severity === 'error' ? 'urgent' : message.severity === 'warning' ? 'high' : 'default',
        'Tags': message.severity,
      },
      body: message.body,
    });
  }
}

/** Gotify notification provider */
export class GotifyNotificationProvider implements NotificationProvider {
  readonly id = 'gotify';
  readonly name = 'Gotify';
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(`${this.url}/message?token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: message.title,
        message: message.body,
        priority: message.severity === 'error' ? 10 : message.severity === 'warning' ? 5 : 1,
      }),
    });
  }
}

/** Bark notification provider (iOS push) */
export class BarkNotificationProvider implements NotificationProvider {
  readonly id = 'bark';
  readonly name = 'Bark';
  private serverUrl: string;
  private deviceKey: string;

  constructor(serverUrl: string, deviceKey: string) {
    this.serverUrl = serverUrl;
    this.deviceKey = deviceKey;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(`${this.serverUrl}/${this.deviceKey}/${encodeURIComponent(message.title)}/${encodeURIComponent(message.body)}`, {
      method: 'GET',
    });
  }
}

/** Telegram Bot notification provider */
export class TelegramNotificationProvider implements NotificationProvider {
  readonly id = 'telegram';
  readonly name = 'Telegram';
  private botToken: string;
  private chatId: string;

  constructor(botToken: string, chatId: string) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: `*${message.title}*\n${message.body}`,
        parse_mode: 'Markdown',
      }),
    });
  }
}

/** Slack notification provider */
export class SlackNotificationProvider implements NotificationProvider {
  readonly id = 'slack';
  readonly name = 'Slack';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${message.severity === 'error' ? '🚨' : message.severity === 'warning' ? '⚠️' : 'ℹ️'} ${message.title}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*${message.title}*\n${message.body}` } },
        ],
      }),
    });
  }
}

/** Discord notification provider */
export class DiscordNotificationProvider implements NotificationProvider {
  readonly id = 'discord';
  readonly name = 'Discord';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(message: NotificationMessage): Promise<void> {
    const colorMap: Record<string, number> = { info: 3447003, success: 5763719, warning: 16776960, error: 15548997 };
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: message.title,
          description: message.body,
          color: colorMap[message.severity] ?? 3447003,
        }],
      }),
    });
  }
}

/** Email notification provider (SMTP via HTTP relay) */
export class EmailNotificationProvider implements NotificationProvider {
  readonly id = 'email';
  readonly name = 'Email';
  private relayUrl: string;
  private to: string;

  constructor(relayUrl: string, to: string) {
    this.relayUrl = relayUrl;
    this.to = to;
  }

  async send(message: NotificationMessage): Promise<void> {
    await fetch(this.relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: this.to,
        subject: `[OpenBrige] ${message.title}`,
        body: message.body,
        severity: message.severity,
      }),
    });
  }
}
