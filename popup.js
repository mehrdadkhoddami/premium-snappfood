// popup script - load and save ad action settings
const defaultActions = {
  vendorRate: 'hide',
  vendorReview: 'hide',
  vendorTopRightBadge: 'transparent',
  vendor: 'blur',
  product: 'blur',
  banner: 'blur',
  svg: 'blur'
};

function $(id) { return document.getElementById(id); }

function load() {
  if (!chrome || !chrome.storage) {
    applyDefaults();
    return;
  }
  chrome.storage.sync.get({ premiumSFActions: defaultActions }, data => {
    const a = data.premiumSFActions || defaultActions;
    $('vendorRateSelect').value = a.vendorRate || defaultActions.vendorRate;
    $('vendorReviewSelect').value = a.vendorReview || defaultActions.vendorReview;
    $('vendorTopRightBadge').value = a.vendorTopRightBadge || defaultActions.vendorTopRightBadge;
    $('vendorSelect').value = a.vendor || defaultActions.vendor;
    $('productSelect').value = a.product || defaultActions.product;
    $('bannerSelect').value = a.banner || defaultActions.banner;
    $('svgSelect').value = a.svg || defaultActions.svg;
  });
}

function save() {
  const a = {
    vendorRate: $('vendorRateSelect').value,
    vendorReview: $('vendorReviewSelect').value,
    vendorTopRightBadge: $('vendorTopRightBadgeSelect').value,
    vendor: $('vendorSelect').value,
    product: $('productSelect').value,
    banner: $('bannerSelect').value,
    svg: $('svgSelect').value
  };
  if (!chrome || !chrome.storage) return;
  chrome.storage.sync.set({ premiumSFActions: a });
}

// set defaults if storage unavailable
function applyDefaults() {
  $('vendorRateSelect').value = defaultActions.vendorRate;
  $('vendorReviewSelect').value = defaultActions.vendorReview;
  $('vendorTopRightBadgeSelect').value = defaultActions.vendorTopRightBadge;
  $('vendorSelect').value = defaultActions.vendor;
  $('productSelect').value = defaultActions.product;
  $('bannerSelect').value = defaultActions.banner;
  $('svgSelect').value = defaultActions.svg;
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  ['vendorRateSelect','vendorReviewSelect','vendorTopRightBadgeSelect','vendorSelect','productSelect','bannerSelect','svgSelect'].forEach(id => {
    const el = $(id);
    el.addEventListener('change', () => {
      save();
    });
  });
});