import React from 'react';
import { useTranslator } from '../i18n/LocaleContext';

export const RendererLoading: React.FC = () => {
  const t = useTranslator();
  return (
    <div className="rfp-renderer-loading">
      <div className="rfp-renderer-loading-content">
        <div className="rfp-renderer-spinner" />
        <span className="rfp-renderer-loading-text">{t('common.loading') ?? 'Loading...'}</span>
      </div>
    </div>
  );
};
