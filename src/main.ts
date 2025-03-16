import { getDomainWithoutSuffix, parse } from 'tldts';
import ContentScanner from '@/common/services/content-scanner';
import { IScanParameters } from '@/common/services/content-scanner.types';
import Preferences from '@/common/services/preferences';
import DOMMessenger from '@/common/helpers/dom-messenger';
import { CATWikiPageSearchResults, IPageEntry, PageEntry, PagesDB } from '@/database';
import ChromeLocalStorage from '@/storage/chrome/chrome-local-storage';
import ChromeSyncStorage from '@/storage/chrome/chrome-sync-storage';
import StorageCache from '@/storage/storage-cache';

export interface IMainMessage {
    badgeText: string;
    domain: string;
    url: string;
}

export class Main {
    storageCache: StorageCache;
    pagesDatabase: PagesDB;
    contentScanner: ContentScanner;

    constructor() {
        // TODO: need a ChromeLocalStorage for pages db
        this.pagesDatabase = new PagesDB();
        this.pagesDatabase.initDefaultPages();
        this.storageCache = new StorageCache(this.pagesDatabase);
        this.contentScanner = new ContentScanner();
    }

    indicateStatus() {
        void chrome.action.setBadgeText({
            text: Preferences.isEnabled.value ? 'on' : 'off',
        });
    }

    /**
     * Display how many pages were found by updating the badge text and adding a bubble icon
     */
    indicateCATPages(pages: CATWikiPageSearchResults): void {
        // Update badge text with total pages found - ensure it's a string
        void chrome.action.setBadgeText({ text: String(pages.totalPagesFound) });
        console.log(pages);

        // Don't proceed if no pages were found
        if (pages.totalPagesFound <= 0) {
            return;
        }

        // Get the first page entry to display in tooltip
        const firstPageEntry = pages.pageEntries[0];

        // Create a bubble icon at the bottom of the page
        this.createBubbleIcon(pages.totalPagesFound, firstPageEntry.popupText || 'CAT Pages found', firstPageEntry);
    }

