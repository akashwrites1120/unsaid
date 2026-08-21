'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onActivity: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TipTapEditor({
  content,
  onChange,
  onActivity,
  placeholder = 'Start writing...',
  disabled = false,
}: TipTapEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const contentRef = useRef(content);
  const isComposing = useRef(false);

  // Sync content from props
  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content;
      setEditorContent(content);
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: editorContent,
    editorProps: {
      attributes: {
        class: 'editor-content min-h-[400px] max-h-[60vh] p-6 focus:outline-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== contentRef.current) {
        contentRef.current = newContent;
        setEditorContent(newContent);
        onChange(newContent);
      }
    },
    onTransaction: () => {
      // This fires on every transaction including composition
      if (!isComposing.current) {
        onActivity();
      }
    },
  });

  // Handle composition events for IME input
  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
    onActivity();
  }, [onActivity]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    onActivity();
  }, [onActivity]);

  // Handle keydown for additional activity detection
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Any keydown counts as activity
    onActivity();
  }, [onActivity]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    />
  );
}