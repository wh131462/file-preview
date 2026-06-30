import React from 'react';

export interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** 激活状态：true 时按钮显示高亮样式 */
  active?: boolean;
  ariaKeyshortcuts?: string;
}

/**
 * 工具栏按钮组件
 * 支持 tooltip、disabled 状态、active 高亮和 aria 属性
 */
export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  active,
  ariaKeyshortcuts,
}) => {
  let stateClass: string;
  if (disabled) {
    stateClass = 'rfp-text-fg-disabled rfp-cursor-not-allowed';
  } else if (active) {
    stateClass = 'rfp-text-fg-primary rfp-bg-surface-3 hover:rfp-bg-surface-3 active:rfp-bg-surface-3';
  } else {
    stateClass = 'rfp-text-fg-primary hover:rfp-bg-surface-2 active:rfp-bg-surface-3';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={ariaKeyshortcuts}
      aria-disabled={disabled}
      className={`rfp-relative rfp-group rfp-p-2 md:rfp-p-1.5 rfp-rounded-md rfp-transition-all rfp-select-none ${stateClass}`}
    >
      {icon}
      <span className="rfp-absolute rfp-left-1/2 -rfp-translate-x-1/2 rfp-top-full rfp-mt-1.5 rfp-px-2 rfp-py-1 rfp-text-xs rfp-rounded rfp-whitespace-nowrap rfp-pointer-events-none rfp-opacity-0 rfp-invisible group-hover:rfp-opacity-100 group-hover:rfp-visible rfp-transition-opacity rfp-duration-200 rfp-z-50 rfp-bg-fg-primary rfp-text-fg-inverse max-[1023px]:!rfp-hidden">
        <span className="rfp-absolute rfp-left-1/2 -rfp-translate-x-1/2 -rfp-top-1 rfp-w-2 rfp-h-2 rfp-rotate-45 rfp-bg-fg-primary" />
        <span className="rfp-relative">{label}</span>
      </span>
    </button>
  );
};
