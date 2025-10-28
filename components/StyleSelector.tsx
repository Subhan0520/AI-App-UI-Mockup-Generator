import React from 'react';
import { DesignStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: DesignStyle;
  onStyleChange: (style: DesignStyle) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleChange }) => {
  const styles = Object.values(DesignStyle);

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-text-muted mb-3">
        Design Style
      </legend>
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => (
          <div key={style}>
            <input 
              type="radio" 
              id={style} 
              name="design-style" 
              value={style} 
              checked={selectedStyle === style} 
              onChange={() => onStyleChange(style)}
              className="sr-only peer"
            />
            <label
              htmlFor={style}
              className={`px-4 py-2 text-sm font-medium rounded-full border border-base-300 cursor-pointer transition-all duration-200 ease-in-out
                peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary
                hover:bg-base-300 hover:text-base-content hover:border-primary/50
                peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-base-200 peer-focus-visible:ring-primary`}
            >
              {style}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
};
