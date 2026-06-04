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
          <div className="rfp-w-16 rfp-h-16 rfp-mx-auto rfp-mb-4 rfp-rounded-full rfp-bg-red-500/10 rfp-flex rfp-items-center rfp-justify-center">
            <AlertCircle className="rfp-w-8 rfp-h-8 rfp-text-red-400" />
          </div>
        )}
        <p className="rfp-text-lg md:rfp-text-xl rfp-font-medium rfp-text-fg-primary rfp-mb-2">
          {message}
        </p>
        {detail && (
          <p className="rfp-text-sm rfp-text-fg-tertiary">{detail}</p>
        )}
      </div>
    </div>
  );
};
