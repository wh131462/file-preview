import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  File as FileIcon,
  ChevronRight,
} from 'lucide-react';
import type JSZip from 'jszip';
import {
  loadZip,
  listZipEntries,
  buildZipTree,
  readZipEntryBlob,
  formatFileSize,
  getFileType,
  inferMimeType,
  type ZipTreeNode,
} from '@eternalheart/file-preview-core';
import { ResizableSplit } from '../../components/ResizableSplit';
import type { ZipToolbarStats } from './toolbar';

// 懒加载 FilePreviewContent 以打破循环依赖
const LazyFilePreviewContent = lazy(() =>
  import('../../FilePreviewContent').then(m => ({ default: m.FilePreviewContent }))
);

interface ZipRendererProps {
  url: string;
  /** ZIP 嵌套深度（由 FilePreviewContent 传入） */
  nestingDepth?: number;
  /** 解析完成后向外回报统计信息（files / dirs / size），供工具栏展示 */
  onStatsChange?: (stats: ZipToolbarStats | null) => void;
}

interface SelectedPreview {
  path: string;
  name: string;
  size: number;
  blobUrl: string;
}

/** 根据文件类型返回树节点图标 */
const resolveIcon = (name: string) => {
  const ft = getFileType({ id: '', name, url: '', type: '' });
  if (ft === 'image') return FileImage;
  if (ft === 'text' || ft === 'markdown' || ft === 'json' || ft === 'csv' || ft === 'xml' || ft === 'subtitle') {
    return name.endsWith('.md') || name.endsWith('.markdown') ? FileText : FileCode;
  }
  return FileIcon;
};

// ---------- Tooltip via portal ----------

interface HoverTipState {
  text: string;
  x: number;
  y: number;
}

// ---------- Tree item ----------

interface TreeItemProps {
  node: ZipTreeNode;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (node: ZipTreeNode) => void;
  onHover: (text: string, rect: DOMRect) => void;
  onLeave: () => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  depth,
  selectedPath,
  expanded,
  onToggle,
  onSelect,
  onHover,
  onLeave,
}) => {
  const isOpen = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const pad = { paddingLeft: `${depth * 14 + 10}px` };
  const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onHover(node.name || '/', rect);
  };

  if (node.isDir) {
    return (
      <>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          onMouseEnter={handleEnter}
          onMouseLeave={onLeave}
          className="rfp-w-full rfp-flex rfp-items-center rfp-gap-1.5 rfp-py-1.5 rfp-pr-2 rfp-text-left rfp-text-white/80 hover:rfp-bg-white/5 rfp-text-sm"
          style={pad}
        >
          <ChevronRight
            className={`rfp-w-3.5 rfp-h-3.5 rfp-flex-shrink-0 rfp-transition-transform ${
              isOpen ? 'rfp-rotate-90' : ''
            }`}
          />
          {isOpen ? (
            <FolderOpen className="rfp-w-4 rfp-h-4 rfp-flex-shrink-0 rfp-text-amber-300/80" />
          ) : (
            <Folder className="rfp-w-4 rfp-h-4 rfp-flex-shrink-0 rfp-text-amber-300/80" />
          )}
          <span className="rfp-truncate rfp-flex-1 rfp-min-w-0">{node.name || '/'}</span>
        </button>
        {isOpen &&
          node.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))}
      </>
    );
  }

  const Icon = resolveIcon(node.name);

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      onMouseEnter={handleEnter}
      onMouseLeave={onLeave}
      className={`rfp-w-full rfp-flex rfp-items-center rfp-gap-1.5 rfp-py-1.5 rfp-pr-2 rfp-text-left rfp-text-sm ${
        isSelected ? 'rfp-bg-white/10 rfp-text-white' : 'rfp-text-white/70 hover:rfp-bg-white/5'
      }`}
      style={pad}
    >
      <span className="rfp-w-3.5 rfp-h-3.5 rfp-flex-shrink-0" />
      <Icon className="rfp-w-4 rfp-h-4 rfp-flex-shrink-0 rfp-text-white/50" />
      <span className="rfp-flex-1 rfp-truncate rfp-min-w-0">{node.name}</span>
      <span className="rfp-text-xs rfp-text-white/30 rfp-flex-shrink-0 rfp-ml-2">
        {formatFileSize(node.size)}
      </span>
    </button>
  );
};

// ---------- Main Zip Renderer ----------

