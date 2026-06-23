import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className || ''}`}
      aria-label="Alternar tema"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-full)',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-primary-color" style={{ animation: 'fadeIn var(--transition-fast) forwards' }} />
      ) : (
        <Moon size={18} style={{ color: '#4f46e5', animation: 'fadeIn var(--transition-fast) forwards' }} />
      )}
    </button>
  );
};
