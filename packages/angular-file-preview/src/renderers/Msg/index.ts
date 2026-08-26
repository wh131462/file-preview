import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import MsgReader from '@kenjiuno/msgreader';
import type { FieldsData } from '@kenjiuno/msgreader';
import { User, Users, Paperclip, Calendar, Mail, Tag, Clock, Hash } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

function formatRecipients(recipients: FieldsData[] | undefined, type: 'to' | 'cc' | 'bcc'): string {
  if (!recipients) return '';
  return recipients
    .filter((r) => r.recipType === type)
    .map((r) => {
      const name = r.name || '';
      const email = r.smtpAddress || r.email || '';
      if (name && email && name !== email) return `${name} <${email}>`;
      return name || email;
    })
    .filter(Boolean)
    .join('; ');
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString();
  } catch {
    return dateStr;
  }
}

function decodeHtmlBody(f: FieldsData, emptyBodyText: string): string {
  if (f.bodyHtml) return f.bodyHtml;
  if (f.html) {
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(f.html);
    } catch {
      // fallback
    }
  }
  if (f.body) {
    return `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: system-ui, sans-serif;">${f.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`;
  }
  return `<p style="color: var(--fp-fg-muted);">${emptyBodyText}</p>`;
}

function formatMessageClass(messageClass: string | undefined): string {
  if (!messageClass) return '';
  const classMap: Record<string, string> = {
    'IPM.Note': 'Email',
    'IPM.Note.SMIME': 'Encrypted Email',
    'IPM.Note.SMIME.MultipartSigned': 'Signed Email',
    'IPM.Appointment': 'Appointment',
    'IPM.Schedule.Meeting.Request': 'Meeting Request',
    'IPM.Schedule.Meeting.Canceled': 'Meeting Cancellation',
    'IPM.Contact': 'Contact',
    'IPM.Task': 'Task',
    'IPM.StickyNote': 'Sticky Note',
  };
  return classMap[messageClass] || messageClass;
}

