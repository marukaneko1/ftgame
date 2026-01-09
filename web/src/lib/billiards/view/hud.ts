// @ts-nocheck
// SECURITY: Use textContent where possible to prevent XSS

export class Hud {
  element: HTMLDivElement
  breakLabel: HTMLSpanElement | null = null
  scoreValue: HTMLSpanElement | null = null

  constructor() {
    this.element = this.getElement("snookerScore")
    // Create child elements for safe content rendering
    if (this.element) {
      this.element.innerHTML = ''; // Clear any existing content
      this.breakLabel = document.createElement('span');
      this.scoreValue = document.createElement('span');
      this.element.appendChild(this.breakLabel);
      this.element.appendChild(document.createElement('br'));
      this.element.appendChild(this.scoreValue);
    }
  }

  updateBreak(score: number) {
    if (this.element) {
      if (score > 0) {
        // SECURITY: Use textContent instead of innerHTML
        if (this.breakLabel) this.breakLabel.textContent = "Break";
        if (this.scoreValue) this.scoreValue.textContent = String(score);
      } else {
        if (this.breakLabel) this.breakLabel.textContent = "";
        if (this.scoreValue) this.scoreValue.textContent = "";
      }
    }
  }

  getElement(id: string): HTMLDivElement {
    return document.getElementById(id)! as HTMLDivElement
  }
}
