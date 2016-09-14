(function (root, factory) {
	var plugin = 'Selectr';

	if (typeof define === 'function' && define.amd) {
		define([], factory(plugin));
	} else if (typeof exports === 'object') {
		module.exports = factory(plugin);
	} else {
		root[plugin] = factory(plugin);
	}
}(this, function (plugin) {
	'use strict';

	/**
	 * Merge defaults with user options
	 * @param {Object} source Default settings
	 * @param {Object} props User options
	 */
	var extend = function (src, props) {
		var p;
		for (p in props)
			if (props.hasOwnProperty(p))
				src[p] = props[p];
		return src;
	};

	/**
	 * Create element helper. Create an element and assign given attributes.
	 * @param  {NodeType} type 	Type of element to create.
	 * @param  {Object} attrs 	The attributes to assign to the element.
	 * @return {HTMLElement}
	 */
	var createElement = function(a, b) {
		var c, d = document.createElement(a);
		if (b && "object" == typeof b)
			for (c in b)
				if (c in d) "innerHTML" === c ? d.innerHTML = b[c] : d[c] = b[c];
				else if ("class" === c)
			for (var e = b[c].split(" "), f = e.length - 1; f >= 0; f--) {
				if ( e[f].length )
					d.classList.add(e[f]);
			}
		else d.setAttribute(c, b[c]);
		return d
	};

	/**
	 * forEach helper
	 */
	var forEach = function(a, b, c) {
		if ("[object Object]" === Object.prototype.toString.call(a)) {
			var d;
			for (d in a) Object.prototype.hasOwnProperty.call(a, d) && b.call(c, d, a[d], a)
		} else
			for (var e = 0, f = a.length; e < f; e++) b.call(c, e, a[e], a)
	};

	var debounce = function(a, b, c) {
		var d;
		return function() {
			var e = this, f = arguments, g = function() { d = null, c || a.apply(e, f) }, h = c && !d;
			clearTimeout(d), d = setTimeout(g, b), h && a.apply(e, f)
		}
	};

	var _addClass = function(e, c) { e.classList.add(c); }
	var _removeClass = function(e, c) { e.classList.remove(c); }

	/**
	 * Plugin Object
	 * @param nodes The html nodes to initialize
	 * @param {Object} options User options
	 * @constructor
	 */
	function Plugin(elem, opts) {

		if ( elem === null ) {
			throw new Error('Selectr requires an element to work.');
			return;
		}

		/**
		 * Default settings
		 */
		var defaults = {
			minChars: 1,
			width: 'auto',
			emptyOption: true,
			enableSearch: true,
			selectedIndex: null,
			selectedValue: null,
			selectedIndexes: [],
			selectedValues: [],
			containerClass: ''
		};

		this.elem = elem;
		this.elemRect = this.elem.getBoundingClientRect();
		this.selectedVal = null;
		this.selectedVals = [];
		this.ajaxOpts = false;
		this.tags = [];
		this.opts = [];
		this.values = [];
		this.list = [];
		this.lastLen = 0;
		this.disabled = false;
		this.opened = false;

		this.options = extend(defaults, opts);

		this.hasTemplate = this.options.hasOwnProperty('render') && typeof this.options.render === 'function';

		this.initialise();
	}


	// Plugin prototype
	Plugin.prototype = {

		initialise: function()
		{
			if ( this.initialised ) return;

			var _this = this;

			this.on = function(event, callback) {
				this.elem.addEventListener(event, function(event) {
					callback.call(_this, event, this);
				});
			};

			if ( _this.options.ajax && typeof _this.options.ajax === 'object' ) {
				_this.setAjaxUrl();
			}

			this.setSelections();

			this.build(this.inputType);

			this.initialised = true;

			setTimeout(function() {
				_this.emit('selectr.init');
			}, 100);
		},

		/**
		 * Check for selected indexes / values in the user options and set.
		 */
		setSelections: function()
		{
			var _this = this;

			if ( this.elem.options[0].parentNode.nodeName === 'OPTGROUP' ) {
				this.hasOptGroups = true;
			}

			if ( !this.elem.multiple ) {
				if ( this.options.emptyOption ) {
					this.emptyOpt = createElement('option', { value: '', selected: true });

					if ( this.hasOptGroups ) {
						this.elem.insertBefore(this.emptyOpt, this.elem.options[0].parentNode);
					} else {
						this.elem.insertBefore(this.emptyOpt, this.elem.options[0]);
					}
				}
				if ( this.options.selectedIndex !== null ) {
					if ( this.options.emptyOption ) {
						this.options.selectedIndex++;
					}
					this.elem.value = this.elem.options[this.options.selectedIndex].value;
				} else if ( this.options.selectedValue !== null ) {
					this.elem.value = this.options.selectedValue;
				}
			} else {
				this.options.emptyOption = false;
				if ( this.options.selectedIndexes.length || this.options.selectedValues.length ) {
					forEach(this.elem.options, function(i, option) {
						option.selected = false;
						if ( _this.options.selectedIndexes.indexOf(i) > -1 || _this.options.selectedValues.indexOf(option.value) > -1 ) {
							option.selected = true;
						}
					});
				}
			}
		},

		setAjaxUrl: function()
		{
			this.ajaxOpts = true;

			var _this = this, ajax = _this.options.ajax;

			_this.ajax_url = ajax.url;

			if ( ajax.queryParam ) {
				_this.ajax_url += '?';

				if ( ajax.params ) {
					forEach(ajax.params, function(p, v) {
						_this.ajax_url += p + '=' + v + '&';
					});
				}

				_this.ajax_url += ajax.queryParam + '=';
			}

			if ( typeof _this.options.ajax.formatSelected !== 'function' ) {
				_this.options.ajax.formatSelected = function(item) {
					return item.text;
				}
			}
		},

		/**
		 * Build the elems
		 * @return void
		 */
		build: function()
		{
			var _this = this;
			this.optsFrag = document.createDocumentFragment();

			_addClass(this.elem, 'hidden-input');

			this.container = createElement('div', { id: 'selectr-' + _this.elem.id, class: 'selectr-container ' + this.options.containerClass });
			this.selected = createElement('div', { class: 'selectr-selected' });
			this.spn = createElement(this.elem.multiple ? 'ul' : 'span', { class: 'selectr-text' });
			this.optsContainer = createElement('div', { class: 'selectr-options-container' });
			this.optsOptions = createElement('ul', { class: 'selectr-options' });

			// Create the elems for tagging
			if ( !!this.elem.multiple ) {
				_addClass(this.spn, 'selectr-tags');
				_addClass(this.container, 'multiple');
			}

			// Create the elems needed for the search option
			if ( this.options.enableSearch ) {
				this.input = createElement('input', { class: 'selectr-input' });
				this.clear = createElement('button', { class: 'selectr-clear', type: 'button' });
				this.inputContainer = createElement('div', { class: 'selectr-input-container' });
			}

			// Check we have optgroups
			if ( this.hasOptGroups ) {
				_addClass(this.optsOptions, 'optgroups');
				forEach(this.elem.children, function(idx, opt) {
					if ( opt.nodeName === 'OPTGROUP' ) {
						let group = createElement('li', { class: 'selectr-optgroup', innerHTML: opt.label });
						_this.optsFrag.appendChild(group);

						forEach(opt.children, function(i, option) {
							_this.buildOption(i, option);
						});
					}
				});
			} else {
				forEach(this.elem.options, function(i, option) {
					_this.buildOption(i, option);
				});
			}

			this.optsOptions.appendChild(this.optsFrag);

			this.selected.appendChild(this.spn);
			this.container.appendChild(this.selected);

			if ( this.options.enableSearch ) {
				this.inputContainer.appendChild(this.input);
				this.inputContainer.appendChild(this.clear);
				this.optsContainer.appendChild(this.inputContainer);
			}

			this.optsContainer.appendChild(this.optsOptions);
			this.container.appendChild(this.optsContainer);

			// Set the placeholder
			var placeholder = this.options.placeholder || this.elem.getAttribute('placeholder') || 'Choose...';
			this.selected.appendChild(createElement('div', { class: 'selectr-placeholder', innerHTML:  placeholder}));

			if ( (!this.elem.multiple && !!this.elem.value.length) || (this.elem.multiple && !!this.spn.children.length) ) {
				_addClass(this.container, 'has-selected');
				if ( !this.elem.multiple && this.emptyOpt ) {
					this.emptyOpt.selected = false;
				}
			}

			// Append the new container
			this.elem.parentNode.insertBefore(this.container, this.elem);

			// Append the elem to it's new container
			this.container.appendChild(this.elem);

			this.setDimensions();

			this.attachEventListeners();
		},

		buildOption: function(index, option)
		{
			if ( option === this.emptyOpt || option.nodeName !== 'OPTION' ) return;

			var content = this.hasTemplate ? this.options.render(option) : option.textContent.trim();
			var opt = createElement('li', { class: 'selectr-option', innerHTML: content });

			if ( option.hasAttribute('selected') ) {
				option.selected = true;
			}

			this.optsFrag.appendChild(opt);

			if ( option.selected ) {

				_addClass(opt, 'selected');

				if ( this.elem.multiple ) {
					this.createTag(option);
				} else {
					this.spn.innerHTML = content;
					this.selectedIndex = index;
				}

				this.selectedVals.push(option.value);
			}

			if ( ( this.options.emptyOption && index === 1 ) || ( !this.options.emptyOption && index === 0 ) ) {
				_addClass(opt, 'active');
				this.activeIdx = 0;
			}

			this.opts.push(option);
			this.values.push(option.value);
			this.list.push(opt);
		},

		attachEventListeners: function()
		{
			var _this = this;

			// Prevent text selection
			_this.selected.addEventListener('mousedown', function(e){ e.preventDefault(); });
			_this.optsOptions.addEventListener('mousedown', function(e){ e.preventDefault(); });

			_this.selected.addEventListener('click', _this.toggleOptions.bind(_this));
			_this.optsOptions.addEventListener('click', function(event) {
				_this.selectOption(event);
			});

			if ( _this.elem.multiple ) {
				_this.spn.addEventListener('click', _this.removeTags.bind(_this));
			}

			if ( _this.options.enableSearch ) {
				_this.input.addEventListener('keyup', _this.search.bind(_this));
				_this.clear.addEventListener('click', _this.clearOptions.bind(_this));
			}

			document.addEventListener('click', _this.dismiss.bind(_this));

			_this.resize = debounce(function() {
				_this.setDimensions();
			}, 100);

			window.addEventListener('resize', _this.resize);

			document.addEventListener('keydown', _this.navigate.bind(_this));
		},

		navigate: function(event)
		{
			event = event || window.event;

			var _this = this, keyCode = event.keyCode;

			// Filter out the keys we don't want
			if ( !_this.opened || (keyCode !== 13 && keyCode !== 38 && keyCode !== 40) ) return;

			switch (keyCode) {
				case 13: // select option
					_this.selectOption(event);
					return;
					break;
				case 38: // Scroll up options
					if ( _this.activeIdx > 0 ) {
						_this.activeIdx--;
					}
					break;
				case 40: // scroll down options
					if ( _this.activeIdx < _this.list.length - 1 ) {
						_this.activeIdx++;
					};
					break;
			}

			// Set the class for highlighting
			forEach(_this.list, function(i, opt) {
				if ( i === _this.activeIdx ) {
					_addClass(opt, 'active');
				} else {
					_removeClass(opt, 'active');
				}
			});
		},

		search: function(event)
		{
			var _this = this;
			var value = _this.input.value;
			var len = value.length;

			if ( len < this.options.minChars && len >= this.lastLen ) {
				return;
			}

			if ( this.ajaxOpts ) {
				this.ajaxSearch();
				return;
			}

			if ( value.length > 0 ) {
				_addClass(this.inputContainer, 'active');
			} else {
				_removeClass(this.inputContainer, 'active');
			}

			forEach(_this._this.list, function(i, option) {
				let opt = _this.list[i];
				let val = option.toLowerCase();
				let val2 = value.toLowerCase();
				if ( !val.includes(val2) ) {
					_addClass(opt, 'excluded');
					_removeClass(opt, 'match');
				} else {

					if ( _this.hasTemplate ) {
						_addClass(opt, 'match');
					} else {
						let result = new RegExp(val2, 'i').exec(option);
						opt.innerHTML = opt.textContent.replace(result[0], '<span>'+result[0]+'</span>');
					}
					_removeClass(opt, 'excluded');
				}
			});

			this.lastLen = this.input.value.length;
		},

		ajaxSearch: function()
		{
			_addClass(this.inputContainer, 'loading');

			var ajax = this.options.ajax;

			var that = this;
			var xhr = new XMLHttpRequest();
			xhr.onload = function() {
				if (xhr.readyState === 4 && xhr.status === 200){
					var data = JSON.parse(xhr.responseText);
					var items = ajax.parseResults(data) || data;
					var html = parseRenderItems(items);

					that.optsOptions.innerHTML = html;
					_removeClass(that.inputContainer, 'loading');

					that.remoteItems = items;
				}
			}
			xhr.open("GET", that.ajax_url + that.input.value, true);
			xhr.send();

			function parseRenderItems(parsedItems) {
				var html = '';
				var template = '<li class="selectr-options" data-value="{value}" data-text="{text}">{template}</li>';
				forEach(parsedItems, function(i, item) {
					let result = ajax.formatResults(item) || text;
					html += template.replace('{value}', item.value).replace('{text}', item.text || '').replace('{template}', result);
				});
				return html;
			}
		},

		selectOption: function(event)
		{
			event = event || window.event;

			var _this = this;
			var selected = event.target;

			if ( event.type === 'keydown' ) {
				selected = _this.list[_this.activeIdx];
			}

			if ( selected.nodeName !== 'LI' ) {
				return;
			}

			if ( _this.ajaxOpts ) {
				_this.selectRemoteOption(selected);
				return;
			}

			var index = _this.list.indexOf(selected);
			var option = _this.opts[index];
			var hasValue = false;


			if ( _this.elem.multiple ) {
				if ( selected.classList.contains('selected') ) {
					var _selectedTag;
					forEach(_this.tags, function(i, tag) {
						if ( tag.getAttribute('data-value') === option.value ) {
							_selectedTag = tag;
						}
					});

					if ( _selectedTag ) {
						_this.removeTag(_selectedTag);
					}
				} else {
					_this.selectedVals.push(option.value);
					_this.createTag(option);

					option.selected = true;
					_addClass(selected, 'selected');
					_this.emit("selectr.select");

					_this.input.value = '';
				}

				if ( !!_this.spn.children.length ) {
					hasValue = true;
				}
			} else {
				if ( _this.selectedIndex === index ) {
					_this.spn.innerHTML = '';

					option.selected = false;
					_removeClass(selected, 'selected');
					_this.selectedVal = null;
					_this.selectedIndex = null;
					_this.emit("selectr.deselect");
				} else {

					let old = _this.optsOptions.getElementsByClassName('selected')[0];
					if ( old ) {
						_removeClass(old, 'selected');
					}

					_this.spn.innerHTML = _this.hasTemplate ? _this.options.render(option) : option.textContent;

					option.selected = true;
					_addClass(selected, 'selected');
					_this.selectedVal = option.value;
					_this.selectedIndex = index;
					_this.emit("selectr.select");

					hasValue = true;
				}
			}

			if ( !!hasValue ) {
				_addClass(_this.container, 'has-selected');
			} else {
				_removeClass(_this.container, 'has-selected');
			}

			_this.reset();

			// Keep open for multi-selects
			if ( !_this.elem.multiple ) {
				_this.close();
			}

			_this.emit("selectr.change");
		},

		selectRemoteOption: function(selected)
		{
			var value = selected.getAttribute('data-value');

			var selectItem = false;

			forEach(this.remoteItems, function(i, item) {
				if ( item.value == value ) {
					selectItem = item;
				}
			});

			if ( this.elem.multiple ) {
				this.createTag(selected, true);
				this.selectedVals.push(value);
			} else {
				this.spn.innerHTML = selectItem ? this.options.ajax.formatSelected(selectItem) : selected.getAttribute('data-text') || selected.textContent;
				this.selectedVal = value;
			}

			if ( this.elem.multiple ) {
				if ( this.elem.value.length > 0 ) {
					this.elem.value += ',' + value;
				} else {
					this.elem.value = value;
				}
			} else {
				this.elem.value = value;
			}

			if ( !!this.elem.value ) {
				_addClass(this.container, 'has-selected');
			} else {
				_removeClass(this.container, 'has-selected');
			}

			this.emit("selectr.select");
			this.emit("selectr.change");
			this.close();
		},

		createTag: function(option, remote)
		{
			var _this = this, docFrag = document.createDocumentFragment();

			var content;

			if ( remote ) {
				content = option.getAttribute('data-text') || option.textContent;
			} else {
				content = this.hasTemplate ? this.options.render(option) : option.textContent
			}

			let tag = createElement('li', { class: 'selectr-tag', innerHTML: content });
			let btn = createElement('button', { class: 'selectr-tag-remove', type: 'button' });

			tag.appendChild(btn);
			docFrag.appendChild(tag);
			this.spn.appendChild(docFrag);
			this.tags.push(tag);

			if ( !!this.spn.children.length ) {
				_addClass(this.container, 'has-selected');
			} else {
				_removeClass(this.container, 'has-selected');
			}

			if ( remote ) {
				tag.setAttribute('data-value', option.getAttribute('data-value'));
			} else {
				tag.setAttribute('data-value', option.value);
			}

		},

		removeTags: function(event)
		{
			if ( this.disabled ) return;

			event = event || window.event;

			var target = event.target;
			var nodeName = target.nodeName;

			if ( nodeName != 'BUTTON' ) {
				return false;
			}

			event.preventDefault();
			event.stopPropagation();

			this.removeTag(target.parentNode);
		},

		removeTag: function(tag, index)
		{
			var value = tag.getAttribute('data-value');
			var valToRemove;

			if ( !this.ajaxOpts ) {
				index = index || this.values.indexOf(value);

				var option = this.opts[index];
				valToRemove = this.selectedVals.indexOf(option.value);

				option.selected = false;
				_removeClass(this.list[index], 'selected');
			} else {
				valToRemove = this.selectedVals.indexOf(value);

				// Update the comma-separated values
				var values = this.elem.value.split(',');
				var toRemove = values.indexOf(value);
				values.splice(toRemove, 1);

				this.elem.value = values.join(',');
			}

			this.selectedVals.splice(valToRemove, 1);
			this.tags.splice(this.tags.indexOf(tag) ,1);

			this.spn.removeChild(tag);

			if ( !this.tags.length ) {
				_removeClass(this.container, 'has-selected');
			}

			this.emit("selectr.deselect");
		},

		toggleOptions: function()
		{
			var _this = this, open = this.container.classList.contains('open');

			if ( this.disabled ) {
				return false;
			}

			if ( open ) {
				this.close()
			} else {
				this.open();
			}
		},

		clearOptions: function()
		{
			if ( this.options.enableSearch ) {
				this.input.value = null;
				_removeClass(this.inputContainer, 'active');
			}

			this.reset();
		},

		reset: function()
		{
			var _this = this;
			forEach(this.list, function(i, elem) {
				let option = _this.opts[i];
				elem.innerHTML = _this.hasTemplate ? _this.options.render(option) : option.textContent;
				_removeClass(elem, 'match');
				_removeClass(elem, 'excluded');
			});
		},

		open: function()
		{
			var _this = this;

			var bottom = this.elemRect.top + this.elemRect.height + 230;
			var wh = window.innerHeight;

			if ( bottom > wh ) {
				_addClass(this.container, 'inverted');
			} else {
				_removeClass(this.container, 'inverted');
			}

			_addClass(this.container, 'open');

			if ( this.options.enableSearch ) {
				setTimeout(function() {
					_this.input.focus();
				}, 10);
			}

			this.opened = true;

			this.emit("selectr.open");
		},

		close: function()
		{
			if ( this.options.enableSearch ) {
				this.input.blur();
			}

			_removeClass(this.container, 'open');

			var containers = document.getElementsByClassName('selectr-container');

			forEach(containers, function(i, container) {
				_removeClass(container, 'open');
			});

			this.opened = false;

			this.emit("selectr.close");
		},

		dismiss: function(event)
		{
			var target = event.target;
			if ( !this.container.contains(target) && this.opened ) {
				this.close();
			}
		},

		setValue: function(value)
		{
			var _this = this, index = [].slice.call(_this.values).indexOf(value);

			if ( index < 0 ) {
				return false;
			}

			if ( _this.elem.multiple ) {
				if ( _this.selectedVals.indexOf(value) < 0 ) {
					_this.createTag(_this.opts[index]);
				}
			} else {
				_this.spn.innerHTML = _this.hasTemplate ? _this.options.render(_this.opts[index]) : _this.opts[index].textContent;

				let old = _this.optsOptions.getElementsByClassName('selected')[0];
				if ( old ) {
					_removeClass(old, 'selected');
				}
			}

			_this.selectedVals.push(value);
			_addClass(_this.list[index], 'selected');
			_addClass(_this.container, 'has-selected');
			_this.opts[index].selected = true;

			_this.emit('selectr.select');
		},

		getValue: function()
		{
			if ( this.elem.multiple ) {
				return this.selectedVals;
			}
			return this.selectedVal;
		},

		removeValue: function(value)
		{
			if ( !this.tags.length ) return;

			var _this = this, index = [].slice.call(this.values).indexOf(value);

			if ( index < 0 ) return;

			var selected = this.list[index], option = this.opts[index];

			if ( this.elem.multiple ) {
				var selectedTag;
				forEach(this.tags, function(i, tag) {
					if ( tag.getAttribute('data-value') === value ) {
						selectedTag = tag;
					}
				});

				if ( selectedTag ) {
					_this.removeTag(selectedTag);
				}
			} else {
				this.spn.innerHTML = this.hasTemplate ? this.options.render(option) : option.textContent;
				if ( this.elem.selectedIndex !== null ) {
					_removeClass(this.list[this.elem.selectedIndex], 'selected');
				}
			}

			option.selected = false;
			_removeClass(selected, 'selected');

			this.emit('selectr.select');
		},


		setDimensions: function()
		{
			var w = this.options.width || this.elemRect.width;

			if ( this.options.width == 'auto' ) {
				w = '100%';
			}

			this.container.style.cssText += 'width: '+w+'; ';

			if ( this.opened ) {
				this.elemRect = this.elem.getBoundingClientRect();
				var bottom = this.elemRect.top + this.elemRect.height + 230;
				var wh = window.innerHeight;

				if ( bottom > wh ) {
					_addClass(this.container, 'inverted');
				} else {
					_removeClass(this.container, 'inverted');
				}
			}
		},

		emit: function(event)
		{
			this.elem.dispatchEvent(new Event(event));
		},

		enable: function()
		{
			this.disabled = false;
			_removeClass(this.container, 'disabled');
		},

		disable: function()
		{
			this.disabled = true;
			_addClass(this.container, 'disabled');
		},

		destroy: function()
		{
			if ( !this.initialised ) {
				return;
			}

			var _this = this;

			// Cull all created elems.
			var parentNode = _this.container.parentNode;
			parentNode.insertBefore(_this.elem, _this.container);
			parentNode.removeChild(_this.container);

			_removeClass(_this.elem, 'hidden-input');

			if ( !_this.elem.multiple && _this.options.emptyOption ) {
				_this.elem.removeChild(_this.elem.options[0]);
			}

			_this.container = null;
			_this.selected = null;
			_this.spn = null;
			_this.optsContainer = null;
			_this.optsOptions = null;
			_this.input = null;
			_this.clear = null;
			_this.inputContainer = null;

			window.removeEventListener('resize', _this.resize);
			document.removeEventListener('click', _this.dismiss.bind(_this));
			document.removeEventListener('keydown', _this.navigate.bind(_this));

			_this.initialised = false;
		}
	};

	return Plugin;
}));