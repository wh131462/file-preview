import { useState, useEffect } from 'react';
import MsgReader from '@kenjiuno/msgreader';
import type { FieldsData } from '@kenjiuno/msgreader';
import { User, Users, Paperclip, Calendar, Mail, Tag, Clock, Hash } from 'lucide-react';

interface MsgRendererProps {
  url: string;
}

function formatRecipients(recipients: FieldsData[] | undefined, type: 'to' | 'cc' | 'bcc'): string {
  if (!recipients) return '';
  return recipients
    .filter((r) => r.recipType === type)
    .map((r) => {
      const name = r.name || '';
      const email = r.smtpAddress || r.email || '';
      if (name && email && name !== email) {
        return `${name} <${email}>`;
      }
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

function decodeHtmlBody(fields: FieldsData): string {
  // 优先使用 bodyHtml (string 类型)
  if (fields.bodyHtml) {
    return fields.bodyHtml;
  }
  // 其次尝试 html (Uint8Array 类型)
  if (fields.html) {
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(fields.html);
    } catch {
      // fallback
    }
  }
  // 最后使用纯文本，转换为简单 HTML
  if (fields.body) {
    return `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: system-ui, sans-serif;">${fields.body.replace(/&/g, '&amp;').replace(/\x3c/g, '&lt;').replace(/>/g, '&gt;')
      }</pre>`;
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

const labelStyle: React.CSSProperties = {
  flexShrink: 0,
  color: '#6b7280',
  fontWeight: 500,
  marginRight: '8px',
  whiteSpace: 'nowrap',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '6px 0',
};

const iconWrapStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  height: '1.4em',
};

const iconStyle: React.CSSProperties = {
  flexShrink: 0,
  color: '#9ca3af',
};

const valueStyle: React.CSSProperties = {
  color: '#111827',
  wordBreak: 'break-word' as const,
  flex: 1,
};

export const MsgRenderer: React.FC<MsgRendererProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldsData | null>(null);

  useEffect(() => {
    const loadMsg = async () => {
      setLoading(true);
      setError(null);
      setFields(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('文件加载失败');
        }

        const arrayBuffer = await response.arrayBuffer();
        const msgReader = new MsgReader(arrayBuffer);
        const fileData = msgReader.getFileData();
        setFields(fileData);
      } catch (err) {
        console.error('MSG 解析错误:', err);
        setError('Outlook 邮件解析失败');
      } finally {
        setLoading(false);
      }
    };

    loadMsg();
  }, [url]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error || !fields) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error || '邮件解析失败'}</p>
        </div>
      </div>
    );
  }

  const toStr = formatRecipients(fields.recipients, 'to');
  const ccStr = formatRecipients(fields.recipients, 'cc');
  const bccStr = formatRecipients(fields.recipients, 'bcc');
  const senderName = fields.senderName || '';
  const senderEmail = fields.senderSmtpAddress || fields.senderEmail || '';
  const sender = senderName && senderEmail && senderName !== senderEmail
    ? `${senderName} <${senderEmail}>`
    : senderName || senderEmail;
  const sentDate = formatDate(fields.clientSubmitTime);
  const receivedDate = formatDate(fields.messageDeliveryTime);
  const createdDate = formatDate(fields.creationTime);
  const lastModified = formatDate(fields.lastModificationTime);
  const subject = fields.subject || '（无主题）';
  const attachments = (fields.attachments || []).filter((a) => !a.attachmentHidden);
  const bodyHtml = decodeHtmlBody(fields);
  const messageClass = formatMessageClass(fields.messageClass);
  const messageId = fields.messageId || '';
  const fieldsAny = fields as FieldsData & Record<string, unknown>;
  const importance = typeof fieldsAny.importance === 'number' ? fieldsAny.importance : undefined;
  const importanceLabel = importance === 2 ? 'High' : importance === 0 ? 'Low' : '';
  const sensitivity = typeof fieldsAny.sensitivity === 'number' ? fieldsAny.sensitivity : undefined;
  const sensitivityLabels: Record<number, string> = {
    0: 'Normal',
    1: 'Personal',
    2: 'Private',
    3: 'Confidential',
  };
  const sensitivityLabel = sensitivity !== undefined && sensitivity !== 0 ? sensitivityLabels[sensitivity] || '' : '';

  return (
    <div
      className="rfp-w-full rfp-h-full rfp-overflow-auto"
      style={{ background: 'rgba(0, 0, 0, 0.15)' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          background: 'white',
          minHeight: '100%',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 邮件头部 */}
        <div style={{ borderBottom: '1px solid #e5e7eb', padding: 'clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px)', background: '#f9fafb' }}>
          {/* 主题 */}
          <h2 style={{ margin: '0 0 16px 0', fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            {subject}
          </h2>

          {/* 元信息 */}
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 'clamp(12px, 1.8vw, 14px)', color: '#4b5563' }}>
            {sender && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><User size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>From</span>
                  <span style={valueStyle}>{sender}</span>
                </div>
              </div>
            )}

            {toStr && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Users size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>To</span>
                  <span style={valueStyle}>{toStr}</span>
                </div>
              </div>
            )}

            {ccStr && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Users size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Cc</span>
                  <span style={valueStyle}>{ccStr}</span>
                </div>
              </div>
            )}

            {bccStr && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Users size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Bcc</span>
                  <span style={valueStyle}>{bccStr}</span>
                </div>
              </div>
            )}

            {sentDate && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Calendar size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Sent</span>
                  <span style={valueStyle}>{sentDate}</span>
                </div>
              </div>
            )}

            {receivedDate && receivedDate !== sentDate && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Clock size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Received</span>
                  <span style={valueStyle}>{receivedDate}</span>
                </div>
              </div>
            )}

            {!sentDate && !receivedDate && createdDate && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Calendar size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Date</span>
                  <span style={valueStyle}>{createdDate}</span>
                </div>
              </div>
            )}

            {importanceLabel && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Tag size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Importance</span>
                  <span style={{
                    ...valueStyle,
                    color: importance === 2 ? '#dc2626' : '#2563eb',
                    fontWeight: 500,
                  }}>
                    {importanceLabel}
                  </span>
                </div>
              </div>
            )}

            {sensitivityLabel && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Tag size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Sensitivity</span>
                  <span style={valueStyle}>{sensitivityLabel}</span>
                </div>
              </div>
            )}

            {messageClass && messageClass !== 'Email' && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Mail size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Type</span>
                  <span style={valueStyle}>{messageClass}</span>
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div style={{ ...rowStyle, borderTop: '1px solid #e5e7eb', marginTop: '4px', paddingTop: '10px' }}>
                <span style={iconWrapStyle}><Paperclip size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Attachments</span>
                  <div style={{ ...valueStyle, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {attachments.map((a, i) => {
                      const name = a.fileName || a.name || '未知文件';
                      const size = a.contentLength;
                      const sizeStr = size
                        ? size > 1048576
                          ? `${(size / 1048576).toFixed(1)} MB`
                          : size > 1024
                            ? `${(size / 1024).toFixed(0)} KB`
                            : `${size} B`
                        : '';
                      return (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '13px',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          {name}
                          {sizeStr && (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>({sizeStr})</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {messageId && (
              <div style={{ ...rowStyle, borderTop: attachments.length > 0 ? 'none' : '1px solid #e5e7eb', marginTop: '4px', paddingTop: '10px' }}>
                <span style={iconWrapStyle}><Hash size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Message-ID</span>
                  <span style={{ ...valueStyle, fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>{messageId}</span>
                </div>
              </div>
            )}

            {lastModified && lastModified !== sentDate && lastModified !== receivedDate && (
              <div style={rowStyle}>
                <span style={iconWrapStyle}><Clock size={16} style={iconStyle} /></span>
                <div style={{ display: 'flex', flex: 1 }}>
                  <span style={labelStyle}>Modified</span>
                  <span style={{ ...valueStyle, fontSize: '12px', color: '#9ca3af' }}>{lastModified}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 邮件正文 */}
        <div
          style={{
            padding: 'clamp(12px, 3vw, 24px) clamp(16px, 3vw, 28px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            color: '#333',
            overflowX: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>
  );
};
