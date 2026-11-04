/**
 * Jinker loader: one parser-blocking script tag loads the core, shared modules and every widget in order.
 * Usage: <script src="web/js/Jinker.js"></script> without async or defer.
 */
class JinkerLoader {
    static FILES = [
        'widgets/ThemeManager.js',
        'widgets/WidgetBase.js',
        'widgets/WidgetRegistry.js',
        'ObjectCreator.js',
        'widgets/MessageBox.js',
        'widgets/PopupOverlay.js',
        'widgets/CollapsibleSection.js',
        'widgets/AppStore/AppStore.js',
        'widgets/InputWithClr/InputWithClr.js',
        'widgets/ToggleSwitch/ToggleSwitch.js',
        'widgets/ProgressBar/ProgressBar.js',
        'widgets/HintPopup/HintPopup.js',
        'widgets/ContextMenu/ContextMenu.js',
        'widgets/UserPrompt/UserPrompt.js',
        'widgets/ListSelector/ListSelector.js',
        'widgets/AutoComplete/AutoComplete.js',
        'widgets/IterableEditor/IterableEditor.js',
        'widgets/DynamicFilter/DynamicFilter.js',
        'widgets/Changelog/Changelog.js',
        'widgets/SplitPane/SplitPane.js',
        'widgets/DockWorkspace/DockWorkspace.js',
        'widgets/TabbedContainer/TabbedContainer.js',
        'widgets/QueueTray/QueueTray.js',
        'widgets/TickerBanner/TickerBanner.js',
        'widgets/AnimatedGifButton/AnimatedGifButton.js',
        'widgets/OutputLogger/OutputLogger.js',
        'widgets/Table/Table.js',
        'widgets/GuidedTour/GuidedTour.js'
    ];

    /**
     * Writes a script tag per library file, resolved relative to this loader's own URL.
     */
    static load() {
        let base_url = document.currentScript.src.replace(/[^/]*$/, '');
        window.JINKER_BASE_URL = base_url;
        for (let file of JinkerLoader.FILES) {
            document.write('<script src="' + base_url + file + '"><\/script>');
        }
    }
}

JinkerLoader.load();
