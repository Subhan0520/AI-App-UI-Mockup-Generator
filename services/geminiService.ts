import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ColorPalette, DesignStyle, GeneratedScreen, GenerateAppScreensResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateColorPalette = async (baseColor: string): Promise<ColorPalette> => {
    const prompt = `
    Given a base color of ${baseColor}, generate a harmonious color palette suitable for a modern mobile app UI.
    - The primary color should be the provided base color.
    - The secondary color should complement the primary color.
    - The accent color should be a vibrant color that stands out for calls-to-action.
    
    Return the result as a JSON object with three keys: "primary", "secondary", and "accent".
    Each key's value must be a 7-character hex color code string (e.g., "#RRGGBB").
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.STRING },
                        secondary: { type: Type.STRING },
                        accent: { type: Type.STRING },
                    },
                    required: ['primary', 'secondary', 'accent'],
                }
            }
        });

        const palette = JSON.parse(response.text);
        
        const isValidHex = (color: string) => /^#[0-9A-F]{6}$/i.test(color);
        if (!isValidHex(palette.primary) || !isValidHex(palette.secondary) || !isValidHex(palette.accent)) {
             console.warn("AI returned an invalid hex code, falling back.");
             throw new Error("AI returned invalid hex codes.");
        }

        return palette;
    } catch (error) {
        console.error("Error generating color palette:", error);
        throw new Error("Failed to generate a valid color palette from the AI.");
    }
};

const extractScreenNames = async (prompt: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following app description, identify the distinct user-facing screens or pages.
            Description: "${prompt}"
            Return your answer as a JSON array of strings, where each string is a concise name for a screen (e.g., "Login Screen", "User Dashboard", "Settings Page").`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        screens: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "Name of a single app screen"
                            }
                        }
                    }
                }
            }
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.screens || [];
    } catch (error) {
        console.error("Error extracting screen names:", error);
        throw new Error("Failed to parse app description. Please try rephrasing your idea.");
    }
};

const generateScreenImage = async (screenName: string, appDescription: string, style: DesignStyle, primaryColor: string, secondaryColor: string): Promise<string> => {
    const detailedPrompt = `Generate a high-quality mobile app UI mockup for a '${screenName}'.
    The app is a '${appDescription}'.
    The design style must be '${style}'.
    The primary color for the theme should be ${primaryColor} and the secondary color should be ${secondaryColor}.
    The screen should look complete, polished, and professional, including relevant UI elements like buttons, text fields, icons, and placeholder content.
    Ensure the visual design is modern, aesthetically pleasing, and consistent with the requested style and colors.
    Do not include any text labels like "UI design" or "mockup" on the image itself. The image should only be the app screen.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: detailedPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes: string = firstPart.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error(`No image data found in response for ${screenName}.`);
    } catch (error) {
        console.error(`Error generating image for ${screenName}:`, error);
        throw new Error(`Failed to generate UI for ${screenName}.`);
    }
};

const generateScreenCodeReact = async (screenName: string, appDescription: string, style: DesignStyle, primaryColor: string, secondaryColor: string): Promise<string> => {
    const codePrompt = `Generate a single React functional component for a '${screenName}' using JSX.
    The app is a '${appDescription}'.
    The design style must be '${style}'.
    The primary color is ${primaryColor} and the secondary color is ${secondaryColor}. Use these colors for branding elements like buttons, headers, and highlights.
    Use Tailwind CSS for all styling. Do not use custom CSS, styled-components, or inline style objects.
    The component should be self-contained and use placeholder data. For icons, use an SVG string directly inside the JSX.
    Return ONLY the raw JSX code for the component's body, without any surrounding text, explanations, import statements, or markdown fences like \`\`\`jsx.
    The root element should be a div with appropriate background and layout classes, styled to look like a mobile screen.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: codePrompt,
        });
        
        const rawCode = response.text.replace(/```jsx|```/g, '').trim();
        if (!rawCode || rawCode.length < 50) { // Basic sanity check
          throw new Error("AI returned empty or invalid code.");
        }
      
        const componentName = screenName.replace(/[^a-zA-Z0-9]/g, '');

        return `import React from 'react';

const ${componentName} = () => {
  return (
${rawCode.split('\n').map(line => `    ${line}`).join('\n')}
  );
};

export default ${componentName};
`;
    } catch (error) {
        console.error(`Error generating React code for ${screenName}:`, error);
        throw new Error(`Failed to generate React code for "${screenName}".`);
    }
};

