import React from 'react';
import { useTranslator } from '../i18n/LocaleContext';

export const RendererLoading: React.FC = () => {
  const t = useTranslator();
  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-text-fg-muted">
      <div className="rfp-flex rfp-flex-col rfp-items-center rfp-gap-3">
        <div className="rfp-w-8 rfp-h-8 rfp-rounded-full rfp-border-2 rfp-border-fg-muted rfp-border-t-transparent rfp-animate-spin" />
        <span className="rfp-text-sm">{t('common.loading') ?? 'Loading...'}</span>
      </div>
    </div>
  );
};
