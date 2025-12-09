/**
 * Code Editor Component - Monaco Editor wrapper for programming questions
 */

import React, { useRef } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  options?: editor.IStandaloneEditorConstructionOptions;
}

// Default code templates for different languages
export const CODE_TEMPLATES: Record<string, string> = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here

    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    // Your code here

    return 0;
}
`,
};

// Language display names
export const LANGUAGE_NAMES: Record<string, string> = {
  cpp: 'C++',
  c: 'C',
};

// Monaco language IDs
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  cpp: 'cpp',
  c: 'c',
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'cpp',
  height = '400px',
  readOnly = false,
  theme = 'vs',
  options = {},
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Focus editor on mount
    editor.focus();
  };

  const handleEditorChange: OnChange = (value) => {
    onChange(value || '');
  };

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    fontFamily: '\'Fira Code\', \'Consolas\', \'Monaco\', monospace',
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'off',
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'line',
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    cursorStyle: 'line',
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    contextmenu: true,
    columnSelection: false,
    ...options,
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden' }}>
      <Editor
        height={height}
        language={MONACO_LANGUAGE_MAP[language] || 'cpp'}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={defaultOptions}
        loading={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999'
          }}>
            Loading editor...
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
