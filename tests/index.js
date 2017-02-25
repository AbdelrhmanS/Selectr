(function() {
	'use strict';
	var s = document.createElement('select');


	document.body.appendChild(t);

	var st = new Selectr(s, {
		data: [
			{ value: 'value-1', text: 'Value 1' },
			{ value: 'value-2', text: 'Value 2', selected: true },
			{ value: 'value-3', text: 'Value 3' },
			{ value: 'value-4', text: 'Value 4' },
			{ value: 'value-5', text: 'Value 5', selected: true },
			{ value: 'value-6', text: 'Value 6' },
			{ value: 'value-7', text: 'Value 7' },
			{ value: 'value-8', text: 'Value 8' },
			{ value: 'value-9', text: 'Value 9' },
			{ value: 'value-10', text: 'Value 10' }
		],
		multiple: true
	});

	QUnit.module('General');
	QUnit.test( "init", function( assert ) {
		assert.ok( Object.prototype.toString.call(st) === '[object Object]', "Passed!" );
	});
})();