export const ZipRenderer: React.FC<ZipRendererProps> = ({ url, nestingDepth = 0, onStatsChange }) => {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [tree, setTree] = useState<ZipTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
  const [selected, setSelected] = useState<SelectedPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [hoverTip, setHoverTip] = useState<HoverTipState | null>(null);
  const onStatsChangeRef = useRef(onStatsChange);

  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(url);
        if (!res.ok) throw new Error('加载失败');
        const buf = await res.arrayBuffer();
        const z = await loadZip(buf);
        if (cancelled) return;
        const entries = listZipEntries(z);
        const root = buildZipTree(entries);
        setZip(z);
        setTree(root);
        const init = new Set<string>(['']);
        if (root.children) {
          for (const c of root.children) if (c.isDir) init.add(c.path);
        }
        setExpanded(init);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('ZIP 文件加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // 切换文件时回收 blob URL
  useEffect(() => {
    return () => {
      if (selected?.blobUrl) URL.revokeObjectURL(selected.blobUrl);
    };
  }, [selected]);

  const totalStats = useMemo<ZipToolbarStats | null>(() => {
    if (!tree) return null;
    let files = 0;
    let dirs = 0;
    let size = 0;
    const walk = (n: ZipTreeNode) => {
      if (n.isDir) {
        if (n.path) dirs++;
        n.children?.forEach(walk);
      } else {
        files++;
        size += n.size;
      }
    };
    walk(tree);
    return { files, dirs, size };
  }, [tree]);

  // 向外回报 stats
  useEffect(() => {
    onStatsChangeRef.current?.(totalStats);
    return () => {
      onStatsChangeRef.current?.(null);
    };
  }, [totalStats]);

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleHover = useCallback((text: string, rect: DOMRect) => {
    setHoverTip({
      text,
      x: rect.right + 8,
      y: rect.top + rect.height / 2,
    });
  }, []);

  const handleLeave = useCallback(() => {
    setHoverTip(null);
  }, []);

  const handleSelect = useCallback(
    async (node: ZipTreeNode) => {
      if (!zip || node.isDir) return;
      if (selected?.blobUrl) URL.revokeObjectURL(selected.blobUrl);
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const mime = inferMimeType(node.name);
        const blob = await readZipEntryBlob(zip, node.path, mime !== 'application/octet-stream' ? mime : undefined);
        const blobUrl = URL.createObjectURL(blob);
        setSelected({ path: node.path, name: node.name, size: node.size, blobUrl });
      } catch (err) {
        console.error(err);
        setPreviewError('条目读取失败');
      } finally {
        setPreviewLoading(false);
      }
    },
    [zip, selected]
  );

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error || 'ZIP 解析失败'}</p>
        </div>
      </div>
    );
  }

  // 左侧：文件树
  const leftPane = (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto">
      {tree.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selected?.path ?? null}
          expanded={expanded}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onHover={handleHover}
          onLeave={handleLeave}
        />
      ))}
    </div>
  );

  // 右侧：预览区
  const rightPane = (
    <div className="rfp-w-full rfp-h-full rfp-flex rfp-flex-col">
      {!selected && (
        <div className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-text-white/40 rfp-text-sm rfp-p-6">
          从左侧选择一个文件以预览
        </div>
      )}
      {selected && previewLoading && (
        <div className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center">
          <div className="rfp-w-8 rfp-h-8 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
        </div>
      )}
      {selected && !previewLoading && previewError && (
        <div className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-text-white/70">
          {previewError}
        </div>
      )}
      {selected && !previewLoading && !previewError && (
        <>
          <div className="rfp-flex-1 rfp-min-h-0 rfp-overflow-hidden rfp-flex">
            <Suspense
              fallback={
                <div className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center">
                  <div className="rfp-w-8 rfp-h-8 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
                </div>
              }
            >
              <LazyFilePreviewContent
                mode="embed"
                files={[{ name: selected.name, url: selected.blobUrl, type: inferMimeType(selected.name) }]}
                currentIndex={0}
                zipNestingDepth={nestingDepth + 1}
              />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <ResizableSplit
        left={leftPane}
        right={rightPane}
        initialLeftWidth={280}
        minLeftWidth={180}
        maxLeftWidth={560}
        storageKey="rfp-zip-split-left"
      />
      {/* 文件名 hover tooltip（portal 到 body，避免被滚动区裁剪） */}
      {hoverTip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="rfp-fixed rfp-z-[9999] rfp-pointer-events-none rfp-px-2 rfp-py-1 rfp-bg-[rgba(0,0,0,0.85)] rfp-text-white rfp-text-xs rfp-rounded rfp-whitespace-nowrap rfp-shadow-lg"
            style={{
              left: `${hoverTip.x}px`,
              top: `${hoverTip.y}px`,
              transform: 'translateY(-50%)',
            }}
          >
            {hoverTip.text}
          </div>,
          document.body
        )}
    </>
  );
};
