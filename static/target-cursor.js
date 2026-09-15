(function(){
  const state = {
    cursorEl: null,
    corners: [],
    dotEl: null,
    spinTl: null,
    activeTarget: null,
    currentTargetMove: null,
    currentLeaveHandler: null,
    isAnimatingToTarget: false,
    resumeTimeout: null,
    originalCursor: ''
  };

  const constants = {
    borderWidth: 3,
    cornerSize: 12,
    parallaxStrength: 0.00005
  };

  function createDom() {
    const wrapper = document.createElement('div');
    wrapper.className = 'target-cursor-wrapper';

    const dot = document.createElement('div');
    dot.className = 'target-cursor-dot';

    const tl = document.createElement('div'); tl.className = 'target-cursor-corner corner-tl';
    const tr = document.createElement('div'); tr.className = 'target-cursor-corner corner-tr';
    const br = document.createElement('div'); br.className = 'target-cursor-corner corner-br';
    const bl = document.createElement('div'); bl.className = 'target-cursor-corner corner-bl';

    wrapper.appendChild(dot);
    wrapper.appendChild(tl);
    wrapper.appendChild(tr);
    wrapper.appendChild(br);
    wrapper.appendChild(bl);

    document.body.appendChild(wrapper);

    state.cursorEl = wrapper;
    state.dotEl = dot;
    state.corners = [tl, tr, br, bl];
  }

  function moveCursor(x, y) {
    if (!state.cursorEl) return;
    gsap.to(state.cursorEl, { x, y, duration: 0.1, ease: 'power3.out' });
  }

  function createSpinTimeline(spinDuration) {
    if (state.spinTl) state.spinTl.kill();
    state.spinTl = gsap.timeline({ repeat: -1 }).to(state.cursorEl, { rotation: '+=360', duration: spinDuration, ease: 'none' });
  }

  function cleanupTarget(target) {
    if (!target) return;
    if (state.currentTargetMove) {
      target.removeEventListener('mousemove', state.currentTargetMove);
    }
    if (state.currentLeaveHandler) {
      target.removeEventListener('mouseleave', state.currentLeaveHandler);
    }
    state.currentTargetMove = null;
    state.currentLeaveHandler = null;
  }

  function initHandlers({ targetSelector, spinDuration, hideDefaultCursor }) {
    state.originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = 'none';

    gsap.set(state.cursorEl, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    createSpinTimeline(spinDuration);

    const moveHandler = e => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!state.activeTarget || !state.cursorEl) return;
      const mouseX = gsap.getProperty(state.cursorEl, 'x');
      const mouseY = gsap.getProperty(state.cursorEl, 'y');
      const element = document.elementFromPoint(mouseX, mouseY);
      const isOver = element && (element === state.activeTarget || element.closest(targetSelector) === state.activeTarget);
      if (!isOver && state.currentLeaveHandler) state.currentLeaveHandler();
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const mouseDownHandler = () => {
      if (!state.dotEl) return;
      gsap.to(state.dotEl, { scale: 0.7, duration: 0.3 });
      gsap.to(state.cursorEl, { scale: 0.9, duration: 0.2 });
    };
    const mouseUpHandler = () => {
      if (!state.dotEl) return;
      gsap.to(state.dotEl, { scale: 1, duration: 0.3 });
      gsap.to(state.cursorEl, { scale: 1, duration: 0.2 });
    };
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    const enterHandler = e => {
      let target = null;
      let current = e.target;
      while (current && current !== document.body) {
        if (current.matches && current.matches(targetSelector)) {
          target = current; break;
        }
        current = current.parentElement;
      }
      if (!target || state.activeTarget === target) return;

      if (state.activeTarget) cleanupTarget(state.activeTarget);
      if (state.resumeTimeout) { clearTimeout(state.resumeTimeout); state.resumeTimeout = null; }

      state.activeTarget = target;
      state.corners.forEach(c => gsap.killTweensOf(c));

      gsap.killTweensOf(state.cursorEl, 'rotation');
      state.spinTl && state.spinTl.pause();
      gsap.set(state.cursorEl, { rotation: 0 });

      const updateCorners = (mouseX, mouseY) => {
        const rect = target.getBoundingClientRect();
        const cRect = state.cursorEl.getBoundingClientRect();
        const cx = cRect.left + cRect.width / 2;
        const cy = cRect.top + cRect.height / 2;
        const [tlc, trc, brc, blc] = state.corners;
        const { borderWidth, cornerSize, parallaxStrength } = constants;

        let tlOffset = { x: rect.left - cx - borderWidth, y: rect.top - cy - borderWidth };
        let trOffset = { x: rect.right - cx + borderWidth - cornerSize, y: rect.top - cy - borderWidth };
        let brOffset = { x: rect.right - cx + borderWidth - cornerSize, y: rect.bottom - cy + borderWidth - cornerSize };
        let blOffset = { x: rect.left - cx - borderWidth, y: rect.bottom - cy + borderWidth - cornerSize };

        if (mouseX !== undefined && mouseY !== undefined) {
          const tx = rect.left + rect.width / 2;
          const ty = rect.top + rect.height / 2;
          const ox = (mouseX - tx) * parallaxStrength;
          const oy = (mouseY - ty) * parallaxStrength;
          tlOffset.x += ox; tlOffset.y += oy;
          trOffset.x += ox; trOffset.y += oy;
          brOffset.x += ox; brOffset.y += oy;
          blOffset.x += ox; blOffset.y += oy;
        }

        const tl = gsap.timeline();
        const corners = [tlc, trc, brc, blc];
        const offsets = [tlOffset, trOffset, brOffset, blOffset];
        corners.forEach((corner, i) => {
          tl.to(corner, { x: offsets[i].x, y: offsets[i].y, duration: 0.2, ease: 'power2.out' }, 0);
        });
      };

      state.isAnimatingToTarget = true;
      updateCorners();
      setTimeout(() => { state.isAnimatingToTarget = false; }, 1);

      let moveThrottle = null;
      const targetMove = ev => {
        if (moveThrottle || state.isAnimatingToTarget) return;
        moveThrottle = requestAnimationFrame(() => {
          updateCorners(ev.clientX, ev.clientY);
          moveThrottle = null;
        });
      };

      const leaveHandler = () => {
        state.activeTarget = null;
        state.isAnimatingToTarget = false;
        const corners = state.corners;
        gsap.killTweensOf(corners);
        const positions = [
          { x: -constants.cornerSize * 1.5, y: -constants.cornerSize * 1.5 },
          { x: constants.cornerSize * 0.5, y: -constants.cornerSize * 1.5 },
          { x: constants.cornerSize * 0.5, y: constants.cornerSize * 0.5 },
          { x: -constants.cornerSize * 1.5, y: constants.cornerSize * 0.5 }
        ];
        const tl = gsap.timeline();
        corners.forEach((corner, index) => {
          tl.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' }, 0);
        });

        state.resumeTimeout = setTimeout(() => {
          if (!state.activeTarget && state.cursorEl && state.spinTl) {
            const currentRotation = gsap.getProperty(state.cursorEl, 'rotation');
            const normalizedRotation = currentRotation % 360;
            state.spinTl.kill();
            state.spinTl = gsap.timeline({ repeat: -1 }).to(state.cursorEl, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(state.cursorEl, {
              rotation: normalizedRotation + 360,
              duration: spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: () => state.spinTl && state.spinTl.restart()
            });
          }
          state.resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      state.currentTargetMove = targetMove;
      state.currentLeaveHandler = leaveHandler;
      target.addEventListener('mousemove', targetMove);
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler, { passive: true });

    return function destroy() {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('mouseover', enterHandler);
      if (state.activeTarget) cleanupTarget(state.activeTarget);
      state.spinTl && state.spinTl.kill();
      document.body.style.cursor = state.originalCursor;
      if (state.cursorEl && state.cursorEl.parentNode) state.cursorEl.parentNode.removeChild(state.cursorEl);
    };
  }

  function initTargetCursor(options = {}) {
    const { targetSelector = '.cursor-target', spinDuration = 2, hideDefaultCursor = true } = options;
    if (typeof gsap === 'undefined') {
      console.error('[TargetCursor] GSAP not found. Include GSAP before initializing.');
      return () => {};
    }
    createDom();
    return initHandlers({ targetSelector, spinDuration, hideDefaultCursor });
  }

  window.initTargetCursor = initTargetCursor;
})(); 