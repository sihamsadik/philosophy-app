import React, { useState } from 'react';

interface PostContentProps {
  content: string;
  /** Number of characters to show before truncating. */
  truncateLength?: number;
  /** Optional CSS class for the wrapper. */
  className?: string;
}

/**
 * Renders post text with a "Read more" / "Show less" toggle when the content
 * exceeds {@link truncateLength}. Mirrors the familiar LinkedIn behaviour.
 */
export const PostContent: React.FC<PostContentProps> = ({
  content,
  truncateLength = 150,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > truncateLength;

  if (!isLong) {
    return <span className={className}>{content}</span>;
  }

  const displayed = expanded ? content : `${content.substring(0, truncateLength)}...`;

  const toggle = () => setExpanded((prev) => !prev);

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
