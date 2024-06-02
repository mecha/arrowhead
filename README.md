# Arrowhead

Move focus between DOM elements using the arrow keys, without writing any JavaScript!

## Installation

Arrowhead is a single, dependency-free JavaScript file. Simply
[download the script](https://github.com/mecha/arrowhead/releases/latest) and include it
in your page using a `<script>` tag:

```html
<script src="path/to/downloaded/arrowhead.min.js"></script>
```

## Usage

Focus moves between elements marked with the `ah-item` attribute.

Use the `ah-row` and `ah-col` attributes to set the arrow key axis. Rows use
the left/right ⇦/⇨ keys, while columns use the up/down ⇧/⇩ keys:

```html
<div ah-row>
  <button ah-item>press left</button>
  <button ah-item>focused</button>
  <button ah-item>press right</button>
</div>

<div ah-col>
  <button ah-item>press up</button>
  <button ah-item>focused</button>
  <button ah-item>press down</button>
</div>
```

Items do not need to be on the same level:

```html
<div ah-col>
  <button ah-item>press up</button>
  <div>
    <ul>
      <li><button ah-item>focused</button></li>
      <li><button ah-item>press down</button></li>
    </ul>
    <button ah-item>press down x2</button>
  </div>
</div>
```

By default, items can be 5 levels deep from a `ah-row` or `ah-col` element.
This can be changed using the `ah-depth` attribute:

```html
optimize performance
<div ah-col ah-depth="1">
  <div>...</div>
  <button ah-item>press up</button>
  <button ah-item>focused</button>
  <button ah-item>press down</button>
  <div>...</div>
</div>

or go crazy
<div ah-col ah-depth="24">
  <div>
    <div>
      <div>
        ...
        <button ah-item>...</button>
        ...
      </div>
    </div>
  </div>
</div>
```

Rows and columns can be nested. Focus can move between sibling rows and columns
varying types:

```html
<div ah-col>
  <div ah-row>
    <button ah-item>press up</button>
    <button ah-item>press up, right</button>
    <button ah-item>press up, right, right</button>
  </div>
  <div ah-row>
    <button ah-item>press left</button>
    <button ah-item>focused</button>
  </div>
  <div ah-row>
    <button ah-item>press down</button>
    <button ah-item>press down, right</button>
    <button ah-item>press down, right, right</button>
  </div>
</div>
```

Elements now marked with any Arrowhead attributes are not affected by Arrowhead.

Check out the [demo](./demo.html).

## Auto

Arrowhead can automatically assign the `ah-item` attribute to the child elements
of an element. This is done by adding the `ah-auto` attribute to the parent and
providing a CSS selector string.

This can be particularly useful when you do not have full control over the
rendered HTML.

```html
...
<div ah-auto="a, button">
  <p>This <a href="...">link</a> will be given the ah-item attribute.</p>
  <button>This button too!</button>
  <input value="But not this field" />
</div>
...
```

This becomes:

```html
...
<div>
  <p>This <a href="..." ah-item>link</a> will be given the ah-item attribute.</p>
  <button ah-item>This button too!</button>
  <input value="But not this field" />
</div>
...
```

If the `ah-auto` attribute has no value or an empty one, the CSS selector
`a, button, input, textarea, select, summary` will be used.

Auto is not enabled by default. You can "enable" it by running `ArrowHead.auto()`
when the page content is ready. This function takes the root of the tree to be
searched for `ah-auto` attributes.

```js
document.addEventListener("DOMContentLoaded", function () {
  ArrowHead.auto(document.body);
});
```

If you're using [htmx], you may also want to run `auto()` on any new content that
gets swapped into the DOM:

```js
document.addEventListener("htmx:afterSwap", function (ev) {
  if (ev.target instanceof HTMLElement) {
    ArrowHead.auto(ev.target);
  }
});
```

## How it works

Arrowhead is basically just a key listener on the `document`.

When an arrow key is pressed, Arrowhead will begin searching upwards in the DOM,
starting from the currently focused element. The search stops when an element
has the `ah-layout` attribute or the `ah-row` and `ah-col` shorthands:

```html
<div ah-layout="row">...</div>
<div ah-layout="col">...</div>

<div ah-row>...</div>
<div ah-col>...</div>
```

When found, these enable Arrowhead navigation in their subtree, in either the
horizonal or vertical axes:

| row | col |
| --- | --- |
| ←/→ | ↑/↓ |

If the axis of the pressed key does not match the axis of the found layout,
Arrowhead repeats the search starting from the found layout element.

When a matching layout is found, a direction is determined as follows:

| ←/↑             | →/↓            |
| --------------- | -------------- |
| Backwards (BWD) | Forwards (FWD) |

Arrowhead now begins a search in the layout's subtree for all descendant
layout elements and elements marked with the `ah-item` attribute (value unused).
All other elements will be recursively searched up to a depth of `5`. The depth
can be changed by adding `ah-depth` attribute to the layout element.

The search stops when it finds the currently focused element. Then, depending
on the direction, the search will either yield the previous search result (BWD)
the next one (FWD), if they exist.

If a result is not found, Arrowhead will restart the process using the layout
element as the currently focused element. This way, the key event "bubbles up".

If a result _is_ found, that element becomes the **target**.

1. If the target is a `ah-item` element, it recieves focus.
1. If the target is a layout element, focus will be given to the layout's first
   or last item element, depending on the direction. If this element is also a
   layout, this process repeats.
1. If the target is any other element, nothing happens.

```html
<div ah-layout="col">
  <br />
  <div>
    <button ah-item>focused if up key is pressed</button>
  </div>
  <br />
  <button>currently focused</button>
  <br />
  <ul>
    <li>
      <button ah-item>focused if down key is pressed</button>
    </li>
  </ul>
  <br />
</div>
```
