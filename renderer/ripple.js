(function(){
  'use strict';

  var SELECTOR = 'button, .fab, .plain-icon-btn, .btn, .dropdown__control, .icon-btn';
  var ACTIVE_EVENTS = ['mousedown','touchstart'];
  var RIPPLE_DURATION = 450; // ms

  function isDisabled(el){
    if(!el) return true;
    if(el.hasAttribute('disabled')) return true;
    var ariaDisabled = el.getAttribute('aria-disabled');
    return ariaDisabled === 'true';
  }

  function addRipple(e){
    var target = e.currentTarget;
    if(isDisabled(target)) return;

    // Prevent duplicate mousedown after touchstart on some browsers
    if(e.type === 'touchstart'){
      target.__rippleTouch = true;
      setTimeout(function(){ target.__rippleTouch = false; }, 400);
    } else if(e.type === 'mousedown' && target.__rippleTouch){
      return;
    }

    var rect = target.getBoundingClientRect();
    var isTouch = e.type === 'touchstart';
    var clientX = isTouch ? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
    var clientY = isTouch ? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;

    var x = clientX - rect.left;
    var y = clientY - rect.top;

    // Ripple size should cover the farthest corner
    var maxX = Math.max(x, rect.width - x);
    var maxY = Math.max(y, rect.height - y);
    var radius = Math.sqrt(maxX*maxX + maxY*maxY);
    var size = radius * 2; // diameter

    var span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (x - radius) + 'px';
    span.style.top = (y - radius) + 'px';

    // Attach and animate
    target.appendChild(span);

    // Force reflow to ensure the animation can start
    // eslint-disable-next-line no-unused-expressions
    span.offsetHeight;
    span.classList.add('ripple--animate');

    // Clean up after animation
    var remove = function(){ if(span && span.parentNode){ span.parentNode.removeChild(span); } };
    span.addEventListener('animationend', remove, { once: true });
    // Fallback removal
    setTimeout(remove, RIPPLE_DURATION + 100);
  }

  function enhance(el){
    if(!el || el.__rippleEnhanced) return;
    el.__rippleEnhanced = true;
    // Prepare container for ripple
    el.classList.add('has-ripple');
    // Avoid layout issues for inline elements
    var cs = window.getComputedStyle(el);
    if(cs.position === 'static'){
      el.style.position = 'relative';
    }
    if(cs.overflow === 'visible'){
      el.style.overflow = 'hidden';
    }
    for(var i=0;i<ACTIVE_EVENTS.length;i++){
      el.addEventListener(ACTIVE_EVENTS[i], addRipple, { passive: true });
    }
  }

  function init(){
    var nodes = document.querySelectorAll(SELECTOR);
    nodes.forEach(enhance);

    // Observe dynamically added buttons
    var mo = new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(node){
          if(!(node instanceof Element)) return;
          if(node.matches && node.matches(SELECTOR)) enhance(node);
          node.querySelectorAll && node.querySelectorAll(SELECTOR).forEach(enhance);
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();