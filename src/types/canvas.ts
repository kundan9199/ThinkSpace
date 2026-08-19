/**
 * ThinkSpace — Canvas Scene Model & Type Definitions
 * 
 * Defines the discriminated union scene model for all supported canvas elements,
 * tool modes, camera viewport state, and render contexts.
 */

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "freehand"
  | "text";

export type ToolType =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "freehand"
  | "text"
  | "eraser";

export interface Point {
  x: number;
  y: number;
}

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type Sloppiness = "precise" | "normal" | "sketchy";
export type Roundness = "sharp" | "rounded";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle?: StrokeStyle;
  sloppiness?: Sloppiness;
  roundness?: Roundness;
  opacity: number;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  cornerRadius?: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface LineElement extends BaseElement {
  type: "line";
  x2: number;
  y2: number;
}

export interface ArrowElement extends BaseElement {
  type: "arrow";
  x2: number;
  y2: number;
  headSize?: number;
}

export interface FreehandElement extends BaseElement {
  type: "freehand";
  points: Point[];
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: "normal" | "bold" | string;
  italic?: boolean;
  underline?: boolean;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
}

export type CanvasElement =
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | FreehandElement
  | TextElement;

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  dpr: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}
