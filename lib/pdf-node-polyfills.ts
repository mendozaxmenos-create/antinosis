/**
 * pdfjs-dist asume APIs del navegador (DOMMatrix, etc.). En Node/Vercel no existen;
 * sin esto: "DOMMatrix is not defined" al extraer texto del PDF.
 */
export function installPdfJsNodePolyfills(): void {
  // Evitar conflicto con tipos DOM de lib (DOMMatrix constructor completo).
  const g = globalThis as Record<string, unknown>;

  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;
      constructor(init?: string | number[]) {
        void init;
      }
      multiply() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
      rotate() {
        return this;
      }
      invert() {
        return this;
      }
    };
  }

  if (typeof g.DOMPoint === "undefined") {
    g.DOMPoint = class DOMPoint {
      x = 0;
      y = 0;
      z = 0;
      w = 1;
      constructor(x?: number, y?: number, z?: number, w?: number) {
        void x;
        void y;
        void z;
        void w;
      }
    };
  }

  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      constructor(path?: string | object) {
        void path;
      }
    };
  }
}