const generateScreenCodeFlutter = async (screenName: string, appDescription: string, style: DesignStyle, primaryColor: string, secondaryColor: string): Promise<string> => {
    const codePrompt = `Generate a single, self-contained Flutter widget for a '${screenName}'.
    The app is a '${appDescription}'.
    The design style must be '${style}'.
    The primary color is ${primaryColor} and the secondary color is ${secondaryColor}. Use these hex colors for branding elements like buttons, headers, and highlights by converting them to Flutter Color objects (e.g., Color(0xFF8B5CF6)).
    Use the Material library for UI components (e.g., Scaffold, AppBar, Text, ElevatedButton).
    The widget should be a StatelessWidget or StatefulWidget, be well-structured, and use placeholder data. For icons, use standard Material icons (e.g., Icons.home).
    Return ONLY the raw Dart code for the widget class, without any surrounding text, explanations, import statements, or markdown fences like \`\`\`dart.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: codePrompt,
        });

        const rawCode = response.text.replace(/```dart|```/g, '').trim();
        if (!rawCode || rawCode.length < 50) { // Basic sanity check
          throw new Error("AI returned empty or invalid code.");
        }
        
        return `import 'package:flutter/material.dart';

${rawCode}
`;
    } catch (error) {
        console.error(`Error generating Flutter code for ${screenName}:`, error);
        throw new Error(`Failed to generate Flutter code for "${screenName}".`);
    }
};


export const generateLogo = async (appDescription: string, style: DesignStyle, primaryColor: string, secondaryColor: string): Promise<string> => {
    const logoPrompt = `Generate a clean, modern, and simple logo for a mobile app.
    The app is a '${appDescription}'.
    The design style should be consistent with a '${style}' theme.
    The logo should be iconic, easily recognizable, and suitable for a small app icon.
    It should be a vector-style graphic. The primary color should be ${primaryColor} and secondary color ${secondaryColor}.
    The background should be transparent.
    Do not include any text in the logo itself.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: logoPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes: string = firstPart.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error('No image data found for logo in response.');
    } catch (error) {
        console.error('Error generating logo:', error);
        throw new Error('Failed to generate a logo for the app.');
    }
};

export const generateAppScreens = async (prompt: string, style: DesignStyle, primaryColor: string, secondaryColor: string): Promise<GenerateAppScreensResult> => {
    const screenNames = await extractScreenNames(prompt);

    if (!screenNames || screenNames.length === 0) {
        throw new Error("Could not identify any screens from your description. Please be more specific about the pages you need, e.g., 'login page', 'dashboard'.");
    }

    const screenPromises = screenNames.map(async (name) => {
        const [imageUrl, reactCode, flutterCode] = await Promise.all([
            generateScreenImage(name, prompt, style, primaryColor, secondaryColor),
            generateScreenCodeReact(name, prompt, style, primaryColor, secondaryColor),
            generateScreenCodeFlutter(name, prompt, style, primaryColor, secondaryColor)
        ]);
        return {
            title: name,
            imageUrl,
            code: {
              react: reactCode,
              flutter: flutterCode,
            },
        };
    });
    
    const results = await Promise.allSettled(screenPromises);

    const successfulScreens: GeneratedScreen[] = [];
    const failedScreenReasons: string[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            successfulScreens.push(result.value);
        } else {
            failedScreenReasons.push(result.reason.message || 'An unknown screen generation error occurred.');
        }
    });

    return { successfulScreens, failedScreenReasons };
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const pureBase64 = base64ImageData.split(',')[1];
    if (!pureBase64) {
        throw new Error("Invalid base64 image data provided.");
    }

    const imagePart = {
        inlineData: {
            data: pureBase64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes: string = firstPart.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error('No edited image data found in response.');
    } catch (error) {
        console.error('Error editing image:', error);
        throw new Error('Failed to edit the image with the provided prompt.');
    }
};
