'use client';

/**
 * Distraction-free writing surface. Paste and drop are disabled — words must
 * be typed.
 *
 * Activity detection (NFR-7 / Phase 4.1) only counts REAL WRITES — content
 * actually changing in the pad. Arrow keys, shortcuts, modifier keys, and
 * clicks never reset the countdown:
 *   1. TipTap transaction updates (any doc change: typing, IME commit, cut)
 *   2. Native `input` events captured at the wrapper (backup for Android
 *      soft keyboards that mutate text without a usable transaction)
 *   3. Composition start/update/end (CJK / IME flows produce visible text)
 */

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

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
  // NOTE: TipTap v3's setEditable emits an "update" event by DEFAULT — which
  // our onUpdate treats as writing activity and would auto-start/restart the
  // countdown. Pass emitUpdate=false: toggling editability is NOT a write.
  useEffect(() => {
    if (editor && editor.isEditable === locked) {
      editor.setEditable(!locked, false);
    }
  }, [editor, locked]);

  // Native capture-phase `input` listener covers text mutations React/TipTap
  // may miss on mobile (e.g. soft keyboards mutating the DOM directly).
  // Key events are deliberately NOT activity — only writes count.
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;

    const fire = () => onActivityRef.current?.();

    dom.addEventListener('input', fire, true);
    dom.addEventListener('compositionstart', fire, true);
    dom.addEventListener('compositionupdate', fire, true);
    dom.addEventListener('compositionend', fire, true);

    return () => {
      dom.removeEventListener('input', fire, true);
      dom.removeEventListener('compositionstart', fire, true);
      dom.removeEventListener('compositionupdate', fire, true);
      dom.removeEventListener('compositionend', fire, true);
    };
  }, [editor]);

  return (
    <div
      onPaste={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      data-testid="writing-editor"
      className="h-full"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
