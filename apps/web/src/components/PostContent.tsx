import React, { useState } from 'react';

interface PostContentProps {
  /** Full post text */
  content: string;
  /** Number of characters to show before truncating (fallback when maxWords not set). */
  truncateLength?: number;
  /** Maximum number of words to display before showing "Read more". */
  maxWords?: number;
  /** Optional CSS class for the wrapper. */
  className?: string;
}

/**
 * Renders post text with a "Read more" / "Show less" toggle when the content
 * exceeds the specified limits. Prioritises word‑based truncation (default 60 words)
 * – mirroring the familiar LinkedIn behaviour. Falls back to character‑based
 * truncation if `maxWords` is not provided.
 */
export const PostContent: React.FC<PostContentProps> = ({
  content,
  truncateLength = 150,
  maxWords = 60,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  const words = content.split(/\s+/).filter(Boolean);
  const isLong = maxWords > 0 ? words.length > maxWords : content.length > truncateLength;

  if (!isLong) {
    return <span className={className}>{content}</span>;
  }

  const displayed = expanded
    ? content
    : maxWords > 0
    ? `${words.slice(0, maxWords).join(' ')}...`
    : `${content.substring(0, truncateLength)}...`;

  const toggle = () => setExpanded(prev => !prev);

  return (
    <span className={className}>
      {displayed}{' '}
      <button
        type="button"
        onClick={toggle}
        style={{
          background: 'none',
          border: 'none',
          color: '#60a5fa',
          cursor: 'pointer',
          fontWeight: 500,
          padding: 0,
          margin: 0,
        }}
        aria-label={expanded ? 'Show less' : 'Read more'}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </span>
  );
};
