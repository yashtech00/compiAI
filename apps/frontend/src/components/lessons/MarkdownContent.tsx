'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = useMemo(() => {
    if (!content) return '';

    // Configure marked for clean, semantic HTML
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    try {
      return marked.parse(content) as string;
    } catch (err) {
      console.error('Failed to parse markdown:', err);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-content max-w-none text-[#17172A] dark:text-slate-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Utility to extract key terms from markdown text or activities
export function extractKeyTerms(text: string): Array<{ term: string; definition: string }> {
  if (!text) return [];
  const terms: Array<{ term: string; definition: string }> = [];

  // Match bullet points with - **Term**: Definition or - **Term** - Definition
  const regex = /[-*]\s+\*\*([^*]+)\*\*[:\s-]+([^\n]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    terms.push({
      term: match[1].trim(),
      definition: match[2].trim(),
    });
  }

  return terms;
}
