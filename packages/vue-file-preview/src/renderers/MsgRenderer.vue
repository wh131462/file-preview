<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import MsgReader from '@kenjiuno/msgreader';
import type { FieldsData } from '@kenjiuno/msgreader';
import { User, Users, Paperclip, Calendar, Mail, Tag, Clock, Hash } from 'lucide-vue-next';

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const error = ref<string | null>(null);
const fields = ref<FieldsData | null>(null);

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

function decodeHtmlBody(f: FieldsData): string {
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
      .replace(/\x3c/g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`;
  }
  return '<p style="color: #999;">（无邮件正文）</p>';
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

const loadMsg = async () => {
  loading.value = true;
  error.value = null;
  fields.value = null;

  try {
    const response = await fetch(props.url);
    if (!response.ok) throw new Error('文件加载失败');
    const arrayBuffer = await response.arrayBuffer();
    const msgReader = new MsgReader(arrayBuffer);
    fields.value = msgReader.getFileData();
  } catch (err) {
    console.error('MSG 解析错误:', err);
    error.value = 'Outlook 邮件解析失败';
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, loadMsg, { immediate: true });

const subject = computed(() => fields.value?.subject || '（无主题）');
const sender = computed(() => {
  if (!fields.value) return '';
  const senderName = fields.value.senderName || '';
  const senderEmail = fields.value.senderSmtpAddress || fields.value.senderEmail || '';
  if (senderName && senderEmail && senderName !== senderEmail) {
    return `${senderName} <${senderEmail}>`;
  }
  return senderName || senderEmail;
});
const toStr = computed(() => formatRecipients(fields.value?.recipients, 'to'));
const ccStr = computed(() => formatRecipients(fields.value?.recipients, 'cc'));
const bccStr = computed(() => formatRecipients(fields.value?.recipients, 'bcc'));
const sentDate = computed(() => formatDate(fields.value?.clientSubmitTime));
const receivedDate = computed(() => formatDate(fields.value?.messageDeliveryTime));
const createdDate = computed(() => formatDate(fields.value?.creationTime));
const lastModified = computed(() => formatDate(fields.value?.lastModificationTime));
const attachments = computed(() => (fields.value?.attachments || []).filter((a) => !a.attachmentHidden));
const bodyHtml = computed(() => (fields.value ? decodeHtmlBody(fields.value) : ''));
const messageClass = computed(() => formatMessageClass(fields.value?.messageClass));
const messageId = computed(() => fields.value?.messageId || '');

const importance = computed(() => {
  const f = fields.value as (FieldsData & Record<string, unknown>) | null;
  return f && typeof f.importance === 'number' ? f.importance : undefined;
});
const importanceLabel = computed(() => {
  if (importance.value === 2) return 'High';
  if (importance.value === 0) return 'Low';
  return '';
});

const sensitivity = computed(() => {
  const f = fields.value as (FieldsData & Record<string, unknown>) | null;
  return f && typeof f.sensitivity === 'number' ? f.sensitivity : undefined;
});
const sensitivityLabel = computed(() => {
  if (sensitivity.value === undefined || sensitivity.value === 0) return '';
  const labels: Record<number, string> = {
    1: 'Personal',
    2: 'Private',
    3: 'Confidential',
  };
  return labels[sensitivity.value] || '';
});

const formatAttachmentSize = (size: number | undefined) => {
  if (!size) return '';
  if (size > 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${size} B`;
};
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <div v-else-if="error || !fields" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error || '邮件解析失败' }}</p>
    </div>
  </div>

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: rgba(0, 0, 0, 0.15)">
    <div class="msg-container">
      <!-- 邮件头部 -->
      <div class="msg-header">
        <h2 class="msg-subject">{{ subject }}</h2>

        <div class="msg-meta">
          <div v-if="sender" class="msg-row">
            <span class="msg-icon-wrap"><User :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">From</span><span class="msg-value">{{ sender }}</span></div>
          </div>

          <div v-if="toStr" class="msg-row">
            <span class="msg-icon-wrap"><Users :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">To</span><span class="msg-value">{{ toStr }}</span></div>
          </div>

          <div v-if="ccStr" class="msg-row">
            <span class="msg-icon-wrap"><Users :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Cc</span><span class="msg-value">{{ ccStr }}</span></div>
          </div>

          <div v-if="bccStr" class="msg-row">
            <span class="msg-icon-wrap"><Users :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Bcc</span><span class="msg-value">{{ bccStr }}</span></div>
          </div>

          <div v-if="sentDate" class="msg-row">
            <span class="msg-icon-wrap"><Calendar :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Sent</span><span class="msg-value">{{ sentDate }}</span></div>
          </div>

          <div v-if="receivedDate && receivedDate !== sentDate" class="msg-row">
            <span class="msg-icon-wrap"><Clock :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Received</span><span class="msg-value">{{ receivedDate }}</span></div>
          </div>

          <div v-if="!sentDate && !receivedDate && createdDate" class="msg-row">
            <span class="msg-icon-wrap"><Calendar :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Date</span><span class="msg-value">{{ createdDate }}</span></div>
          </div>

          <div v-if="importanceLabel" class="msg-row">
            <span class="msg-icon-wrap"><Tag :size="16" class="msg-icon" /></span>
            <div class="msg-row-content">
              <span class="msg-label">Importance</span>
              <span class="msg-value" :style="{ color: importance === 2 ? '#dc2626' : '#2563eb', fontWeight: 500 }">
                {{ importanceLabel }}
              </span>
            </div>
          </div>

          <div v-if="sensitivityLabel" class="msg-row">
            <span class="msg-icon-wrap"><Tag :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Sensitivity</span><span class="msg-value">{{ sensitivityLabel }}</span></div>
          </div>

          <div v-if="messageClass && messageClass !== 'Email'" class="msg-row">
            <span class="msg-icon-wrap"><Mail :size="16" class="msg-icon" /></span>
            <div class="msg-row-content"><span class="msg-label">Type</span><span class="msg-value">{{ messageClass }}</span></div>
          </div>

          <div v-if="attachments.length > 0" class="msg-row msg-row-bordered">
            <span class="msg-icon-wrap"><Paperclip :size="16" class="msg-icon" /></span>
            <div class="msg-row-content">
              <span class="msg-label">Attachments</span>
              <div class="msg-value msg-attachments">
                <span v-for="(a, i) in attachments" :key="i" class="msg-attachment">
                  {{ a.fileName || a.name || '未知文件' }}
                  <span v-if="formatAttachmentSize(a.contentLength)" class="msg-attachment-size">
                    ({{ formatAttachmentSize(a.contentLength) }})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div v-if="messageId" class="msg-row" :class="{ 'msg-row-bordered': attachments.length === 0 }">
            <span class="msg-icon-wrap"><Hash :size="16" class="msg-icon" /></span>
            <div class="msg-row-content">
              <span class="msg-label">Message-ID</span>
              <span class="msg-value msg-id">{{ messageId }}</span>
            </div>
          </div>

          <div v-if="lastModified && lastModified !== sentDate && lastModified !== receivedDate" class="msg-row">
            <span class="msg-icon-wrap"><Clock :size="16" class="msg-icon" /></span>
            <div class="msg-row-content">
              <span class="msg-label">Modified</span>
              <span class="msg-value msg-id">{{ lastModified }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 邮件正文 -->
      <div class="msg-body" v-html="bodyHtml" />
    </div>
  </div>
</template>

<style scoped>
.msg-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  background: white;
  min-height: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
.msg-header {
  border-bottom: 1px solid #e5e7eb;
  padding: clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px);
  background: #f9fafb;
}
.msg-subject {
  margin: 0 0 16px 0;
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}
.msg-meta {
  display: flex;
  flex-direction: column;
  font-size: clamp(12px, 1.8vw, 14px);
  color: #4b5563;
}
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}
.msg-row-bordered {
  border-top: 1px solid #e5e7eb;
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
  color: #9ca3af;
}
.msg-row-content {
  display: flex;
  flex: 1;
}
.msg-label {
  flex-shrink: 0;
  color: #6b7280;
  font-weight: 500;
  margin-right: 8px;
  white-space: nowrap;
}
.msg-value {
  color: #111827;
  word-break: break-word;
  flex: 1;
}
.msg-id {
  font-size: 12px;
  color: #9ca3af;
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
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  border: 1px solid #e5e7eb;
}
.msg-attachment-size {
  color: #9ca3af;
  font-size: 12px;
}
.msg-body {
  padding: clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px);
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
  overflow-x: auto;
}
</style>
