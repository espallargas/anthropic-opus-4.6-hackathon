import { useCallback, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import { useI18n } from '@/lib/i18n';
import { Check, Copy } from 'lucide-react';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import ruby from 'highlight.js/lib/languages/ruby';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rb', ruby);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('text', plaintext);

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

interface CodeBlockProps {
  language: string | null;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  let highlightedHtml: string;
  if (language && hljs.getLanguage(language)) {
    highlightedHtml = hljs.highlight(children, { language }).value;
  } else {
    highlightedHtml = hljs.highlightAuto(children).value;
  }

  const displayLang = language || 'code';

  return (
    <div className="bg-muted/50 border-border/50 group my-3 overflow-hidden rounded-lg border">
      <div className="border-border/30 flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">{displayLang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          title={copied ? t('chat.copied') : t('chat.copy')}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">{t('chat.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('chat.copy')}</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}

function useMarkdownComponents(): Components {
  return {
    pre({ children }) {
      return <>{children}</>;
    },
    code({ className, children, ...props }) {
      const codeString = extractText(children);
      const match = /language-(\w+)/.exec(className || '');
      const isBlock = match || codeString.includes('\n');

      if (isBlock) {
        return <CodeBlock language={match?.[1] || null}>{codeString.replace(/\n$/, '')}</CodeBlock>;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="my-3 overflow-x-auto">
          <table {...props}>{children}</table>
        </div>
      );
    },
  };
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components = useMarkdownComponents();
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
