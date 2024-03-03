'use strict';

(function({createElement: e, useState, useEffect, useMemo}, {render}) {
  const examples = [
    ['[1,2]', '"1,2"'],
    ['[0]', 'false'],
    ['"\\n"', 'false'],
    ['"0XA19"', '2585'],
    ['{foo: 42}', '42'],
    ['{toString(){ return "42"; }}', '42'],
  ];

  const specLinks = {
    'Type': 'https://www.ecma-international.org/ecma-262/9.0/#sec-ecmascript-data-types-and-values',
    'Strict Equality Comparison': 'https://www.ecma-international.org/ecma-262/9.0/#sec-strict-equality-comparison',
    'ToNumber': 'https://www.ecma-international.org/ecma-262/9.0/#sec-tonumber',
    'ToPrimitive': 'https://www.ecma-international.org/ecma-262/9.0/#sec-toprimitive',
  };

  const specLinkRegex = new RegExp(Object.keys(specLinks).join('|'), 'g');

  const algorithmSteps = [
    [1, 'If <code>Type(x)</code> is the same as <code>Type(y)</code>, then'],
    ['1.a', 'Return the result of performing Strict Equality Comparison <code>x === y</code>.', true],
    [2, 'If <code>x</code> is <strong>null</strong> and <code>y</code> is <strong>undefined</strong>, return <strong>true</strong>'],
    [3, 'If <code>x</code> is <strong>undefined</strong> and <code>y</code> is <strong>null</strong>, return <strong>true</strong>'],
    [4, 'If <code>Type(x)</code> is Number and <code>Type(y)</code> is String, return the result of the comparison <code>x == ToNumber(y)</code>.'],
    [5, 'If <code>Type(x)</code> is String and <code>Type(y)</code> is Number, return the result of the comparison <code>ToNumber(x) == y</code>.'],
    [6, 'If <code>Type(x)</code> is Boolean, return the result of the comparison <code>ToNumber(x) == y</code>.'],
    [7, 'If <code>Type(y)</code> is Boolean, return the result of the comparison <code>x == ToNumber(y)</code>.'],
    [8, 'If <code>Type(x)</code> is either String, Number, or Symbol and <code>Type(y)</code> is Object, return the result of the comparison <code>x == ToPrimitive(y)</code>.'],
    [9, 'If <code>Type(x)</code> is Object and <code>Type(y)</code> is either String, Number, or Symbol, return the result of the comparison <code>ToPrimitive(x) == y</code>.'],
    [10, 'Return <strong>false</strong>.'],
  ].map(([step, description]) => [
    step,
    description.replace(specLinkRegex, match => `<a href="${specLinks[match]}">${match}</a>`),
  ]);


  /**
   * This is an implementation of the abstract equality algorithm defined in
   * 7.2.13 (http://www.ecma-international.org/ecma-262/7.0/#sec-abstract-equality-comparison)
   * to demonstrate the behavior of loose equality comparison.
   */
  function abstractEqualityComparison(x, y, iteration=1) {
    const title = `Iteration ${iteration}: ${str(x)}\ == ${str(y)}`;
    const steps = {};
    const pass = s => steps[s] = true;
    const fail = s => steps[s] = false;
    const resolve = result => [[title, steps, result]];
    const delegate = iterations => [[title, steps], ...iterations];

    if (Type(x) === Type(y)) {
      pass(1);
      pass('1.a');
      return resolve(x === y);
    }
    fail(1);

    if (x === null && y === undefined) {
      pass(2);
      return resolve(true);
    }
    fail(2);

    if (x === undefined && y === null) {
      pass(3);
      return resolve(true);
    }
    fail(3);

    if (Type(x) === 'number' && Type(y) === 'string') {
      pass(4);
      return delegate(abstractEqualityComparison(x, ToNumber(y), iteration+1));
    }
    fail(4);

    if (Type(x) === 'string' && Type(y) === 'number') {
      pass(5);
      return delegate(abstractEqualityComparison(ToNumber(x), y, iteration+1));
    }
    fail(5);

    if (Type(x) === 'boolean') {
      pass(6);
      return delegate(abstractEqualityComparison(ToNumber(x), y, iteration+1));
    }
    fail(6);

    if (Type(y) === 'boolean') {
      pass(7);
      return delegate(abstractEqualityComparison(x, ToNumber(y), iteration+1));
    }
    fail(7);

    const types = new Set(['string', 'number', 'symbol']);
    if (types.has(Type(x)) && Type(y) === 'object') {
      pass(8);
      return delegate(abstractEqualityComparison(x, ToPrimitive(y), iteration+1));
    }
    fail(8);

    if (types.has(Type(y)) && Type(x) === 'object') {
      pass(9);
      return delegate(abstractEqualityComparison(ToPrimitive(x), y, iteration+1));
    }
    fail(8);

    pass(10);
    return resolve(false);

  }

  function Type(value) {
    const type = typeof value;
    switch (type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'symbol':
        return type;
      case 'object':
      case 'function':
        if (!value) {
          return 'null';
        }
        return 'object';
    }
  }

  function ToPrimitive(obj) {
    let result = obj.valueOf();
    if (Type(result) !== 'object') {
      return result;
    }
    result = obj.toString();
    if (Type(result) !== 'object') {
      return result;
    }
    throw new TypeError();
  }

  function ToNumber(value) {
    return Number(value);
  }

  function str(value) {
    if (typeof value === 'number' && isNaN(value)) {
      return 'NaN';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'function') {
      return '<function>';
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }

    const prefix = '__' + Date.now();
    return JSON.stringify(value, (k, v) => {
      switch(typeof v) {
        case 'undefined':
          return prefix + 'undefined';
        case 'function':
          return prefix + '<function>';
        case 'number':
          return isNaN(v) ? prefix + 'NaN' : v;
        case 'object':
          return !v ? prefix + 'null' : v;
        case 'symbol':
          return prefix + v.toString();
        default:
          return v;
      }
    })
      .replace(new RegExp(`"${prefix}(<function>|undefined|NaN|null|Symbol\\([^)]*\\))"`, 'g'), '$1');
  }

  function compare(left, right) {
    return abstractEqualityComparison(eval(`(${left})`), eval(`(${right})`));
  }

  function pass() {
    return e(
      'span',
      {
        className: 'marker',
        style: {color: 'green'},
        'aria-hidden': true,
      },
      '\u2713'
    );
  }

  function fail() {
    return e(
      'span',
      {
        className: 'marker',
        style: {color: 'red'},
        'aria-hidden': true,
      },
      '\u2717'
    );
  }

  function getFromHash() {
    return location.hash.slice(1).split('==').map(decodeURIComponent);
  }

  function encode(val) {
    // Also encode [ ] for embedding into markdown
    return encodeURIComponent(val).replace(/[\[\]]/g, m => '%' + m.charCodeAt(0));
  }

  let initialLeft, initialRight;
  if (location.hash.length <= 1) {
    initialLeft = '"42"';
    initialRight = '42';
  } else {
    [initialLeft, initialRight] = getFromHash();
  }

  function LooseComparison() {
    const [selectedExample, setSelectedExample] = useState(-1);
    const [leftInput, setLeftInput] = useState(initialLeft);
    const [rightInput, setRightInput] = useState(initialRight);
    const [iterations, error] = useMemo(() => {
      try {
        return [compare(leftInput, rightInput), null];
      } catch(error) {
        return [[], error];
      }
    }, [leftInput, rightInput]);

    useEffect(() => {
      window.onhashchange = function() {
        const [left, right] = getFromHash();
        setLeftInput(left);
        setRightInput(right);
      };
    }, []);

    let result = null;
    if (iterations.length > 0) {
      result = iterations[iterations.length - 1][2];
    }
    return (
      e(
        'div',
        null,
        e(
          'p',
          {style: {textAlign: 'right'}},
          e(
            'a',
            {href: `#${encode(leftInput)}==${encode(rightInput)}`},
            '#Permalink'
          )
        ),
        e(
          'div',
          null,
          e(
            'p',
            null,
            'Enter two JavaScript expressions or select an example: ',
            e(
              'select',
              {
                style: {
                  fontSize: '0.9rem',
                },
                value: selectedExample,
                onChange: event => {
                  const selectedExample = event.target.value;
                  const [left, right] = examples[selectedExample];
                  setSelectedExample(selectedExample);
                  setLeftInput(left);
                  setRightInput(right);
                },
              },
              e('option', {value: -1}, 'Select an example...'),
              examples.map(([left, right], i)  => e(
                'option',
                {key: left + right, value: i},
                `${left} == ${right}`
              )),
            ),
            e(
              'div',
              {
                style: {textAlign: 'center', fontSize: '1.2rem'},
                className: 'operation' + (result === true ? ' yes' : (result === false ? ' no' : '')),
              },
              e(
                'span',
                {style: {whiteSpace: 'nowrap'}},
                '(',
                e(
                  'input',
                  {
                    value: leftInput,
                    onChange: e => {
                      setLeftInput(e.target.value);
                    },
                  }
                ),
                ')'
              ),
              ' == ',
              e(
                'span',
                {style: {whiteSpace: 'nowrap'}},
                '(',
                e(
                  'input',
                  {
                    value: rightInput,
                    onChange: e => {
                      setRightInput(e.target.value);
                    },
                  }
                ),
                ')'
              )
            )
          )
        ),
        error ?
          e(
            'div',
            {className: 'error'},
            'Error: ',
            error.message,
          ) :
          iterations.map(
            (iteration, i) => e(Iteration, {key: i, iteration, open: i === 0})
          )
        ,
        result != null
          ? e(
            'div',
            {className: 'result'},
            e('strong', null, 'Final result: '),
            e('code', null, result.toString()),
          )
          : null
      ));
  }

  function Iteration({iteration: [comparison, steps], open}) {
    return (
      e(
        'details',
        {open},
        e(
          'summary',
          {style: {cursor: 'pointer'}},
          e('strong', null, comparison),
        ),
        e(
          'ul',
          {className: 'comparisonIteration'},
          algorithmSteps.map(([step, description]) => {
            const wasExecuted = steps.hasOwnProperty(step);
            const wasSuccessful = steps[step];
            const marker = wasSuccessful ?
              pass() :
              (wasExecuted ? fail() : null);
            return (
              e(
                'li',

                {
                  className: 'step' + (wasExecuted ? ' executed' : ''),
                  key: step,
                },
                marker,
                `${step}. `,
                e(
                  'span',
                  {
                    dangerouslySetInnerHTML: {__html: description},
                  }
                ),
              )
            );
          })
        )
      )
    );
  }

  render(e(LooseComparison), document.getElementById('container'));

}(React, ReactDOM));

