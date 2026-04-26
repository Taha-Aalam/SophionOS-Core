"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TaskInlineEditorProps {
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  completed?: boolean;
  className?: string;
}

export function TaskInlineEditor({
  value,
  onSave,
  disabled = false,
  completed = false,
  className,
}: TaskInlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn('h-7 py-0 px-2 text-sm', className)}
      />
    );
  }

  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        'text-sm leading-tight break-words',
        completed ? 'line-through text-muted-foreground' : 'cursor-text hover:text-foreground/80',
        className
      )}
    >
      {value}
    </span>
  );
}
