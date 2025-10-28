'use client';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export default function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Split text into lines and process each line
  const lines = text.split('\n');

  const formatLine = (line: string, index: number) => {
    // Handle headers (## Header)
    if (line.startsWith('## ')) {
      const content = line.substring(3);
      return (
        <h3 key={index} className="text-[15px] font-semibold text-[var(--text-primary)] mt-3 mb-2">
          {formatInlineText(content)}
        </h3>
      );
    }

    // Handle headers (### Header)
    if (line.startsWith('### ')) {
      const content = line.substring(4);
      return (
        <h4 key={index} className="text-[14px] font-semibold text-[var(--text-primary)] mt-2 mb-1">
          {formatInlineText(content)}
        </h4>
      );
    }

    // Handle list items (- item or * item)
    if (line.match(/^[\-\*]\s+/)) {
      const content = line.replace(/^[\-\*]\s+/, '');
      return (
        <div key={index} className="flex gap-2 my-1">
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="flex-1">{formatInlineText(content)}</span>
        </div>
      );
    }

    // Handle empty lines
    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }

    // Regular paragraph
    return (
      <p key={index} className="my-1">
        {formatInlineText(line)}
      </p>
    );
  };

  const formatInlineText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Regex to find bold text (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }

      // Add bold text
      parts.push(
        <strong key={match.index} className="font-semibold text-[var(--text-primary)]">
          {match[1]}
        </strong>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`${className}`}>
      {lines.map((line, index) => formatLine(line, index))}
    </div>
  );
}

