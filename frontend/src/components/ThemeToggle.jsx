import React from 'react';
import { useTheme } from '../context/ThemeProvider';
import '../styles/ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="theme-toggle-wrapper">
      <button 
        className={`theme-toggle-btn ${isLight ? 'light' : 'dark'}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        role="switch"
        aria-checked={isLight}
      >
        <div className="toggle-track">
          {/* Background decorations for dark mode */}
          <div className="stars-container">
            <span className="star star-1"></span>
            <span className="star star-2"></span>
            <span className="star star-3"></span>
            <span className="star star-4"></span>
          </div>

          {/* Background decorations for light mode */}
          <div className="clouds-container">
            <span className="cloud cloud-1"></span>
            <span className="cloud cloud-2"></span>
          </div>

          {/* The main sliding knob */}
          <div className="toggle-knob">
            {/* Sun rays that fade in on light mode */}
            <div className="sun-rays"></div>
            
            {/* The core celestial body */}
            <div className="celestial-body">
              {/* Moon craters that fade in on dark mode */}
              <div className="moon-craters">
                <span className="crater crater-1"></span>
                <span className="crater crater-2"></span>
                <span className="crater crater-3"></span>
              </div>
            </div>
          </div>
        </div>
      </button>
      <div className="theme-labels" aria-hidden="true">
        <span className={`label ${isLight ? 'active' : ''}`}>Light</span>
        <span className="label-divider">/</span>
        <span className={`label ${!isLight ? 'active' : ''}`}>Dark</span>
      </div>
    </div>
  );
}
