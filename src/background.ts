import { IMainMessage, Main } from './main';

const main = new Main();

chrome.runtime.onInstalled.addListener(() => {
    main.onBrowserExtensionInstalled();
});

chrome.runtime.onMessage.addListener(
    (message: IMainMessage | { action: string }, sender: chrome.runtime.MessageSender, sendResponse: VoidFunction) => {
        if ('action' in message && message.action === 'open_popup') {
            // Open the extension's popup when the bubble is clicked
            chrome.action.openPopup();
            return;
        }

        main.onBrowserExtensionMessage(message as IMainMessage, sender, sendResponse);
    }
);
