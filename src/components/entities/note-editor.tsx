"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NoteEditorProps {
  content: string | null;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={title}
      className={cn(
        "h-7 w-7 rounded",
        isActive && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </Button>
  );
}

export function NoteEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  readOnly = false,
  className,
}: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
    ],
    content: content ? (tryParseJson(content) ?? content) : "",
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange(JSON.stringify(e.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] prose prose-sm dark:prose-invert max-w-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = content ? (tryParseJson(content) ?? content) : "";
    const incomingStr = typeof incoming === "string" ? incoming : JSON.stringify(incoming);
    const current = JSON.stringify(editor.getJSON());
    if (incomingStr !== current) {
      // emitUpdate:false prevents spurious autosave when syncing from server
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col rounded-lg border border-border bg-background", className)}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline code"
          >
            <Code className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet list"
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Ordered list"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code block"
          >
            <Code2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive("link")}
            title="Link"
          >
            <LinkIcon className="size-3.5" />
          </ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} className="flex-1 px-4 py-3" />
    </div>
  );
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
