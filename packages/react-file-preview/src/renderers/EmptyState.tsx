import { FileMinus } from 'lucide-react';
import { useTranslator } from '../i18n/LocaleContext';

/**
 * 空内容提示（中性态，非错误）
 *
 * 仅在 `emptyHint` 显式开启时使用；默认保持原生空白。
 * 文案取 `t('file.empty')`，可通过 `messages` 覆盖实现自定义与多语言。
 */
export const EmptyState: React.FC = () => {
  const t = useTranslator();
  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
      <div className="rfp-text-center">
        <div className="rfp-w-12 rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-rounded-full rfp-bg-surface-2 rfp-flex rfp-items-center rfp-justify-center">
          <FileMinus className="rfp-w-6 rfp-h-6 rfp-text-fg-tertiary" />
        </div>
        <p className="rfp-text-base rfp-font-medium rfp-text-fg-primary">{t('file.empty')}</p>
      </div>
    </div>
  );
};
