/**
 * PreviewManager – handles preview grid, CSS editing, and separate window.
 */
class PreviewManager {
    constructor(uiManager, codeManager) {
        this.ui = uiManager;
        this.codeManager = codeManager;
        this.oc = document.oc;
        this.cssEditor = null;
    }

    initCssEditor() {
        this.cssEditor = new CSSEditor({
            onApply: (cssText, target) => {
                if (target === this.ui.previewGrid) {
                    this.ui.previewGrid.style.cssText = cssText;
                    this.ui.previewCssTextarea.value = cssText;
                } else if (target && window.tester.editingIndex !== null) {
                    const obj = window.tester.objects[window.tester.editingIndex];
                    if (obj && obj.element === target) {
                        obj.params.style = cssText;
                        obj.element.style.cssText = cssText;
                        this.codeManager.refreshCodeDisplay();
                        window.tester.refreshObjectList();
                    }
                } else if (target && target !== this.ui.previewGrid) {
                    target.style.cssText = cssText;
                }
                window.tester.showMessage('CSS applied successfully', 'info');
            }
        });
    }

    openCssEditorForPreview() {
        this.cssEditor.open(this.ui.previewGrid, (cssText) => {
            this.ui.previewGrid.style.cssText = cssText;
            this.ui.previewCssTextarea.value = cssText;
        });
    }

    copyPreviewCss() {
        let text = this.ui.previewCssTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            this._flashButton(this.ui.btnCopyPreviewCss);
            window.tester.showMessage('Preview CSS copied', 'info');
        });
    }

    applyPreviewCss() {
        let css = this.ui.previewCssTextarea.value;
        this.ui.previewGrid.style.cssText = css;
        window.tester.showMessage('Preview CSS applied', 'info');
    }

    loadPreviewCss() {
        let css = this.ui.previewGrid.style.cssText;
        this.ui.previewCssTextarea.value = css;
        this._flashButton(this.ui.btnLoadPreviewCss);
        window.tester.showMessage('Preview CSS loaded from preview', 'info');
    }

    openSeparateWindow() {
        // Use a separate HTML template file
        let win = window.open('preview-template.html', '_blank', 'width=800,height=600,resizable=yes');
        if (!win) {
            window.tester.showMessage('Popup blocked. Please allow popups for this site.', 'warning');
            return;
        }
        // Pass current preview grid content via localStorage
        localStorage.setItem('previewContent', JSON.stringify({
            html: this.ui.previewGrid.innerHTML,
            style: this.ui.previewGrid.style.cssText,
            childrenStyles: Array.from(this.ui.previewGrid.children).map(child => child.style.cssText)
        }));
        window.tester.showMessage('Separate window opened', 'info');
    }

    _flashButton(btn) {
        btn.classList.add('tester_flash');
        setTimeout(() => btn.classList.remove('tester_flash'), 200);
    }
}