    /**
     * Create a bubble icon on the current page
     */
    private createBubbleIcon(pagesCount: number, tooltipText: string, pageEntry?: IPageEntry): void {
        // Get the current active tab to inject the bubble into
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0].id) {
                console.error('No active tab found');
                return;
            }

            const tabId = tabs[0].id;
            // Get the page URL if entry exists
            const pageUrl =
                pageEntry instanceof PageEntry
                    ? pageEntry.url()
                    : pageEntry
                      ? PageEntry.WIKI_URL + pageEntry.pageId.toString()
                      : undefined;

            // Check if the bubble already exists
            chrome.scripting.executeScript(
                {
                    target: { tabId },
                    func: () => {
                        return document.getElementById('clinton-cat-bubble');
                    },
                },
                (results) => {
                    const bubbleExists = results[0].result;

                    if (bubbleExists) {
                        // Update the existing bubble
                        chrome.scripting.executeScript({
                            target: { tabId },
                            func: (_count: string, tooltip: string, pageUrl?: string) => {
                                const bubble = document.getElementById('clinton-cat-bubble');
                                if (bubble) {
                                    const tooltipElement = bubble.querySelector('.clinton-cat-tooltip');
                                    if (tooltipElement) {
                                        tooltipElement.textContent = tooltip;
                                    }

                                    if (pageUrl) {
                                        bubble.setAttribute('data-page-url', pageUrl);
                                    }
                                }
                            },
                            args: [pagesCount.toString(), tooltipText, pageUrl],
                        });
                        return;
                    }

                    // Create a new bubble
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: (_count: string, tooltip: string, imageUrl: string, pageUrl?: string) => {
                            // Create the bubble container
                            const bubble = document.createElement('div');
                            bubble.id = 'clinton-cat-bubble';
                            bubble.className = 'clinton-cat-bubble';

                            // Store the page URL as a data attribute if available
                            if (pageUrl) {
                                bubble.setAttribute('data-page-url', pageUrl);
                            }

                            // Create the Clinton cat image
                            const catImage = document.createElement('img');
                            catImage.src = imageUrl;
                            catImage.alt = 'ClintonCAT';
                            catImage.className = 'clinton-cat-image';

                            // Create the count badge
                            // const badge = document.createElement('div');
                            // badge.className = 'badge';
                            // badge.textContent = count;

                            // Create the tooltip
                            const tooltipElement = document.createElement('div');
                            tooltipElement.className = 'clinton-cat-tooltip';
                            tooltipElement.textContent = tooltip;

                            // Add click event to navigate to the first found page
                            bubble.addEventListener('click', () => {
                                const url = bubble.getAttribute('data-page-url');
                                if (url) {
                                    window.open(url, '_blank');
                                }
                            });

                            // Assemble the bubble
                            bubble.appendChild(catImage);
                            // bubble.appendChild(badge);
                            bubble.appendChild(tooltipElement);

                            // Add the bubble to the page
                            document.body.appendChild(bubble);
                        },
                        args: [
                            pagesCount.toString(),
                            tooltipText,
                            chrome.runtime.getURL('icons/clinton48.png'),
                            pageUrl,
                        ],
                    });
                }
            );
        });
    }

    /**
     * Called when the extension wants to change the action badge text manually.
     */
    onBadgeTextUpdate(text: string): void {
        void chrome.action.setBadgeText({ text });
    }

    checkDomainIsExcluded(domain: string): boolean {
        for (const excluded of Preferences.domainExclusions.value) {
            if (!parse(excluded, { allowPrivateDomains: true }).domain) {
                console.error(`Invalid domain in exclusions: ${excluded}`);
                continue;
            }
            const excludedParsed = parse(excluded, { allowPrivateDomains: true });
            if (excludedParsed.domain == domain.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Called when a page (tab) has finished loading.
     * Scans the domain and in-page contents, merges results,
     * and indicates how many CAT pages were found.
     */
    async onPageLoaded(unparsedDomain: string, url: string): Promise<void> {
        if (!parse(unparsedDomain, { allowPrivateDomains: true }).domain) {
            throw new Error('onPageLoaded received an invalid url');
        }
        const parsedDomain = parse(unparsedDomain, { allowPrivateDomains: true });
        const domain = parsedDomain.domain ?? '';
        console.log('Domain:', domain);

        if (this.checkDomainIsExcluded(domain)) {
            console.log('Domain skipped, was excluded');
            this.indicateStatus();
            return;
        }

        const scannerParameters: IScanParameters = {
            domain: domain.toLowerCase(),
            mainDomain: getDomainWithoutSuffix(unparsedDomain, { allowPrivateDomains: true }) ?? '',
            url: url,
            pagesDb: this.pagesDatabase,
            dom: new DOMMessenger(),
            notify: (results) => this.indicateCATPages(results),
        };

        await this.contentScanner.checkPageContents(scannerParameters);
    }

    /**
     * Called when the extension is installed.
     * Initializes default settings and indicates current status.
     */
    onBrowserExtensionInstalled(): void {
        console.log('ClintonCAT Extension Installed');
        Preferences.initDefaults(new ChromeSyncStorage(), new ChromeLocalStorage()).then(() => {
            Preferences.dump();
            this.indicateStatus();
        });
    }

    /**
     * Called when we receive a message from elsewhere in the extension
     * (e.g., content script or popup).
     */
    onBrowserExtensionMessage(
        message: IMainMessage,
        _sender: chrome.runtime.MessageSender,
        _sendResponse: VoidFunction
    ): void {
        void (async () => {
            await Preferences.initDefaults(new ChromeSyncStorage(), new ChromeLocalStorage());
            Preferences.dump();

            if (message.badgeText) {
                this.onBadgeTextUpdate(message.badgeText);
            } else if (!Preferences.isEnabled.value) {
                this.indicateStatus();
            } else if (message.domain) {
                await this.onPageLoaded(message.domain, message.url);
            }
        })();
    }
}
