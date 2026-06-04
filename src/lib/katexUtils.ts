/**
 * KaTeX/LaTeX utilities for rendering mathematical and scientific formulas
 * in questions, options, and explanations
 */

// KaTeX will be loaded dynamically to avoid bundle size impact
let katexLoaded = false;
let katexModule: any = null;

/**
 * Dynamically load KaTeX library
 */
export async function loadKaTeX(): Promise<boolean> {
  if (katexLoaded) return true;
  
  try {
    // Load KaTeX CSS
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      link.integrity = 'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    
    // Load KaTeX JS
    if (!document.getElementById('katex-js')) {
      const script = document.createElement('script');
      script.id = 'katex-js';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.integrity = 'sha384-XjKyOOdBbEj30x+KMIS1e42jwI/viYy9C81zgXMcJwIpRkPgEglIbK9/k3S/p5I';
      script.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    katexModule = (window as any).katex;
    katexLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading KaTeX:', error);
    return false;
  }
}

/**
 * Check if text contains LaTeX math delimiters
 */
export function containsLatex(text: string): boolean {
  return (
    /\$[^$]+\$/.test(text) ||
    /\$\$[^$]+\$\$/.test(text) ||
    /\\begin\{/.test(text) ||
    /\\frac\{/.test(text) ||
    /\\sqrt\{/.test(text) ||
    /\\sum_/.test(text) ||
    /\\int_/.test(text) ||
    /\\pi/.test(text) ||
    /\\alpha/.test(text) ||
    /\\beta/.test(text) ||
    /\\theta/.test(text)
  );
}

/**
 * Render LaTeX math in text - returns HTML string
 */
export async function renderLatex(text: string): Promise<string> {
  if (!containsLatex(text)) return text;
  
  try {
    await loadKaTeX();
    if (!katexModule) return text;
    
    // Replace display math $$...$$
    let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        return katexModule.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
      } catch (e) {
        return match;
      }
    });
    
    // Replace inline math $...$
    result = result.replace(/\$([^\$]+)\$/g, (match, formula) => {
      try {
        return katexModule.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        });
      } catch (e) {
        return match;
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    return text;
  }
}

/**
 * Common math symbols to LaTeX mappings
 */
export const mathSymbols: Record<string, string> = {
  '×': '\\times', '÷': '\\div', '±': '\\pm', '≠': '\\neq',
  '≤': '\\leq', '≥': '\\geq', '≈': '\\approx', '∞': '\\infty',
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '√': '\\sqrt',
  'π': '\\pi', 'θ': '\\theta', 'α': '\\alpha', 'β': '\\beta',
  'γ': '\\gamma', 'δ': '\\delta', 'Δ': '\\Delta', 'Σ': '\\Sigma',
  '→': '\\rightarrow', '←': '\\leftarrow', '⇒': '\\Rightarrow',
};

/**
 * Convert common math symbols to LaTeX
 */
export function convertSymbolsToLatex(text: string): string {
  let result = text;
  for (const [symbol, latex] of Object.entries(mathSymbols)) {
    result = result.replace(new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), latex);
  }
  return result;
}

/**
 * Format fraction for LaTeX
 */
export function formatFraction(numerator: string | number, denominator: string | number): string {
  return `\\frac{${numerator}}{${denominator}}`;
}

/**
 * Format square root for LaTeX
 */
export function formatSqrt(value: string | number): string {
  return `\\sqrt{${value}}`;
}

/**
 * Format power/exponent for LaTeX
 */
export function formatPower(base: string | number, exponent: string | number): string {
  return `{${base}}^{${exponent}}`;
}

/**
 * Predefined KaTeX configurations for different subjects
 */
export const subjectConfigs = {
  maths: { displayMode: false, throwOnError: false, trust: true },
  science: { displayMode: false, throwOnError: false, trust: true, macros: { '\\degree': '^\\circ' } },
  default: { displayMode: false, throwOnError: false, trust: true },
};

/**
 * React Hook for rendering LaTeX in components
 */
export function useLatex(text: string) {
  const [html, setHtml] = useState<string>(text);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const render = async () => {
      const rendered = await renderLatex(text);
      setHtml(rendered);
      setLoading(false);
    };
    render();
  }, [text]);

  return { html, loading };
}

import { useState, useEffect } from 'react';