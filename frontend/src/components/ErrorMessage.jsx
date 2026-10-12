import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  message = 'An error occurred while loading data.',
  onRetry,
}) {
  return (
    <div className="error-message" role="alert" aria-live="assertive">
      <div className="error-icon">
        <AlertTriangle size={38} />
      </div>
      <h3 className="error-title">Unable to Load Information</h3>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          <RefreshCw size={15} />
          Retry Connection
        </button>
      )}
    </div>
  );
}
