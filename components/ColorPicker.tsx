import React from 'react';
import { ColorPalette } from '../types';

interface ColorPickerProps {
  baseColor: string;
  palette: ColorPalette | null;
  onBaseColorChange: (color: string) => void;
  onGeneratePalette: () => void;
  isGenerating: boolean;
}

const ColorSwatch: React.FC<{ label: string; hex: string }> = ({ label, hex }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (
        <div className="text-center">
            <div 
                className="w-full h-16 rounded-lg mb-2 border-2 border-transparent cursor-pointer transition hover:border-primary"
                style={{ backgroundColor: hex }}
                onClick={handleCopy}
                title={`Click to copy ${hex}`}
            />
            <p className="text-xs font-medium text-text-muted">{label}</p>
            <p className="text-sm font-mono text-base-content tracking-widest">{copied ? 'Copied!' : hex.toUpperCase()}</p>
        </div>
    );
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ baseColor, palette, onBaseColorChange, onGeneratePalette, isGenerating }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-3">
        Brand Colors
      </label>
      <div className="flex items-end gap-3">
         <div className="flex-grow">
            <label htmlFor="base-color" className="block text-xs font-medium text-text-muted mb-1">Base Color</label>
            <div className="flex items-center bg-base-100 border border-base-300/50 rounded-lg p-1 focus-within:ring-2 focus-within:ring-primary-focus">
                <input
                  id="base-color"
                  type="color"
                  value={baseColor}
                  onChange={(e) => onBaseColorChange(e.target.value)}
                  className="w-10 h-10 p-0 border-none cursor-pointer bg-transparent rounded-md"
                />
                <input
                  type="text"
                  value={baseColor.toUpperCase()}
                  onChange={(e) => onBaseColorChange(e.target.value)}
                  className="w-full bg-transparent text-sm text-base-content ml-2 focus:outline-none font-mono"
                />
            </div>
        </div>
        <button 
            type="button" 
            onClick={onGeneratePalette}
            disabled={isGenerating}
            className="px-4 py-2 h-[46px] text-sm font-semibold rounded-lg bg-secondary text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-wait flex items-center"
        >
             {isGenerating ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 2.293a1 1 0 00-1.414 0l-4.293 4.293a1 1 0 01-1.414 0L5.707 2.293a1 1 0 00-1.414 1.414l4.293 4.293a1 1 0 010 1.414L4.293 13.707a1 1 0 001.414 1.414l4.293-4.293a1 1 0 011.414 0l4.293 4.293a1 1 0 001.414-1.414L13.414 9.707a1 1 0 010-1.414l4.293-4.293a1 1 0 000-1.414z" /></svg>
             )}
            {isGenerating ? 'Working...' : 'Generate Palette'}
        </button>
      </div>

      {palette && (
        <div className="mt-4 pt-4 border-t border-base-300/50">
             <p className="text-xs font-medium text-text-muted mb-3 text-center uppercase tracking-wider">AI-Generated Palette</p>
             <div className="grid grid-cols-3 gap-4 animate-fade-in">
                <ColorSwatch label="Primary" hex={palette.primary} />
                <ColorSwatch label="Secondary" hex={palette.secondary} />
                <ColorSwatch label="Accent" hex={palette.accent} />
             </div>
        </div>
      )}
    </div>
  );
};
