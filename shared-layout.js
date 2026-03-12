(function () {
  const SOURCE_PAGE = 'login.html';

  function cloneIntoRoot(rootId, sourceElement) {
    const root = document.getElementById(rootId);
    if (!root || !sourceElement) {
      return;
    }
    root.replaceWith(sourceElement.cloneNode(true));
  }

  async function loadSharedLayout() {
    const response = await fetch(SOURCE_PAGE, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Cannot load shared layout from login.html');
    }

    const html = await response.text();
    const sourceDoc = new DOMParser().parseFromString(html, 'text/html');
    const sourceHeader = sourceDoc.querySelector('header.app-header');
    const sourceFooter = sourceDoc.querySelector('footer');

    cloneIntoRoot('shared-header-root', sourceHeader);
    cloneIntoRoot('shared-footer-root', sourceFooter);
  }

  window.sharedLayoutReady = loadSharedLayout().catch(function (error) {
    console.error('Shared layout load failed:', error);
  });
})();
