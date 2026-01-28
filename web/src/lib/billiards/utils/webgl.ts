// @ts-nocheck
import { WebGLRenderer } from "three"

export function renderer(element: HTMLElement) {
  // Check if we're in a browser environment (SSR check)
  if (typeof window === "undefined" || !element) {
    console.warn("[WebGL] Renderer not created - window or element not available")
    return undefined
  }

  try {
    // Check if element is a canvas
    const isCanvas = element instanceof HTMLCanvasElement
    
    let rendererOptions: any = {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    }
    
    if (isCanvas) {
      // If element is a canvas, use it directly
      rendererOptions.canvas = element
    }
    
    const renderer = new WebGLRenderer(rendererOptions)
    renderer.shadowMap.enabled = false
    renderer.autoClear = true
    
    const width = element.offsetWidth || element.clientWidth || 800
    const height = element.offsetHeight || element.clientHeight || 400
    
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0d5d2a, 1)  // Pool table green
    
    // If element is not a canvas, append the renderer's DOM element
    if (!isCanvas) {
      element.appendChild(renderer.domElement)
    }
    
    console.log("[WebGL] Renderer created successfully", { width, height, isCanvas })
    return renderer
  } catch (error) {
    console.error("[WebGL] Failed to create renderer:", error)
    return undefined
  }
}
