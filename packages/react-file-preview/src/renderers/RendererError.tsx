import { AlertCircle } from 'lucide-react';

interface RendererErrorProps {
  message: string;
  detail?: string;
  showIcon?: boolean;
}

export const RendererError: React.FC<RendererErrorProps> = ({
  message,
  detail,
  showIcon = true,
}) => {
  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
      <div className="rfp-text-center">
        {showIcon && (
          <div className="rfp-w-12 rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-rounded-full rfp-bg-red-500/10 rfp-flex rfp-items-center rfp-justify-center">
            <AlertCircle className="rfp-w-6 rfp-h-6 rfp-text-red-400" />
          </div>
        )}
        <p className="rfp-text-base rfp-font-medium rfp-text-fg-primary rfp-mb-1">
          {message}
        </p>
        {detail && (
          <p className="rfp-text-xs rfp-text-fg-tertiary">{detail}</p>
        )}
      </div>
    </div>
  );
};
