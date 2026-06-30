import React from 'react';
import type { ToolbarGroup } from '../renderers/toolbar.types';
import { ToolbarButton } from '../components/preview/ToolbarButton';

/**
 * 渲染工具栏组项（按钮 + 文本 + 分隔线）
 * 提取到模块顶层，避免每次组件渲染时重新创建
 */
export function renderToolbarItems(
  groups: ToolbarGroup[],
  dividerClass: string
): React.ReactNode {
  return groups.map((group, gi, arr) => (
    <React.Fragment key={gi}>
      {group.items.map((item, ii) =>
        item.type === 'button' ? (
          <ToolbarButton
            key={`${gi}-${ii}`}
            icon={item.icon}
            label={item.tooltip}
            onClick={item.action}
            disabled={item.disabled}
            active={item.active}
            ariaKeyshortcuts={item.ariaKeyshortcuts}
          />
        ) : (
          <span
            key={`${gi}-${ii}`}
            className="rfp-text-xs rfp-text-center rfp-font-medium rfp-tabular-nums rfp-text-fg-tertiary"
            style={{ minWidth: item.minWidth || 'auto' }}
          >
            {item.content}
          </span>
        )
      )}
      {gi < arr.length - 1 && <div className={`rfp-w-px rfp-h-4 rfp-bg-divide ${dividerClass}`} />}
    </React.Fragment>
  ));
}
