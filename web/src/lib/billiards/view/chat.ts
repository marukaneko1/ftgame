// @ts-nocheck
// SECURITY: Use textContent instead of innerHTML to prevent XSS attacks

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class Chat {
  chatoutput: HTMLElement | null
  chatInput: HTMLElement | null
  chatSend: HTMLElement | null
  chatInputText: HTMLInputElement | null
  send

  constructor(send) {
    this.chatoutput = document.getElementById("chatoutput")
    this.chatInputText = document.getElementById(
      "chatinputtext"
    ) as HTMLInputElement
    this.chatSend = document.getElementById("chatsend")
    this.chatSend?.addEventListener("click", this.sendClicked)
    this.send = send
  }

  sendClicked = (_) => {
    this.send(this.chatInputText?.value)
    this.showMessage(this.chatInputText?.value)
  }

  showMessage(msg: string) {
    if (!this.chatoutput || !msg) return;
    
    // SECURITY: Create a text node instead of using innerHTML to prevent XSS
    const messageDiv = document.createElement('div');
    messageDiv.textContent = msg; // textContent automatically escapes HTML
    messageDiv.className = 'chat-message';
    this.chatoutput.appendChild(messageDiv);
    this.updateScroll();
  }

  updateScroll() {
    this.chatoutput &&
      (this.chatoutput.scrollTop = this.chatoutput.scrollHeight)
  }
}
