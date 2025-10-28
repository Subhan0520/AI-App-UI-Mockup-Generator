export enum DesignStyle {
  MINIMAL = 'Minimal',
  MATERIAL = 'Material UI',
  IOS = 'iOS Style',
  DARK = 'Dark Mode',
  MODERN = 'Modern Flat',
  NEUMORPHIC = 'Neumorphic',
}

export interface GeneratedScreen {
  title: string;
  imageUrl: string;
  code: {
    react: string;
    flutter: string;
  };
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface GenerateAppScreensResult {
  successfulScreens: GeneratedScreen[];
  failedScreenReasons: string[];
}
