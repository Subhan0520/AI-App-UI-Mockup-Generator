import React, { useState, useCallback, DragEvent, WheelEvent, MouseEvent, useEffect } from 'react';
import { ColorPalette, DesignStyle, GeneratedScreen } from './types';
import { generateAppScreens, generateLogo, generateColorPalette, editImage } from './services/geminiService';
import { StyleSelector } from './components/StyleSelector';
import { ScreenCard } from './components/ScreenCard';
import { Loader } from './components/Loader';
import { ExportControls } from './components/ExportButton';
import { ColorPicker } from './components/ColorPicker';

type ActiveTab = 'generator' | 'editor';
type OriginalImage = {
  file: File;
  base64: string;
  mimeType: string;
};
type Notification = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

const App: React.FC = () => {
  // Common state
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generator state
  const [prompt, setPrompt] = useState<string>('A food delivery app with splash screen, login, menu, food details, cart, and checkout page.');
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>(DesignStyle.MODERN);
  const [baseColor, setBaseColor] = useState('#A78BFA');
  const [palette, setPalette] = useState<ColorPalette | null>({ primary: '#A78BFA', secondary: '#2DD4BF', accent: '#F59E0B' });
  const [isGeneratingPalette, setIsGeneratingPalette] = useState<boolean>(false);
  const [generatedScreens, setGeneratedScreens] = useState<GeneratedScreen[]>([]);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFigmaInstructions, setShowFigmaInstructions] = useState<boolean>(false);

  // Editor state
  const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Zoom & Pan state for the editor
  const [viewTransform, setViewTransform] = useState({ scale: 1, pan: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });

  const removeNotification = (id: number) => {
    setNotifications(current => current.filter(n => n.id !== id));
  };

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    const newId = Date.now();
    setNotifications(current => [...current, { id: newId, message, type }]);
    setTimeout(() => {
      removeNotification(newId);
    }, 5000);
  }, []);

  const examplePrompts = [ 'A language learning app with lesson selection and interactive flashcards.', 'A recipe app with quick search, a shopping list, and user profiles.', 'An e-commerce app for handmade jewelry with a product gallery and secure checkout.', 'A personal finance tracker with a dashboard and expense charts.', ];
  const imageEditExamplePrompts = [ 'Add a retro, vintage filter.', 'Make this look like a watercolor painting.', 'Change the background to a sunny beach.', 'Add a cat wearing sunglasses.', 'Give it a cyberpunk, neon aesthetic.', ];

  const handleGeneratePalette = useCallback(async () => {
      setIsGeneratingPalette(true);
      try {
          const newPalette = await generateColorPalette(baseColor);
          setPalette(newPalette);
          showNotification('Color palette generated successfully!', 'success');
      } catch (e: any) {
          showNotification(e.message || 'Failed to generate color palette.', 'error');
      } finally {
          setIsGeneratingPalette(false);
      }
  }, [baseColor, showNotification]);

  const handleGenerate = useCallback(async () => {
    if (!prompt) { showNotification('Please enter an app description.', 'error'); return; }
    if (!palette) { showNotification('Please generate a color palette first.', 'error'); return; }
    setIsLoading(true);
    setGeneratedScreens([]);
    setLogoImageUrl(null);
    setShowFigmaInstructions(false);

    try {
      const [screenResult, logoUrl] = await Promise.all([
        generateAppScreens(prompt, selectedStyle, palette.primary, palette.secondary),
        generateLogo(prompt, selectedStyle, palette.primary, palette.secondary)
      ]);
      setGeneratedScreens(screenResult.successfulScreens);
      setLogoImageUrl(logoUrl);

      if (screenResult.successfulScreens.length > 0) { showNotification(`Successfully generated ${screenResult.successfulScreens.length} screen(s)!`, 'success'); }
      if (screenResult.failedScreenReasons.length > 0) { showNotification(`Could not generate some screens: ${screenResult.failedScreenReasons.slice(0, 2).join(', ')}`, 'error'); }
      if(screenResult.successfulScreens.length === 0 && screenResult.failedScreenReasons.length > 0) { throw new Error("Failed to generate any screens. Please try refining your prompt."); }
    } catch (e: any) {
      showNotification(e.message || 'An unknown error occurred during generation.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedStyle, palette, showNotification]);

  const handleImageSelect = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({ file, base64: reader.result as string, mimeType: file.type });
      };
      reader.readAsDataURL(file);
      setEditedImage(null);
      handleResetView();
    } else {
      showNotification('Please select a valid image file.', 'error');
    }
  };

  const handleImageEdit = async () => {
    if (!originalImage || !editPrompt) { showNotification('Please upload an image and provide an edit prompt.', 'error'); return; }
    setIsEditing(true);
    setEditedImage(null);
    try {
      const resultUrl = await editImage(originalImage.base64, originalImage.mimeType, editPrompt);
      setEditedImage(resultUrl);
      showNotification('Image successfully edited!', 'success');
    } catch (e: any)      {
      showNotification(e.message || 'An error occurred while editing the image.', 'error');
    } finally {
      setIsEditing(false);
    }
  };
  
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => event.preventDefault();
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (event.dataTransfer.files?.[0]) { handleImageSelect(event.dataTransfer.files[0]); } };
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => { e.preventDefault(); const target = e.currentTarget; const rect = target.getBoundingClientRect(); const zoomFactor = 1.1; const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor; const newScale = Math.max(0.5, Math.min(viewTransform.scale * delta, 5)); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top; const newPanX = mouseX - (mouseX - viewTransform.pan.x) * (newScale / viewTransform.scale); const newPanY = mouseY - (mouseY - viewTransform.pan.y) * (newScale / viewTransform.scale); setViewTransform({ scale: newScale, pan: { x: newPanX, y: newPanY } }); };
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => { if (e.button !== 0) return; e.preventDefault(); setIsPanning(true); setStartPanPoint({ x: e.clientX - viewTransform.pan.x, y: e.clientY - viewTransform.pan.y }); };
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => { if (!isPanning) return; e.preventDefault(); setViewTransform(prev => ({ ...prev, pan: { x: e.clientX - startPanPoint.x, y: e.clientY - startPanPoint.y } })); };
  const handleMouseUpOrLeave = () => setIsPanning(false);
  const handleZoomControl = (factor: number) => setViewTransform(prev => ({ ...prev, scale: Math.max(0.5, Math.min(prev.scale * factor, 5)) }));
  const handleResetView = () => setViewTransform({ scale: 1, pan: { x: 0, y: 0 } });
  
  const AppIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.443.649a1 1 0 01.554 1.705l-3.216 3.135.759 4.425a1 1 0 01-1.451 1.054L12 15.694l-3.978 2.09a1 1 0 01-1.451-1.054l.759-4.425-3.216-3.135a1 1 0 01.554-1.705l4.443-.649L11.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg> );
  const UploadIcon = () => ( <svg className="mx-auto h-12 w-12 text-text-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> );
  const ZoomInIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>);
  const ZoomOutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>);
  const ResetZoomIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>);

  return (
    <div className="min-h-screen bg-base-100 text-base-content bg-gradient-to-b from-base-100 to-[#0B1120]">
      <div className="fixed top-8 right-8 z-50 flex flex-col gap-3">
        {notifications.map(n => (
          <div key={n.id} className={`max-w-sm rounded-lg shadow-2xl animate-slide-up ${n.type === 'success' ? 'bg-secondary' : 'bg-red-500'}`}>
            <div className="p-3 flex items-start">
                <div className="flex-1"><p className="text-sm font-medium text-white">{n.message}</p></div>
                <button onClick={() => removeNotification(n.id)} className="p-1 -m-1 text-white rounded-full hover:bg-white/20 focus:outline-none"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
            </div>
          </div>
        ))}
      </div>
      
      <header className="sticky top-0 bg-base-100/80 backdrop-blur-lg p-4 border-b border-base-300/50 z-20">
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-3">
          <AppIcon />
          <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            AI Creative Suite
          </h1>
        </div>
      </header>
      
      <main className="container mx-auto max-w-7xl p-4 sm:p-6 md:p-8">
        <div className="flex justify-center mb-8">
            <div className="bg-base-200 p-1 rounded-full flex items-center space-x-1 border border-base-300/50">
                <button onClick={() => setActiveTab('generator')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 ${activeTab === 'generator' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-base-content hover:bg-base-300'}`}>
                    UI Mockup Generator
                </button>
                <button onClick={() => setActiveTab('editor')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 ${activeTab === 'editor' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-base-content hover:bg-base-300'}`}>
                    AI Image Editor
                </button>
            </div>
        </div>
        
        {activeTab === 'generator' && (
            <div className="animate-fade-in">
                 <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div>
                              <label htmlFor="prompt" className="block text-sm font-medium text-text-muted mb-2"> Describe your app idea </label>
                              <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A fitness tracker app with login, dashboard, workout tracker, and progress page" className="w-full h-36 p-3 bg-base-100 border border-base-300/50 rounded-lg focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition duration-200 text-base-content placeholder-text-muted/50 text-sm" />
                            </div>
                             <div>
                                <p className="text-sm font-medium text-text-muted mb-3"> Or try an example </p>
                                <div className="flex flex-wrap gap-2">
                                  {examplePrompts.map((example, index) => ( <button key={index} type="button" onClick={() => setPrompt(example)} className="px-3 py-1 text-xs font-medium bg-base-300/70 text-text-muted rounded-full hover:bg-primary hover:text-white transition-colors duration-200 ease-in-out"> {example} </button> ))}
                                </div>
                              </div>
                        </div>
                        <div className="space-y-6">
                            <StyleSelector selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} />
                            <ColorPicker baseColor={baseColor} palette={palette} onBaseColorChange={setBaseColor} onGeneratePalette={handleGeneratePalette} isGenerating={isGeneratingPalette} />
                        </div>
                    </div>
                   <div className="mt-8 border-t border-base-300/50 pt-6">
                       <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center bg-gradient-to-r from-primary-focus to-secondary-focus text-white font-bold py-4 px-4 rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
                        <SparklesIcon /> {isLoading ? 'Generating...' : 'Generate Mockups'}
                      </button>
                   </div>
                </div>
                <div className="mt-12">
                  {isLoading && <Loader />}
                  {!isLoading && generatedScreens.length > 0 && (
                     <div className="mb-10 text-center animate-fade-in space-y-8">
                         {logoImageUrl && (
                            <div>
                                <h2 className="text-lg font-bold text-text-muted mb-4 uppercase tracking-wider">Generated Logo</h2>
                                <div className="inline-block bg-base-200 p-4 rounded-2xl shadow-lg border border-base-300/50">
                                    <img src={logoImageUrl} alt="Generated App Logo" className="h-28 w-28 object-contain" />
                                </div>
                            </div>
                         )}
                         <ExportControls screens={generatedScreens} onExportSuccess={(type) => showNotification(`Started packaging your ${type} project!`, 'success')} />
                    </div>
                  )}
                  {generatedScreens.length > 0 && !isLoading &&(
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {generatedScreens.map((screen, index) => ( <ScreenCard key={index} screen={screen} index={index}/> ))}
                    </div>
                  )}
                  {!isLoading && generatedScreens.length === 0 && (
                     <div className="text-center py-16 px-6 bg-base-200/50 rounded-xl border-2 border-dashed border-base-300/30">
                        <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                          <svg className="w-10 h-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.251.023.501.05.75.082a.75.75 0 01.75.75v5.714c0 .414-.336.75-.75.75a.75.75 0 01-.75-.75V3.854a.75.75 0 01.659-.75zM14.25 3.104a.75.75 0 00-.75-.75c-.251.032-.501.059-.75.082V11.25a.75.75 0 00.75.75a.75.75 0 00.75-.75V3.104zM14.25 14.5L18.5 10.25a2.25 2.25 0 00-.659-1.591V3.104a.75.75 0 00-.75-.75c-.251.032-.501.059-.75.082V11.25a.75.75 0 00.75.75a.75.75 0 00.75-.75V3.104z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25" /></svg>
                        </div>
                        <h2 className="text-xl font-semibold text-base-content">Ready to create?</h2>
                        <p className="mt-2 text-text-muted">Your generated app screens will appear here.</p>
                     </div>
                  )}
                </div>
            </div>
        )}
        
        {activeTab === 'editor' && (
           <div className="animate-fade-in">
             <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300/50">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">1. Upload your image</label>
                            <div onDragOver={handleDragOver} onDrop={handleDrop} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-base-300/50 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors" onClick={() => document.getElementById('file-upload')?.click()}>
                                <div className="space-y-1 text-center">
                                    <UploadIcon />
                                    <div className="flex text-sm text-text-muted"><p className="pl-1">Click to upload or drag and drop</p></div>
                                    <p className="text-xs text-text-muted/70">PNG, JPG, GIF up to 10MB</p>
                                </div>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageSelect(e.target.files ? e.target.files[0] : null)} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="edit-prompt" className="block text-sm font-medium text-text-muted mb-2">2. Describe your edit</label>
                            <textarea id="edit-prompt" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g., Add a retro filter and a small cat." className="w-full h-24 p-3 bg-base-100 border border-base-300/50 rounded-lg focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition duration-200 text-base-content placeholder-text-muted/50 text-sm" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-muted mb-3">Or try an example</p>
                            <div className="flex flex-wrap gap-2">
                                {imageEditExamplePrompts.map((example) => ( <button key={example} type="button" onClick={() => setEditPrompt(example)} className="px-3 py-1 text-xs font-medium bg-base-300/70 text-text-muted rounded-full hover:bg-primary hover:text-white transition-colors"> {example} </button> ))}
                            </div>
                        </div>
                     </div>
                     <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-text-muted">3. See the result</label>
                            <div className="flex items-center gap-1 bg-base-300 rounded-md p-0.5">
                                <button title="Zoom Out" onClick={() => handleZoomControl(1 / 1.2)} className="p-1.5 rounded-sm text-text-muted hover:bg-base-200 hover:text-base-content transition-colors"><ZoomOutIcon/></button>
                                <button title="Reset View" onClick={handleResetView} className="p-1.5 rounded-sm text-text-muted hover:bg-base-200 hover:text-base-content transition-colors"><ResetZoomIcon/></button>
                                <button title="Zoom In" onClick={() => handleZoomControl(1.2)} className="p-1.5 rounded-sm text-text-muted hover:bg-base-200 hover:text-base-content transition-colors"><ZoomInIcon/></button>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className={`w-full aspect-square bg-base-100 rounded-lg flex items-center justify-center border border-base-300/50 overflow-hidden relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
                                {originalImage ? <img src={originalImage.base64} alt="Original" className="max-w-none max-h-none transition-transform duration-75 ease-out" style={{transform: `scale(${viewTransform.scale}) translate(${viewTransform.pan.x}px, ${viewTransform.pan.y}px)`}}/> : <span className="text-text-muted text-sm">Original</span>}
                                <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{(viewTransform.scale * 100).toFixed(0)}%</span>
                            </div>
                            <div className={`w-full aspect-square bg-base-100 rounded-lg flex items-center justify-center border border-base-300/50 overflow-hidden relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
                                {isEditing ? <Loader message="Applying edit..."/> : editedImage ? <img src={editedImage} alt="Edited" className="max-w-none max-h-none transition-transform duration-75 ease-out" style={{transform: `scale(${viewTransform.scale}) translate(${viewTransform.pan.x}px, ${viewTransform.pan.y}px)`}}/> : <span className="text-text-muted text-sm">Edited</span>}
                                <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{(viewTransform.scale * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                     </div>
                 </div>
                 <div className="mt-8 border-t border-base-300/50 pt-6">
                   <button onClick={handleImageEdit} disabled={isEditing || !originalImage} className="w-full flex items-center justify-center bg-gradient-to-r from-primary-focus to-secondary-focus text-white font-bold py-4 px-4 rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
                       <SparklesIcon />
                       {isEditing ? 'Generating...' : 'Generate Edit'}
                   </button>
                </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
