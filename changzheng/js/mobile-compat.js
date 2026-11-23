/* Missing standard methods in older mobile WebViews; native implementations win. */
(function () {
  if (!Object.hasOwn) Object.defineProperty(Object, 'hasOwn', {
    configurable: true, writable: true, value: function (object, key) {
      if (object === null || object === undefined) throw new TypeError('Object.hasOwn requires an object');
      return Object.prototype.hasOwnProperty.call(Object(object), key);
    }
  });
  function indexAt(length, value) {
    var index = Number(value);
    if (index !== index) index = 0;
    if (!isFinite(index)) return -1;
    index = index < 0 ? Math.ceil(index) : Math.floor(index);
    return index < 0 ? length + index : index;
  }
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', {
    configurable: true, writable: true,
    value: function (index) {
      'use strict';
      if (this === null || this === undefined) throw new TypeError('Array.at requires a receiver');
      var object = Object(this);
      var length = Math.min(Math.max(Math.floor(Number(object.length) || 0), 0), 9007199254740991);
      var position = indexAt(length, index);
      return position >= 0 && position < length ? object[position] : undefined;
    }
  });
  if (!String.prototype.at) Object.defineProperty(String.prototype, 'at', {
    configurable: true, writable: true,
    value: function (index) {
      'use strict';
      if (this === null || this === undefined) throw new TypeError('String.at requires a receiver');
      var text = String(this), position = indexAt(text.length, index);
      return position >= 0 && position < text.length ? text.charAt(position) : undefined;
    }
  });
})();
