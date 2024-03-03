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

document.addEventListener("keydown", function(evt) {
  if (!evt.key.startsWith("Arrow")) {
    return;
  }

  const activeEl = document.activeElement;
  if (!(activeEl instanceof HTMLElement) || !ArrowHead.isAhElem(activeEl)) {
    return;
  }

  const target = ArrowHead.followKey(activeEl, evt.key);
  if (!target) {
    return;
  }

  target.focus();
  evt.preventDefault();

  if (document.activeElement !== target) {
    console.warn(
      "[Arrowhead] Focus was not gained on element: ",
      target,
      "Instead, focus was gained by: ",
      document.activeElement,
    );
  }
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
    return null;
  },
  /**
   * @param {HTMLElement} el
   * @param {string} key
   */
  followKey(el, key) {
    const [layout, parent] = ArrowHead.findLayout(el);
    if (layout === null || parent === null) {
      return null;
    }

    const direction = AxisDirs[layout][key] ?? null;
    if (direction === null) {
      return this.followKey(parent, key);
    }

    const target = ArrowHead.followDir(parent, el, direction);
    if (!target) {
      return null;
    }

    if (target === "exit") {
      return this.followKey(parent, key);
    }

    return this.focus(target, key);
  },
  /**
   * Searches an element's parents for an element with a "ah-layout" attribute.
   * @param {HTMLElement} el
   * @return {[Axis,HTMLElement]|[null,null]}
   */
  findLayout(el) {
    let curr = el.parentElement;

    while (curr !== null) {
      const layout = this.getLayout(curr);
      if (layout !== null) {
        return [layout, curr];
      }
      curr = curr.parentElement;
    }

    return [null, null];
  },
  /**
   * Searches an element's children for item elements. If the element has a
   * "ah-depth" attribute, its value controls the recursion depth. Default depth is 5.
   * @param {HTMLElement} el
   * @param {{depth?: number, skip?: HTMLElement}=} args
   * @return {Generator<HTMLElement>}
   */
  *findItems(el, args) {
    args = args ?? {};
    args.depth = args.depth ?? +(el.getAttribute("ah-depth") ?? 5);

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

      if (args.depth > 0 && child !== args.skip) {
        yield* this.findItems(child, { depth: args.depth - 1 });
      }
    }
  },
  /**
   * Finds the next focusable element, if any, at a specific direction.
   * @param {HTMLElement} parent
   * @param {HTMLElement} curr
   * @param {Dir} dir
   * @return {HTMLElement|"exit"|null}
   */
  followDir(parent, curr, dir) {
    /** @type {HTMLElement | null} */
    let prev = null;
    let next = false;

    let isAh = ArrowHead.isAhElem(curr);
    if (!isAh) {
      curr.setAttribute("ah-item", "");
    }

    try {
      const items = ArrowHead.findItems(parent, { skip: curr });

      for (const item of items) {
        if (!(item instanceof HTMLElement)) {
          continue;
        }
        if (next) {
          return item;
        }

        if (item !== curr) {
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
        curr.removeAttribute("ah-item");
      }
    }
  },
  /**
   * @param {HTMLElement} el
   * @param {string} key
   */
  focus(el, key) {
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
        return this.focus(target, key);
      }
    }

    if (el.hasAttribute("ah-item")) {
      return el;
    }

    return null;
  },
};
