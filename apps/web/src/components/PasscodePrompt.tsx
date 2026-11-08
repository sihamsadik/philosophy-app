import React, { useState } from 'react';
import { hashPasscode } from '../lib/crypto';

interface PasscodePromptProps {
  onSuccess: () => void;
}

const PasscodePrompt: React.FC<PasscodePromptProps> = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedHash = typeof window !== 'undefined' ? localStorage.getItem('philosophy_passcode_hash') : null;
    if (!storedHash) {
      // No passcode configured – allow access
      onSuccess();
      return;
    }
    try {
      const inputHash = await hashPasscode(code);
      if (inputHash === storedHash) {
        setError(null);
        onSuccess();
      } else {
        setError('Incorrect passcode.');
      }
    } catch (err) {
      setError('Failed to verify passcode.');
    }
  };

  return (
    <div className="passcode-prompt-overlay">
      <div className="passcode-prompt-modal">
        <h2>Enter Passcode</h2>
        <form onSubmit={handleSubmit} className="passcode-form">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="4‑6 digit code"
            className="input-text"
            required
            minLength={4}
            maxLength={6}
          />
          {error && <div className="field-error-text">{error}</div>}
          <button type="submit" className="auth-submit-btn">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasscodePrompt;
