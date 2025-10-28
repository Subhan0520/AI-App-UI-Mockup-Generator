import React, { useState } from 'react';
import { GeneratedScreen } from '../types';

interface ScreenCardProps {
  screen: GeneratedScreen;
  index: number;
}

const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> );
const ReactIcon = () => ( <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><g><ellipse cx="12" cy="12" rx="11" ry="4" stroke="currentColor" strokeWidth="2"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(60 12 12)" stroke="currentColor" strokeWidth="2"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(120 12 12)" stroke="currentColor" strokeWidth="2"/></g></svg> );
const FlutterIcon = () => ( <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.314 0L6.039 8.275L14.314 16.55H22.588L14.314 8.275L22.588 0H14.314Z" fill="currentColor" fillOpacity="0.8"/><path d="M14.314 7.449L22.588 15.724L18.452 19.86L10.176 11.585L14.314 7.449Z" fill="currentColor"/></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> );


export const ScreenCard: React.FC<ScreenCardProps> = ({ screen, index }) => {
  const [copied, setCopied] = useState<'react' | 'flutter' | null>(null);

  const handleCopyCode = (type: 'react' | 'flutter') => {
    const codeToCopy = type === 'react' ? screen.code.react : screen.code.flutter;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  const animationDelay = `${index * 75}ms`;

  return (
    <div 
      className="bg-base-200 rounded-xl overflow-hidden shadow-lg border border-base-300/50 transform transition-all duration-300 group animate-slide-up hover:shadow-primary/20 hover:border-primary/50"
      style={{ animationDelay }}
    >
      <div className="relative aspect-[9/19.5] bg-base-300 overflow-hidden">
        <img src={screen.imageUrl} alt={screen.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-base text-base-content truncate">{screen.title}</h3>
        <div className="flex items-center justify-between mt-3">
          <a
            href={screen.imageUrl}
            download={`${screen.title.replace(/\s+/g, '_')}.png`}
            title="Download Image"
            className="p-2 rounded-full text-text-muted hover:bg-base-300 hover:text-secondary transition-colors"
          >
            <DownloadIcon />
          </a>
          <div className="flex items-center gap-2">
           <button
            onClick={() => handleCopyCode('react')}
            title={copied === 'react' ? 'Copied!' : 'Copy React Code'}
            className="p-2 rounded-full text-text-muted hover:bg-base-300 hover:text-[#61DAFB] transition-colors"
          >
            {copied === 'react' ? <CheckIcon/> : <ReactIcon />}
          </button>
          <button
            onClick={() => handleCopyCode('flutter')}
            title={copied === 'flutter' ? 'Copied!' : 'Copy Flutter Code'}
            className="p-2 rounded-full text-text-muted hover:bg-base-300 hover:text-[#027DFD] transition-colors"
          >
            {copied === 'flutter' ? <CheckIcon/> : <FlutterIcon />}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};
