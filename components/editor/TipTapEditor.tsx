'use client';

/**
 * Distraction-free writing surface.
 *
 * Activity detection (NFR-7 / Phase 4.1) is layered so unreliable mobile
 * soft keyboards and IME composition can't cause unfair failures:
 *   1. TipTap transaction updates (any doc change: typing, paste, IME commit)
 *   2. Native `input` events captured at the wrapper (some Android IMEs fire
 *      input without usable keydown values)
 *   3. Composition start/end (CJK / IME flows)
 *   4. keydown for printable + editing keys
 *   5. paste (with a trailing tick so post-paste state settles)
 * The challenge page additionally listens at window level as a final net.
 */

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef } from 'react';

interface TipTapEditorProps {
  initialContent?: string;
  onChange?: (html: string) => void;
  /** Called on any writing-related user activity. */
  onActivity?: () => void;
  placeholder?: string;
  /** Locks the editor (used only after the run has ended). */
  locked?: boolean;
}

export function TipTapEditor({
  initialContent = '',
  onChange,
  onActivity,
  placeholder = 'Start typing to begin the timer…',
  locked = false,
}: TipTapEditorProps) {
  // Refs keep listener callbacks stable without re-binding effects.
  const onChangeRef = useRef(onChange);
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onChangeRef.current = onChange;
    onActivityRef.current = onActivity;
  }, [onChange, onActivity]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        blockquote: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editable: !locked,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'editor-content min-h-[52vh] outline-none',
        spellcheck: 'true',
        autocorrect: 'off',
        autocapitalize: 'sentences',
      },
    },
    onUpdate: ({ editor }) => {
      onActivityRef.current?.();
      onChangeRef.current?.(editor.getHTML());
    },
  });

  // Keep editability in sync without recreating the editor.
  useEffect(() => {
    if (editor && editor.isEditable === locked) {
      editor.setEditable(!locked);
    }
  }, [editor, locked]);

  // Native capture-phase listeners cover input paths React may miss on
  // mobile (e.g. soft keyboards firing `input` without meaningful keys).
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;

    const fire = () => onActivityRef.current?.();

    const handleKeydown = (e: Event) => {
      const key = (e as KeyboardEvent).key;
      if (key.length === 1 || key === 'Backspace' || key === 'Delete' || key === 'Enter') {
        fire();
      }
    };
    const handlePaste = () => setTimeout(fire, 0);

    dom.addEventListener('input', fire, true);
    dom.addEventListener('compositionstart', fire, true);
    dom.addEventListener('compositionupdate', fire, true);
    dom.addEventListener('compositionend', fire, true);
    dom.addEventListener('keydown', handleKeydown, true);
    dom.addEventListener('paste', handlePaste, true);
    dom.addEventListener('cut', fire, true);

    return () => {
      dom.removeEventListener('input', fire, true);
      dom.removeEventListener('compositionstart', fire, true);
      dom.removeEventListener('compositionupdate', fire, true);
      dom.removeEventListener('compositionend', fire, true);
      dom.removeEventListener('keydown', handleKeydown, true);
      dom.removeEventListener('paste', handlePaste, true);
      dom.removeEventListener('cut', fire, true);
    };
  }, [editor]);

  const handleWrapperPaste = useCallback(() => {
    setTimeout(() => onActivityRef.current?.(), 0);
  }, []);

  return (
    <div
      onPaste={handleWrapperPaste}
      data-testid="writing-editor"
      className="h-full"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
