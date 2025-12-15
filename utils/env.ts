
export const getEnv = (key: string): string => {
  try {
    // Tenta Vite / ES Modules Modernos
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val) return val;
    }
  } catch (e) {}

  try {
    // Tenta Node.js / Webpack antigo (fallback)
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key];
      if (val) return val;
    }
  } catch (e) {}

  return '';
};
