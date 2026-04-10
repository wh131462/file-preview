import { FileQuestion, Download } from 'lucide-react';

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
  return (
    <div className="rfp-flex rfp-flex-col rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-p-8 rfp-gap-6">
      <div className="rfp-w-32 rfp-h-32 rfp-rounded-full rfp-bg-white/10 rfp-flex rfp-items-center rfp-justify-center">
        <FileQuestion className="rfp-w-16 rfp-h-16 rfp-text-white/70" />
      </div>

      <div className="rfp-text-white rfp-text-center">
        <p className="rfp-text-xl rfp-font-medium rfp-mb-2">{fileName}</p>
        <p className="rfp-text-white/70">不支持预览此文件类型 ({fileType})</p>
      </div>

      <button
        onClick={onDownload}
        className="rfp-flex rfp-items-center rfp-gap-2 rfp-px-6 rfp-py-3 rfp-bg-white/10 hover:rfp-bg-white/20 rfp-backdrop-blur-sm rfp-rounded-lg rfp-text-white rfp-font-medium rfp-transition-all"
      >
        <Download className="rfp-w-5 rfp-h-5" />
        下载文件查看
      </button>
    </div>
  );
};
