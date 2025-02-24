// @ts-check

/** @enum {number} */
const Dir = { FWD: 0, BWD: 1 };
/** @enum {string} */
const Axis = { ROW: "row", COL: "col" };
/** @type Record<Axis,Record<string,Dir>> */
const AxisDirs = {
  [Axis.ROW]: {
    ArrowLeft: Dir.BWD,
    ArrowRight: Dir.FWD,
  },
  [Axis.COL]: {
    ArrowUp: Dir.BWD,
    ArrowDown: Dir.FWD,
  },
};

const DefaultAutoSelector = "a, button, input, textarea, select, summary";

document.addEventListener("keydown", function(evt) {
  if (!evt.key.startsWith("Arrow") || evt.shiftKey) {
    return;
  }

  const activeEl = document.activeElement;
  if (!(activeEl instanceof HTMLElement) || !ArrowHead.isAhElem(activeEl)) {
    return;
  }

  const targetEl = ArrowHead.handleKey(activeEl, evt.key);
  if (!targetEl) {
    return;
  }

  targetEl.focus();
  evt.preventDefault();
});

const ArrowHead = {
  /** @param {HTMLElement} el */
  isAhElem(el) {
    return el.hasAttribute("ah-item") || this.getLayout(el) !== null;
  },
  /**
   * Gets the Arrowhead layout of an element, if any.
   * @param {HTMLElement} el
   * @return {Axis|null}
   */
  getLayout(el) {
    const ahLayout = el.getAttribute("ah-layout")?.toLowerCase() ?? "";
    if (ahLayout === Axis.ROW || ahLayout === Axis.COL) {
      return ahLayout;
    }
    if (el.hasAttribute("ah-row")) {
      return Axis.ROW;
    }
    if (el.hasAttribute("ah-col")) {
      return Axis.COL;
    }
    if (el.hasAttribute("ah-flex")) {
      const flexDir = getComputedStyle(el).flexDirection.toLowerCase()
      if (flexDir.startsWith("column")) {
        return Axis.COL;
      }
      return Axis.ROW;
    }
    return null;
  },
  /**
   * @param {HTMLElement} currEl
   * @param {string} key
   */
  handleKey(currEl, key) {
    const [layout, parentEl] = this.findLayout(currEl);
    if (layout === null || parentEl === null) {
      return null;
    }

    const direction = AxisDirs[layout][key] ?? null;
    if (direction === null) {
      return this.handleKey(parentEl, key);
    }

    const targetEl = this.findNextItem(parentEl, currEl, direction);
    if (!targetEl) {
      return null;
    }

    if (targetEl === "exit") {
      return this.handleKey(parentEl, key);
    }

    return this.vFocus(targetEl, key);
  },
  /**
   * Searches an element's parents for an element with a "ah-layout" attribute.
   * @param {HTMLElement} el
   * @return {[Axis,HTMLElement]|[null,null]}
   */
  findLayout(el) {
    let currEl = el.parentElement;

    while (currEl !== null) {
      const layout = this.getLayout(currEl);
      if (layout !== null) {
        return [layout, currEl];
      }
      currEl = currEl.parentElement;
    }

    return [null, null];
  },
  /**
   * Searches an element's children for item elements. If the element has a
   * "ah-depth" attribute, its value controls the recursion depth. Default depth is 5.
   * @param {HTMLElement} el
   * @param {number=} depth
   * @param {HTMLElement=} noRecurse
   * @return {Generator<HTMLElement>}
   */
  *findItems(el, depth, noRecurse) {
    depth = depth || parseInt(el.getAttribute("ah-depth") ?? "5", 10)

    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }

      if (child.hasAttribute("ah-item")) {
        yield child;
        continue;
      }

      const layout = this.getLayout(child);
      if (layout !== null) {
        yield child;
        continue;
      }

      if (depth > 0 && child !== noRecurse) {
        yield* this.findItems(child, depth - 1, noRecurse);
      }
    }
  },
  /**
   * Finds the next focusable element, if any, at a specific direction.
   * @param {HTMLElement} parentEl
   * @param {HTMLElement} currEl
   * @param {Dir} dir
   * @return {HTMLElement|"exit"|null}
   */
  findNextItem(parentEl, currEl, dir) {
    /** @type {HTMLElement | null} */
    let prev = null;
    let next = false;

    let isAh = this.isAhElem(currEl);
    if (!isAh) {
      currEl.setAttribute("ah-item", "");
    }

    try {
      const items = this.findItems(parentEl, undefined, currEl);

      for (const item of items) {
        if (!(item instanceof HTMLElement)) {
          continue;
        }
        if (next) {
          return item;
        }

        if (item !== currEl) {
          prev = item;
          continue;
        }

        switch (dir) {
          case Dir.FWD:
            next = true;
            continue;
          case Dir.BWD:
            if (prev === null) {
              return "exit";
            }
            return prev;
        }
      }

      if (next) {
        return "exit";
      }

      return null;
    } finally {
      if (!isAh) {
        currEl.removeAttribute("ah-item");
      }
    }
  },
  /**
   * @param {HTMLElement} el
   * @param {string} key
   */
  vFocus(el, key) {
    const layout = this.getLayout(el);

    if (layout !== null) {
      /** @type {HTMLElement|null} */
      let target = null;
      const items = this.findItems(el);
      const dir = AxisDirs[layout][key] ?? Dir.FWD;

      if (dir === Dir.FWD) {
        for (target of items) break;
      } else {
        for (target of items) continue;
      }

      if (target !== null) {
        return this.vFocus(target, key);
      }
    }

    if (el.hasAttribute("ah-item")) {
      return el;
    }

    return null;
  },
  /** @param {HTMLElement} el */
  auto(el) {
    if (el.hasAttribute("ah-auto")) {
      const selector = el.getAttribute("ah-auto") || DefaultAutoSelector;

      for (const item of el.querySelectorAll(selector)) {
        if (!(item instanceof HTMLElement)) continue;
        item.setAttribute("ah-item", "");
      }

      el.removeAttribute("ah-auto");
    }

    for (const child of el.querySelectorAll("[ah-auto]")) {
      if (!(child instanceof HTMLElement)) continue;
      this.auto(child);
    }
  },
};
