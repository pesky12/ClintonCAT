import DOMMessenger from '@/common/helpers/dom-messenger';

DOMMessenger.registerMessageListener();

// Inject the bubble icon styles directly
const injectStyles = () => {
    const styles = `
    .clinton-cat-bubble {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: white;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.3s ease;
      border: 2px solid #ff4500;
      overflow: hidden; /* Ensure content is masked within circle */
    }

    .clinton-cat-bubble:hover {
      transform: scale(1.1);
    }

    .clinton-cat-image {
      width: 48px;
      height: 48px;
      object-fit: contain; /* Ensures the image fits within its container */
      border-radius: 50%; /* Ensure the image itself is circular */
    }

    .clinton-cat-bubble .badge {
      position: absolute;
      display: none; /* Hidden rn, lazy to fix a bug */
      top: -5px;
      right: -5px;
      background-color: #ff4500;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }

    .clinton-cat-tooltip {
      position: absolute;
      bottom: 70px;
      left: 0;
      background-color: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      white-space: nowrap;
      max-width: 250px;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .clinton-cat-bubble:hover .clinton-cat-tooltip {
      opacity: 1;
    }
  `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
};

// Inject styles immediately
injectStyles();

void chrome.runtime.sendMessage({
    domain: window.location.hostname,
    url: window.location.href,
});
