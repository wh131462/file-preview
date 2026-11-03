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
    <div className="rfp-renderer-error">
      <div className="rfp-renderer-error-content">
        {showIcon && (
          <div className="rfp-w-12 rfp-h-12 rfp-rounded-full rfp-bg-red-500/10 rfp-flex rfp-items-center rfp-justify-center">
            <AlertCircle className="rfp-w-6 rfp-h-6 rfp-text-red-400" />
          </div>
        )}
        <div>
          <p className="rfp-renderer-error-text">
            {message}
          </p>
          {detail && (
            <p className="rfp-renderer-error-detail">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
};
