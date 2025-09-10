// content script for snappfood.ir - supports user actions (hide/blur/none) from popup
(() => {
  const SELECTOR_VENDOR = 'a#vendorCard, a[data-sentry-component="VendorCard"]';
  const SELECTOR_PRODUCT = '[data-sentry-component="HorizontalProductCard"]';
  const SELECTOR_PRODUCT_WRAPPER = '#search-vendor-product[data-sentry-component="HorizontalProductCard"]';
  const SELECTOR_BANNER = '[data-sentry-component="Banner"]';
  const AD_MARKER_SELECTOR = '[data-sentry-component="Ads"]';
  const CHECKED_FLAG = 'data-premium-sf-checked';
  const APPLIED_ACTION = 'data-premium-sf-action';
  const SVG_AD_PATH_SNIPPET = 'M19 11.5v3.742';

  // default actions
  let actions = {
    vendor: 'hide',   // 'hide' | 'blur' | 'none'
    product: 'hide',
    banner: 'hide',
    svg: 'hide'
  };

  // load settings from storage
  function loadSettings(cb) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      if (cb) cb();
      return;
    }
    chrome.storage.sync.get({ adActions: actions }, data => {
      actions = Object.assign(actions, data.adActions || {});
      if (cb) cb();
    });
  }

  function mark(el) {
    if (!el) return false;
    if (el.hasAttribute(CHECKED_FLAG)) return false;
    el.setAttribute(CHECKED_FLAG, '1');
    return true;
  }

  function applyAction(el, type) {
    if (!el) return;
    const prev = el.getAttribute(APPLIED_ACTION);
    if (prev === type) {
      // still mark as checked if not yet
      if (!el.hasAttribute(CHECKED_FLAG)) el.setAttribute(CHECKED_FLAG, '1');
      return;
    }
    // remove previous classes
    el.classList.remove('sf-hidden-by-ext', 'sf-blur-by-ext');
    if (type === 'hide') el.classList.add('sf-hidden-by-ext');
    else if (type === 'blur') el.classList.add('sf-blur-by-ext');
    // write applied action and checked flag
    el.setAttribute(APPLIED_ACTION, type);
    el.setAttribute(CHECKED_FLAG, '1');
  }

  function svgIsAd(svg) {
    if (!svg) return false;
    try {
      const path = svg.querySelector('path');
      const d = path && path.getAttribute('d');
      if (d && d.indexOf('M19 11.5') !== -1) return true;
      if (svg.outerHTML && svg.outerHTML.indexOf(SVG_AD_PATH_SNIPPET) !== -1) return true;
    } catch (e) { return false; }
    return false;
  }

  // process a node and its relevant descendants (limited scope)
  function processNode(node) {
    if (!node || node.nodeType !== 1) return;

    // vendor direct match
    if (node.matches && node.matches(SELECTOR_VENDOR)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        const isMarked = node.querySelector(AD_MARKER_SELECTOR) !== null;
        const hasSvgAd = Array.from(node.querySelectorAll('svg')).some(svgIsAd);
        if (isMarked || hasSvgAd) {
          applyAction(node, actions.vendor || 'hide');
        } else {
          // mark as checked to avoid reprocessing repeatedly
          mark(node);
        }
      }
    }

    // specific product wrapper id
    if (node.matches && node.matches(SELECTOR_PRODUCT_WRAPPER)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        const hasSvgAd = Array.from(node.querySelectorAll('svg')).some(svgIsAd);
        if (hasSvgAd) applyAction(node, actions.product || 'hide');
        else mark(node);
      }
    }

    // generic product card
    if (node.matches && node.matches(SELECTOR_PRODUCT)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        const hasSvgAd = Array.from(node.querySelectorAll('svg')).some(svgIsAd);
        if (hasSvgAd) applyAction(node, actions.product || 'hide');
        else mark(node);
      }
    }

    // banner
    if (node.matches && node.matches(SELECTOR_BANNER)) {
      if (!node.hasAttribute(CHECKED_FLAG)) {
        const img = node.querySelector('img[alt]');
        if (img && typeof img.alt === 'string' && img.alt.toLowerCase().includes('ads_banner')) {
          applyAction(node, actions.banner || 'hide');
        } else mark(node);
      }
    }

    // check descendants for the same selectors but limit the query to our selectors
    try {
      const q = SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER;
      const found = node.querySelectorAll ? node.querySelectorAll(q) : [];
      for (let el of found) processNode(el);
    } catch (e) { /* ignore */ }

    // scan svgs inside this node (limited)
    const svgs = node.querySelectorAll ? node.querySelectorAll('svg') : [];
    if (svgs && svgs.length) {
      for (let svg of svgs) {
        if (!svgIsAd(svg)) continue;
        // prefer small nearest targets
        const vendorAncestor = svg.closest && svg.closest('a[data-sentry-component="VendorCard"], a#vendorCard');
        if (vendorAncestor) { applyAction(vendorAncestor, actions.vendor || 'hide'); break; }
        const specificWrapper = svg.closest && svg.closest('#search-vendor-product[data-sentry-component="HorizontalProductCard"]');
        if (specificWrapper) { applyAction(specificWrapper, actions.product || 'hide'); break; }
        const productAncestor = svg.closest && svg.closest('[data-sentry-component="HorizontalProductCard"]');
        if (productAncestor) { applyAction(productAncestor, actions.product || 'hide'); break; }
        const parent = svg.parentElement;
        if (parent) { applyAction(parent, actions.svg || 'hide'); break; }
      }
    }
  }

  // small initial scan (limited)
  function initialScan() {
    try {
      const q = SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER;
      document.querySelectorAll(q).forEach(el => processNode(el));
      // also scan svgs not inside above selectors
      document.querySelectorAll('svg').forEach(svg => {
        if (svgIsAd(svg)) processNode(svg);
      });
    } catch (e) { /* ignore */ }
  }

  // re-apply actions when settings change
  function reapplyAll() {
    try {
      const q = SELECTOR_VENDOR + ',' + SELECTOR_PRODUCT_WRAPPER + ',' + SELECTOR_PRODUCT + ',' + SELECTOR_BANNER;
      document.querySelectorAll(q).forEach(el => {
        // remove applied action and checked flag to let processNode re-evaluate
        el.removeAttribute(CHECKED_FLAG);
        el.removeAttribute(APPLIED_ACTION);
        el.classList.remove('sf-hidden-by-ext', 'sf-blur-by-ext');
        processNode(el);
      });
      // also re-check svgs
      document.querySelectorAll('svg').forEach(svg => {
        if (svgIsAd(svg)) processNode(svg);
      });
    } catch (e) { /* ignore */ }
  }

  // observe added nodes only, schedule idle processing
  const mutationQueue = new Set();
  let scheduled = false;
  const idle = typeof requestIdleCallback === 'function'
    ? cb => requestIdleCallback(cb, { timeout: 200 })
    : cb => setTimeout(cb, 60);

  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) mutationQueue.add(n);
      }
    }
    if (!scheduled) {
      scheduled = true;
      idle(() => {
        scheduled = false;
        const nodes = Array.from(mutationQueue);
        mutationQueue.clear();
        if (document.visibilityState === 'hidden') return;
        nodes.forEach(n => processNode(n));
      });
    }
  });

  function startObserver() {
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true, attributes: false });
    } else {
      const docObs = new MutationObserver((_, o) => {
        if (document.body) {
          o.disconnect();
          mo.observe(document.body, { childList: true, subtree: true, attributes: false });
        }
      });
      docObs.observe(document.documentElement, { childList: true });
    }
  }

  // storage change listener to update actions dynamically
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.adActions) {
        actions = Object.assign(actions, changes.adActions.newValue || {});
        // reapply in idle
        idle(reapplyAll);
      }
    });
  }

  // SPA navigation hooks - do a small scan on navigation
  const origPush = history.pushState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    idle(() => {
      initialScan();
    });
  };
  window.addEventListener('popstate', () => idle(initialScan));
  window.addEventListener('hashchange', () => idle(initialScan));

  // init
  loadSettings(() => {
    idle(initialScan);
    startObserver();
  });

  window.addEventListener('beforeunload', () => mo.disconnect());
})();