@Component({
  selector: 'afp-msg-renderer',
  standalone: true,
  imports: [RendererError, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div
          class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
        ></div>
      </div>
    } @else if (error() || !fields()) {
      <afp-renderer-error [message]="error() || t('msg.parse_failed_short')" />
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto msg-root">
        <div class="msg-container">
          <div class="msg-header">
            <h2 class="msg-subject">{{ subject() }}</h2>

            <div class="msg-meta">
              @if (sender()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="userIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">From</span><span class="msg-value">{{ sender() }}</span></div>
                </div>
              }

              @if (toStr()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="usersIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">To</span><span class="msg-value">{{ toStr() }}</span></div>
                </div>
              }

              @if (ccStr()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="usersIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Cc</span><span class="msg-value">{{ ccStr() }}</span></div>
                </div>
              }

              @if (bccStr()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="usersIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Bcc</span><span class="msg-value">{{ bccStr() }}</span></div>
                </div>
              }

              @if (sentDate()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="calendarIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Sent</span><span class="msg-value">{{ sentDate() }}</span></div>
                </div>
              }

              @if (receivedDate() && receivedDate() !== sentDate()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="clockIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Received</span><span class="msg-value">{{ receivedDate() }}</span></div>
                </div>
              }

              @if (!sentDate() && !receivedDate() && createdDate()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="calendarIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Date</span><span class="msg-value">{{ createdDate() }}</span></div>
                </div>
              }

              @if (importanceLabel()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="tagIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content">
                    <span class="msg-label">Importance</span>
                    <span class="msg-value" [class.msg-importance-high]="importance() === 2" [class.msg-importance-low]="importance() !== 2">
                      {{ importanceLabel() }}
                    </span>
                  </div>
                </div>
              }

              @if (sensitivityLabel()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="tagIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Sensitivity</span><span class="msg-value">{{ sensitivityLabel() }}</span></div>
                </div>
              }

              @if (messageClass() && messageClass() !== 'Email') {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="mailIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content"><span class="msg-label">Type</span><span class="msg-value">{{ messageClass() }}</span></div>
                </div>
              }

              @if (attachments().length > 0) {
                <div class="msg-row msg-row-bordered">
                  <span class="msg-icon-wrap"><i-lucide [img]="paperclipIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content">
                    <span class="msg-label">Attachments</span>
                    <div class="msg-value msg-attachments">
                      @for (a of attachments(); track $index) {
                        <span class="msg-attachment">
                          {{ a.fileName || a.name || unknownFileLabel }}
                          @if (formatAttachmentSize(a.contentLength); as size) {
                            <span class="msg-attachment-size">({{ size }})</span>
                          }
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (messageId()) {
                <div class="msg-row" [class.msg-row-bordered]="attachments().length === 0">
                  <span class="msg-icon-wrap"><i-lucide [img]="hashIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content">
                    <span class="msg-label">Message-ID</span>
                    <span class="msg-value msg-id">{{ messageId() }}</span>
                  </div>
                </div>
              }

              @if (lastModified() && lastModified() !== sentDate() && lastModified() !== receivedDate()) {
                <div class="msg-row">
                  <span class="msg-icon-wrap"><i-lucide [img]="clockIcon" [size]="16" class="msg-icon" /></span>
                  <div class="msg-row-content">
                    <span class="msg-label">Modified</span>
                    <span class="msg-value msg-id">{{ lastModified() }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="msg-body" [innerHTML]="trust(bodyHtml())"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .msg-root { background: var(--fp-code-bg); }
    .msg-container {
      width: 100%;
      background: var(--fp-code-bg);
      min-height: 100%;
    }
    .msg-header {
      border-bottom: 1px solid var(--fp-line);
      padding: clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px);
      background: var(--fp-surface-1);
    }
    .msg-subject {
      margin: 0 0 16px 0;
      font-size: clamp(16px, 2.5vw, 20px);
      font-weight: 600;
      color: var(--fp-fg-primary);
      line-height: 1.4;
    }
    .msg-meta {
      display: flex;
      flex-direction: column;
      font-size: clamp(12px, 1.8vw, 14px);
      color: var(--fp-fg-secondary);
    }
    .msg-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 0;
    }
    .msg-row-bordered {
      border-top: 1px solid var(--fp-line);
      margin-top: 4px;
      padding-top: 10px;
    }
    .msg-icon-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      height: 1.4em;
    }
    .msg-icon {
      flex-shrink: 0;
      color: var(--fp-fg-muted);
    }
    .msg-row-content {
      display: flex;
      flex: 1;
    }
    .msg-label {
      flex-shrink: 0;
      color: var(--fp-fg-tertiary);
      font-weight: 500;
      margin-right: 8px;
      white-space: nowrap;
    }
    .msg-value {
      color: var(--fp-fg-primary);
      word-break: break-word;
      flex: 1;
    }
    .msg-id {
      font-size: 12px;
      color: var(--fp-fg-muted);
      font-family: monospace;
    }
    .msg-attachments {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .msg-attachment {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--fp-surface-2);
      border-radius: 4px;
      font-size: 13px;
      color: var(--fp-fg-secondary);
      border: 1px solid var(--fp-line);
    }
    .msg-attachment-size {
      color: var(--fp-fg-muted);
      font-size: 12px;
    }
    .msg-body {
      padding: clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px);
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: var(--fp-fg-primary);
      overflow-x: auto;
    }
    .msg-importance-high { color: #dc2626; font-weight: 500; }
    .msg-importance-low { color: #2563eb; font-weight: 500; }
  `],
})
export class MsgRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  protected readonly userIcon = User;
  protected readonly usersIcon = Users;
  protected readonly paperclipIcon = Paperclip;
  protected readonly calendarIcon = Calendar;
  protected readonly mailIcon = Mail;
  protected readonly tagIcon = Tag;
  protected readonly clockIcon = Clock;
  protected readonly hashIcon = Hash;
  protected readonly unknownFileLabel = '未知文件';

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly fields = signal<FieldsData | null>(null);

  readonly subject = computed(() => this.fields()?.subject || '（无主题）');
  readonly sender = computed(() => {
    const f = this.fields();
    if (!f) return '';
    const senderName = f.senderName || '';
    const senderEmail = f.senderSmtpAddress || f.senderEmail || '';
    if (senderName && senderEmail && senderName !== senderEmail) {
      return `${senderName} <${senderEmail}>`;
    }
    return senderName || senderEmail;
  });
  readonly toStr = computed(() => formatRecipients(this.fields()?.recipients, 'to'));
  readonly ccStr = computed(() => formatRecipients(this.fields()?.recipients, 'cc'));
  readonly bccStr = computed(() => formatRecipients(this.fields()?.recipients, 'bcc'));
  readonly sentDate = computed(() => formatDate(this.fields()?.clientSubmitTime));
  readonly receivedDate = computed(() => formatDate(this.fields()?.messageDeliveryTime));
  readonly createdDate = computed(() => formatDate(this.fields()?.creationTime));
  readonly lastModified = computed(() => formatDate(this.fields()?.lastModificationTime));
  readonly attachments = computed(() => (this.fields()?.attachments || []).filter((a) => !a.attachmentHidden));
  readonly bodyHtml = computed(() => {
    const f = this.fields();
    return f ? decodeHtmlBody(f, this.t('msg.empty_body')) : '';
  });
  readonly messageClass = computed(() => formatMessageClass(this.fields()?.messageClass));
  readonly messageId = computed(() => this.fields()?.messageId || '');

  readonly importance = computed(() => {
    const f = this.fields() as (FieldsData & Record<string, unknown>) | null;
    return f && typeof f.importance === 'number' ? f.importance : undefined;
  });
  readonly importanceLabel = computed(() => {
    if (this.importance() === 2) return 'High';
    if (this.importance() === 0) return 'Low';
    return '';
  });

  readonly sensitivity = computed(() => {
    const f = this.fields() as (FieldsData & Record<string, unknown>) | null;
    return f && typeof f.sensitivity === 'number' ? f.sensitivity : undefined;
  });
  readonly sensitivityLabel = computed(() => {
    if (this.sensitivity() === undefined || this.sensitivity() === 0) return '';
    const labels: Record<number, string> = {
      1: 'Personal',
      2: 'Private',
      3: 'Confidential',
    };
    return labels[this.sensitivity()!] || '';
  });

  constructor() {
    effect(() => {
      const newUrl = this.url();
      if (newUrl) {
        untracked(() => {
          void this.loadMsg();
        });
      }
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected formatAttachmentSize(size: number | undefined): string {
    if (!size) return '';
    if (size > 1048576) return `${(size / 1048576).toFixed(1)} MB`;
    if (size > 1024) return `${(size / 1024).toFixed(0)} KB`;
    return `${size} B`;
  }

  private async loadMsg(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.fields.set(null);

    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url());
      if (!response.ok) throw new Error('文件加载失败');
      const arrayBuffer = await response.arrayBuffer();
      const msgReader = new MsgReader(arrayBuffer);
      this.fields.set(msgReader.getFileData());
    } catch (err) {
      console.error('MSG 解析错误:', err);
      this.error.set(this.t('msg.parse_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
