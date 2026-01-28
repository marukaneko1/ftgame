// @ts-nocheck
import { Scene, WebGLRenderer, Frustum, Matrix4, AmbientLight, DirectionalLight } from "three"
import { Camera } from "./camera"
import { AimEvent } from "../events/aimevent"
import { Table } from "../model/table"
import { Grid } from "./grid"
import { renderer } from "../utils/webgl"
import { Assets } from "./assets"
import { Snooker } from "../controller/rules/snooker"

export class View {
  readonly scene = new Scene()
  private readonly renderer: WebGLRenderer | undefined
  camera: Camera
  windowWidth = 1
  windowHeight = 1
  readonly element
  table: Table
  loadAssets = true
  assets: Assets
  constructor(element, table, assets) {
    this.element = element
    this.table = table
    this.assets = assets
    console.log("[View] Creating renderer for element:", element?.tagName, element?.offsetWidth, "x", element?.offsetHeight)
    this.renderer = renderer(element)
    if (!this.renderer) {
      console.error("[View] WebGL renderer could not be created!")
    } else {
      console.log("[View] Renderer created successfully")
    }
    const aspectRatio = element ? (element.offsetWidth || 800) / (element.offsetHeight || 400) : 2
    console.log("[View] Camera aspect ratio:", aspectRatio)
    this.camera = new Camera(aspectRatio)
    this.initialiseScene()
  }

  update(elapsed, aim: AimEvent) {
    this.camera.update(elapsed, aim)
  }

  sizeChanged() {
    return (
      this.windowWidth != this.element?.offsetWidth ||
      this.windowHeight != this.element?.offsetHeight
    )
  }

  updateSize() {
    const hasChanged = this.sizeChanged()
    if (hasChanged) {
      this.windowWidth = this.element?.offsetWidth
      this.windowHeight = this.element?.offsetHeight
    }
    return hasChanged
  }

  render() {
    if (this.isInMotionNotVisible()) {
      this.camera.suggestMode(this.camera.topView)
    }
    this.renderCamera(this.camera)
  }

  renderCamera(cam) {
    if (this.updateSize()) {
      const width = this.windowWidth
      const height = this.windowHeight

      this.renderer?.setSize(width, height)
      this.renderer?.setViewport(0, 0, width, height)
      this.renderer?.setScissor(0, 0, width, height)
      this.renderer?.setScissorTest(true)

      cam.camera.aspect = width / height
    }
    cam.camera.updateProjectionMatrix()
    this.renderer?.render(this.scene, cam.camera)
  }

  private initialiseScene() {
    console.log("[View] Initializing scene...")
    
    // Add stronger ambient light for better visibility
    const ambientLight = new AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)
    
    // Add directional light from above
    const dirLight = new DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(0, 0, 10)
    this.scene.add(dirLight)
    
    if (this.assets.background) {
      console.log("[View] Adding background to scene")
      this.scene.add(this.assets.background)
    }
    
    if (this.assets.table) {
      console.log("[View] Adding table to scene")
      this.scene.add(this.assets.table)
      this.table.mesh = this.assets.table
    } else {
      console.warn("[View] No table asset available!")
    }
    
    if (this.assets.rules.asset() !== Snooker.tablemodel) {
      console.log("[View] Adding grid lines")
      this.scene.add(new Grid().generateLineSegments())
    }
    
    console.log("[View] Scene initialized with", this.scene.children.length, "objects")
  }

  ballToCheck = 0

  isInMotionNotVisible() {
    const frustrum = this.viewFrustrum()
    const b = this.table.balls[this.ballToCheck++ % this.table.balls.length]
    return b.inMotion() && !frustrum.intersectsObject(b.ballmesh.mesh)
  }

  viewFrustrum() {
    const c = this.camera.camera
    const frustrum = new Frustum()
    frustrum.setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse)
    )
    return frustrum
  }
}
