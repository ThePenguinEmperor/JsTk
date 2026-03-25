/**
 * CodeManager – manages code generation, copy, load, and save.
 */
class CodeManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.objects = []; // will be set from outside
        this.oc = document.oc;
    }

    setObjects(objects) {
        this.objects = objects;
        this.refreshCodeDisplay();
    }

    refreshCodeDisplay() {
        let lines = [];
        for (let obj of this.objects) {
            let parentRef = this._getParentReference(obj.params.parent);
            let params = { ...obj.params };
            delete params.parent;
            let paramStrings = [];
            paramStrings.push(`parent: ${parentRef}`);
            if (params.row !== undefined) paramStrings.push(`row: ${params.row}`);
            if (params.col !== undefined) paramStrings.push(`col: ${params.col}`);
            if (params.sticky) paramStrings.push(`sticky: '${params.sticky}'`);
            if (params.rowSpan) paramStrings.push(`rowSpan: ${params.rowSpan}`);
            if (params.colSpan) paramStrings.push(`colSpan: ${params.colSpan}`);
            if (params.id) paramStrings.push(`id: '${params.id}'`);
            if (params.class_name) paramStrings.push(`class_name: '${params.class_name}'`);
            if (params.style) paramStrings.push(`style: '${params.style}'`);
            if (params.text !== undefined) paramStrings.push(`text: '${params.text}'`);
            if (params.value !== undefined) paramStrings.push(`value: '${params.value}'`);
            if (params.padx !== undefined) paramStrings.push(`padx: ${params.padx}`);
            if (params.pady !== undefined) paramStrings.push(`pady: ${params.pady}`);
            if (params.ipadx !== undefined) paramStrings.push(`ipadx: ${params.ipadx}`);
            if (params.ipady !== undefined) paramStrings.push(`ipady: ${params.ipady}`);

            let method = obj.method_name;
            if (obj.tag === 'div' && method === 'object_generate') {
                lines.push(`oc.object_generate('div', { ${paramStrings.join(', ')} });`);
            } else if (obj.tag === 'collapsible' || obj.tag === 'tabs') {
                lines.push(`// Custom widget: ${obj.tag} - see implementation in Tester.js`);
            } else {
                lines.push(`oc.${method}({ ${paramStrings.join(', ')} });`);
            }
        }
        this.ui.codeDisplay.value = lines.join('\n');
    }

    copyCode() {
        let text = this.ui.codeDisplay.value;
        navigator.clipboard.writeText(text).then(() => {
            this._flashButton(this.ui.btnCopyCode);
            window.tester.showMessage('Code copied to clipboard', 'info');
        });
    }

    loadCode() {
        let code = this.ui.codeDisplay.value;
        if (!code.trim()) {
            window.tester.showMessage('No code to load', 'warning');
            return;
        }
        window.tester.clearPreview();
        try {
            let fn = new Function('oc', 'document', code);
            fn(this.oc, document);
            window.tester.syncObjectsFromDom();
            window.tester.showMessage('Code loaded successfully', 'info');
        } catch (e) {
            window.tester.showMessage('Error executing code: ' + e.message, 'error');
        }
    }

    saveCodeToFile() {
        let text = this.ui.codeDisplay.value;
        let blob = new Blob([text], { type: 'text/javascript' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'object_creator_code.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.tester.showMessage('Code saved to file', 'info');
    }

    _getParentReference(parentEl) {
        if (parentEl === this.ui.previewGrid) {
            return 'document.getElementById(\'previewGrid\')';
        } else if (parentEl.id) {
            return `document.getElementById('${parentEl.id}')`;
        } else if (parentEl._tempId) {
            return '/* parent element without id */ null';
        }
        return '/* unknown parent */ null';
    }

    _flashButton(btn) {
        btn.classList.add('tester_flash');
        setTimeout(() => btn.classList.remove('tester_flash'), 200);
    }
}