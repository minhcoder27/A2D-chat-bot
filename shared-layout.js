(function () {
  const SOURCE_PAGE = 'login.html';
  const SHARED_STYLESHEET = 'shared-layout.css';
  const AUTH_SESSION_KEY = 'a2d_auth_session';
  const MOBILE_EXPERT_FAB_POSITION_KEY = 'a2d_mobile_expert_fab_position';
  const PROXY_URL = 'https://a2d-chat-proxy.minh-truong-472.workers.dev';
  const URL_DELETE = PROXY_URL + '/delete';

  function cloneIntoRoot(rootId, sourceElement) {
    const root = document.getElementById(rootId);
    if (!root || !sourceElement) {
      return;
    }
    root.replaceWith(sourceElement.cloneNode(true));
  }

  function ensureSharedStylesheet() {
    const existingLink = document.querySelector(`link[href="${SHARED_STYLESHEET}"]`);
    if (existingLink) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = SHARED_STYLESHEET;
    document.head.appendChild(link);
  }

  function getStoredAuthSession() {
    try {
      const rawSession = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!rawSession) {
        return null;
      }

      const sessionData = JSON.parse(rawSession);
      if (!sessionData || !sessionData.email) {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.warn('Cannot restore shared auth session:', error);
      return null;
    }
  }

  function closeSettingsDropdown() {
    const userSettings = document.getElementById('userSettings');
    const dropdown = document.getElementById('settingsDropdown');
    if (dropdown) {
      dropdown.classList.remove('active');
    }
    if (userSettings) {
      userSettings.classList.remove('settings-open');
    }
  }

  function applySharedAuthState() {
    const userSettings = document.getElementById('userSettings');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const sessionData = getStoredAuthSession();
    if (!userSettings) {
      return;
    }

    if (!sessionData) {
      userSettings.style.display = 'none';
      closeSettingsDropdown();
      return;
    }

    userSettings.style.display = 'block';
    if (userEmailDisplay) {
      userEmailDisplay.innerText = sessionData.email;
    }
  }

  function clearSharedAuthSession() {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch (error) {
      console.warn('Cannot clear shared auth session:', error);
    }
  }

  function getMobileExpertFabBounds(fab) {
    const rect = fab.getBoundingClientRect();
    const header = document.getElementById('mainHeader');
    const footer = document.querySelector('body > footer');
    const minLeft = 12;
    const maxLeft = Math.max(minLeft, window.innerWidth - rect.width - 12);
    let minTop = 12;
    let maxTop = Math.max(minTop, window.innerHeight - rect.height - 12);

    if (header) {
      minTop = Math.max(minTop, Math.round(header.getBoundingClientRect().bottom) + 8);
    }

    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      if (footerRect.top < window.innerHeight) {
        maxTop = Math.min(maxTop, Math.max(minTop, Math.round(footerRect.top - rect.height - 12)));
      }
    }

    return { minLeft, maxLeft, minTop, maxTop };
  }

  function applyMobileExpertFabPosition(fab, left, top) {
    const bounds = getMobileExpertFabBounds(fab);
    const nextLeft = Math.min(bounds.maxLeft, Math.max(bounds.minLeft, left));
    const nextTop = Math.min(bounds.maxTop, Math.max(bounds.minTop, top));

    fab.style.left = `${Math.round(nextLeft)}px`;
    fab.style.top = `${Math.round(nextTop)}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';

    return { left: nextLeft, top: nextTop };
  }

  function persistMobileExpertFabPosition(left, top) {
    try {
      localStorage.setItem(MOBILE_EXPERT_FAB_POSITION_KEY, JSON.stringify({
        left: Math.round(left),
        top: Math.round(top)
      }));
    } catch (error) {
      console.warn('Cannot persist expert bubble position:', error);
    }
  }

  function restoreMobileExpertFabPosition(fab) {
    if (!fab || window.innerWidth > 768) {
      return;
    }

    try {
      const rawValue = localStorage.getItem(MOBILE_EXPERT_FAB_POSITION_KEY);
      if (!rawValue) {
        return;
      }

      const parsedValue = JSON.parse(rawValue);
      if (!parsedValue || !Number.isFinite(parsedValue.left) || !Number.isFinite(parsedValue.top)) {
        return;
      }

      applyMobileExpertFabPosition(fab, parsedValue.left, parsedValue.top);
    } catch (error) {
      console.warn('Cannot restore expert bubble position:', error);
    }
  }

  function installMobileExpertFabDrag() {
    const fab = document.querySelector('.mobile-expert-fab');
    if (!fab || fab.dataset.dragReady === 'true') {
      return;
    }

    fab.dataset.dragReady = 'true';

    requestAnimationFrame(function () {
      restoreMobileExpertFabPosition(fab);
    });

    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let hasDragged = false;
    let suppressClick = false;

    fab.addEventListener('pointerdown', function (event) {
      if (window.innerWidth > 768 || event.button !== 0 || event.isPrimary === false) {
        return;
      }

      const rect = fab.getBoundingClientRect();
      const nextPosition = applyMobileExpertFabPosition(fab, rect.left, rect.top);

      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = nextPosition.left;
      originTop = nextPosition.top;
      hasDragged = false;

      if (fab.setPointerCapture) {
        fab.setPointerCapture(event.pointerId);
      }
    });

    fab.addEventListener('pointermove', function (event) {
      if (activePointerId === null || event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!hasDragged && Math.hypot(deltaX, deltaY) > 6) {
        hasDragged = true;
        fab.classList.add('is-dragging');
      }

      if (!hasDragged) {
        return;
      }

      event.preventDefault();
      applyMobileExpertFabPosition(fab, originLeft + deltaX, originTop + deltaY);
    }, { passive: false });

    const finishDrag = function (event) {
      if (activePointerId === null || event.pointerId !== activePointerId) {
        return;
      }

      if (fab.hasPointerCapture && fab.hasPointerCapture(event.pointerId)) {
        fab.releasePointerCapture(event.pointerId);
      }

      activePointerId = null;
      fab.classList.remove('is-dragging');

      if (!hasDragged) {
        return;
      }

      const rect = fab.getBoundingClientRect();
      persistMobileExpertFabPosition(rect.left, rect.top);
      suppressClick = true;

      window.setTimeout(function () {
        suppressClick = false;
      }, 0);
    };

    fab.addEventListener('pointerup', finishDrag);
    fab.addEventListener('pointercancel', finishDrag);

    fab.addEventListener('click', function (event) {
      if (!suppressClick) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    }, true);

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        return;
      }

      const left = parseFloat(fab.style.left);
      const top = parseFloat(fab.style.top);

      if (Number.isFinite(left) && Number.isFinite(top)) {
        const nextPosition = applyMobileExpertFabPosition(fab, left, top);
        persistMobileExpertFabPosition(nextPosition.left, nextPosition.top);
        return;
      }

      restoreMobileExpertFabPosition(fab);
    });
  }

  function installSharedHeaderBehaviors() {
    window.toggleMobileMenu = function () {
      const headerActions = document.getElementById('headerActions');
      if (!headerActions) {
        return;
      }

      headerActions.classList.toggle('show');
    };

    window.toggleSettings = function () {
      const userSettings = document.getElementById('userSettings');
      const dropdown = document.getElementById('settingsDropdown');
      if (!userSettings || !dropdown || userSettings.style.display === 'none') {
        return;
      }

      const isActive = dropdown.classList.toggle('active');
      userSettings.classList.toggle('settings-open', isActive);
    };

    if (!window.__sharedLayoutSettingsListenerBound) {
      document.addEventListener('pointerdown', function (event) {
        const headerActions = document.getElementById('headerActions');
        const mobileMenuButton = event.target && typeof event.target.closest === 'function'
          ? event.target.closest('.mobile-menu-btn')
          : null;
        const modalOverlay = event.target && event.target.classList && event.target.classList.contains('modal-overlay')
          ? event.target
          : null;
        const userSettings = document.getElementById('userSettings');
        const dropdown = document.getElementById('settingsDropdown');
        if (headerActions && window.innerWidth <= 768 && headerActions.classList.contains('show') && !headerActions.contains(event.target) && !mobileMenuButton) {
          headerActions.classList.remove('show');
        }

        if (modalOverlay) {
          modalOverlay.classList.remove('active');
        }

        if (!userSettings || !dropdown) {
          return;
        }

        if (!userSettings.contains(event.target)) {
          closeSettingsDropdown();
        }
      }, true);

      window.__sharedLayoutSettingsListenerBound = true;
    }

    installMobileExpertFabDrag();
  }

  function installSharedAuthActions() {
    window.clearAuthSession = clearSharedAuthSession;

    window.handleLogout = function () {
      clearSharedAuthSession();
      closeSettingsDropdown();
      location.reload();
    };

    window.requestDeleteAccount = async function () {
      const sessionData = getStoredAuthSession();
      const email = sessionData && sessionData.email ? sessionData.email : '';
      if (!email) {
        clearSharedAuthSession();
        location.reload();
        return;
      }

      if (!confirm('Bạn có chắc chắn muốn xóa tài khoản không?')) {
        return;
      }

      try {
        const res = await fetch(URL_DELETE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        clearSharedAuthSession();
        closeSettingsDropdown();
        location.reload();
      } catch (error) {
        console.error('Delete account failed:', error);
        alert('Đã xảy ra lỗi.');
      }
    };
  }

  async function loadSharedLayout() {
    ensureSharedStylesheet();

    const response = await fetch(SOURCE_PAGE, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Cannot load shared layout from login.html');
    }

    const html = await response.text();
    const sourceDoc = new DOMParser().parseFromString(html, 'text/html');
    const sourceHeader = sourceDoc.querySelector('header.app-header');
    const sourceFooter = sourceDoc.querySelector('footer');
    const sourceExpertModal = sourceDoc.querySelector('#expertContactModal');

    if (sourceHeader) {
      const sourceMobileExpertFab = sourceHeader.querySelector('.mobile-expert-fab');
      if (sourceMobileExpertFab) {
        sourceMobileExpertFab.remove();
      }
    }

    cloneIntoRoot('shared-header-root', sourceHeader);
    cloneIntoRoot('shared-footer-root', sourceFooter);
    cloneIntoRoot('shared-expert-modal-root', sourceExpertModal);
    installSharedHeaderBehaviors();
    installSharedAuthActions();
    applySharedAuthState();
  }

  window.sharedLayoutReady = loadSharedLayout().catch(function (error) {
    console.error('Shared layout load failed:', error);
  });
})();
