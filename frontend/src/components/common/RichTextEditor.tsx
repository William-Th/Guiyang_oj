import React, { useEffect, useRef } from 'react';
import { createEditor, createToolbar } from '@wangeditor/editor';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';
import { questionImageUploadApi } from '../../services/api';
import { looksLikeHtml } from '@/utils/richText';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  /** 测试定位用（E2E 通过 [data-testid="..."] 找到编辑区） */
  testId?: string;
}

const TOOLBAR_KEYS: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    'bold', 'italic', 'underline', 'through', 'sup', 'sub', 'clearStyle',
    '|', 'color', 'bgColor',
    '|', 'fontSize', 'lineHeight',
    '|', 'bulletedList', 'numberedList',
    '|', 'justifyLeft', 'justifyCenter', 'justifyRight',
    '|', 'insertLink', 'insertImage', 'uploadImage',
    '|', 'insertTable', 'blockquote', 'codeBlock',
    '|', 'undo', 'redo', 'fullScreen',
  ],
};

/**
 * 富文本编辑器（wangEditor v5 命令式封装）
 *
 * - 不使用 @wangeditor/editor-for-react：其 React 包装层在 React 18 下会出现
 *   实例/DOM 绑定错乱（输入只改 DOM 不进模型，onChange 永不触发，表单值恒为空）。
 *   这里直接用官方 createEditor/createToolbar，生命周期完全自控。
 * - 配图上传复用 POST /api/upload/question-image（教师/管理员权限）
 * - 与 antd Form 受控集成：Form.Item 注入 value/onChange
 *   - onChange 带回显抑制（lastEmittedRef），避免「输入 → 表单 → value → setHtml」回环
 *   - 外部 value 变化（编辑回填 / resetFields）时经 setHtml 同步进编辑器
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容…',
  height = 300,
  disabled = false,
  testId,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editorBoxRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<IDomEditor | null>(null);
  // 最近一次由编辑器自身 onChange 吐出的 html，用于区分「外部回填」与「自身回显」
  const lastEmittedRef = useRef<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 创建 / 销毁：仅在挂载、卸载时执行一次
  useEffect(() => {
    if (!editorBoxRef.current || !toolbarRef.current) return;

    const editorConfig: Partial<IEditorConfig> = {
      placeholder,
      MENU_CONF: {
        uploadImage: {
          // 与后端 /api/upload/question-image 的 2MB 限制保持一致
          maxFileSize: 2 * 1024 * 1024,
          allowedFileTypes: ['image/*'],
          async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
            const formData = new FormData();
            formData.append('image', file);
            const response = await questionImageUploadApi(formData);
            const url = (response as any)?.data?.url;
            if (!url) {
              throw new Error((response as any)?.message || '图片上传失败');
            }
            insertFn(url, file.name, url);
          },
        },
      },
      onChange: (editorInstance: IDomEditor) => {
        const html = editorInstance.getHtml();
        lastEmittedRef.current = html;
        onChangeRef.current?.(html);
      },
    };

    const editor = createEditor({
      selector: editorBoxRef.current,
      config: editorConfig,
      mode: 'default',
    });
    editorRef.current = editor;

    createToolbar({
      editor,
      selector: toolbarRef.current,
      config: TOOLBAR_KEYS,
      mode: 'default',
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 value 回填（编辑模式异步加载 / Form.resetFields）：
  // 仅当 value 与编辑器最近吐出的 html 不同（真·外部变化）时才 setHtml，避免回环
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const incoming = value ?? '';
    if (incoming === (lastEmittedRef.current ?? '')) return;
    const html = incoming && !looksLikeHtml(incoming)
      ? (() => {
          const p = document.createElement('p');
          p.textContent = incoming;
          return p.innerHTML;
        })()
      : incoming;
    lastEmittedRef.current = html;
    editor.setHtml(html);
  }, [value]);

  // 只读切换
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (disabled) editor.disable();
    else editor.enable();
  }, [disabled]);

  return (
    <div className="rich-text-editor" data-testid={testId}>
      <div
        ref={toolbarRef}
        className="rich-text-editor__toolbar"
        style={{ border: '1px solid #d9d9d9', borderBottom: 'none', zIndex: 2 }}
      />
      <div
        ref={editorBoxRef}
        className="rich-text-editor__body"
        style={{
          height,
          overflowY: 'auto',
          resize: 'vertical',
          minHeight: 180,
          maxHeight: 960,
          border: '1px solid #d9d9d9',
        }}
      />
    </div>
  );
};

export default RichTextEditor;
