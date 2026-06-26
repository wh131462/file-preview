import { FileQuestion, Download } from 'lucide-react';
import { useTranslator } from '../../i18n/LocaleContext';

interface UnsupportedRendererProps {
  fileName: string;
  fileType: string;
  onDownload: () => void;
}

export const UnsupportedRenderer: React.FC<UnsupportedRendererProps> = ({
  fileName,
  fileType,
  onDownload,
}) => {
  const t = useTranslator();
  return (
    <div className="rfp-flex rfp-flex-col rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-p-6 rfp-gap-4">
      <div className="rfp-w-20 rfp-h-20 rfp-rounded-full rfp-bg-surface-2 rfp-flex rfp-items-center rfp-justify-center">
        <FileQuestion className="rfp-w-10 rfp-h-10 rfp-text-fg-secondary" />
      </div>

      <div className="rfp-text-fg-primary rfp-text-center">
        <p className="rfp-text-lg rfp-font-medium rfp-mb-2">{fileName}</p>
        <p className="rfp-text-fg-secondary">{t('common.unsupported_preview', { type: fileType })}</p>
      </div>

      <button
        onClick={onDownload}
        className="rfp-flex rfp-items-center rfp-gap-2 rfp-px-4 rfp-py-2 rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-backdrop-blur-sm rfp-rounded-lg rfp-text-fg-primary rfp-font-medium rfp-transition-all"
      >
        <Download className="rfp-w-5 rfp-h-5" />
        {t('common.download')}
      </button>
    </div>
  );
};
