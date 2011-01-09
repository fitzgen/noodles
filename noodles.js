/**
 * @license Copyright (c) 2011 Nick Fitzgerald
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global exports, window, setTimeout */

// noodles.js -- Asynchronous, non-blocking, continuation-passing-style versions
// of the common higher order functions in Array.prototype.

// TODO:
//
// * Remove try/catch blocks.
//
// * Prevent against infinite loops in reduce when using async after 50ms.
//
// * Refactor to avoid copying items in reduce.
//
// * Refactor and put public interface at bottom.

(function (exports) {

    var slice = Array.prototype.slice,
        noodles;

    function curry (fn) {
        var args = slice.call(arguments, 1);
        return function () {
            return fn.apply(this, args.concat(slice.call(arguments)));
        };
    }

    // Globally exposed function. Can access the functions like
    // `noodles(items).map(...)` or like `noodles.map(items, ...)`.
    noodles = exports.noodles = function (items) {
        return {
            reduce: curry(noodles.reduce, items),
            map: curry(noodles.map, items),
            filter: curry(noodles.filter, items),
            forEach: curry(noodles.forEach, items),
            every: curry(noodles.every, items),
            some: curry(noodles.some, items)
        };
    };

    function async (fn) {
        setTimeout(fn, 15);
    }

    // `noodles.reduce` applies `iterFn` across each item in `items` from left
    // to right, accumulating the results. All the other functions provided by
    // `noodles` are based upon this one. It takes the following arguments:
    //
    //   * `items`: Array of items to reduce.
    //
    //   * `iterFn`: Function doing the reducing. Is passed four arguments on
    //     each iteration:
    //
    //       1. Accumulated result of reducing items thus far.
    //       2. The current item.
    //       3. Function which takes result of reducing the accumulation with
    //          the current item and continues the computation.
    //       4. Function which can be used to break out of the reduce iteration
    //          and send callback a final value prematurely.
    //
    //   * `callback`: Function which takes the resulting value once the
    //     iteration has finished (or was short circuited).
    //
    //   * `initial`: The starting value for reducing, or result if items is
    //     empty. This is optional, so long as items is not empty. If it is not
    //     provided, than the first element in items becomes the initial value.
    //
    // Here is an example use of `noodles.reduce` to find the sum of the numbers
    // in an array and log them to the console:
    //
    //     noodles.reduce([1,2,3,4,5,6,7,8,9,10], function (sum, n, next, exit) {
    //         next(sum + n);
    //     }, function (sum) {
    //         console.log("The sum is " + sum);
    //     }, 0);
    noodles.reduce = function (items, iterFn, callback, initial) {
        var start;
        callback = callback || function () {};

        // Be sure to make a copy of the `items` using `.concat()` so that
        // `.shift()` does not accidentally have side effects visible outside
        // this function.
        items = typeof initial !== "undefined"
            ? [initial].concat(items)
            : [].concat(items);

        start = +new Date();

        function next (res) {
            if ( (+new Date()) - start > 50 ) {
                // Keep from blocking if we run longer than 50ms.
                async(function () {
                    start = +new Date();
                    next(res);
                });
            } else {
                if ( items.length > 0 ) {
                    iterFn.call(res, res, items.shift(), next, function (res) {
                        callback.call(res, res);
                    });
                } else {
                    callback.call(res, res);
                }
            }
        }

        if ( items.length === 0 ) {
            throw new TypeError("noodles.reduce on empty array with no initial value.");
        } else {
            async(function () {
                next(items.shift());
            });
        }
    };

    // Create a new array with the results of calling `iterFn` on each of the
    // `items`. The order of `items` and their execution is preserved.
    //
    // Example using node's `fs` module:
    //
    //     var fs = require("fs");
    //     noodles.map(["a.txt", "b.txt", "c.txt"], function (file, next) {
    //         fs.readFile(file, "utf-8", function (err, data) {
    //             // Ignore errors for brevity.
    //             next(data);
    //         });
    //     }, function (fileBodies) {
    //         ...
    //     });
    noodles.map = function (items, iterFn, callback) {
        noodles.reduce(items, function (xs, x, next) {
            iterFn.call(x, x, function (res) {
                next(xs.concat(res));
            });
        }, callback, []);
    };

    // Create a new array which consists of only each item in `items` for which
    // `testFn(item)` is truthy. The order of `items` and execution is
    // preserved.
    noodles.filter = function (items, testFn, callback) {
        noodles.reduce(items, function (xs, x, next) {
            testFn.call(x, x, function (res) {
                if (res) {
                    next(xs.concat(x));
                } else {
                    next(xs);
                }
            });
        }, callback, []);
    };

    // Call `iterFn(item)` for each item in `items` (presumably for side
    // effects). The order of items and execution is preserved.
    //
    // Note that even though you aren't "returning" anything to the `next`
    // function passed to `iterFn`, you must still call it if you want iteration
    // to continue. If you would like to stop iteration prematurely, you should
    // call the `exit` function so that `callback` is still triggered. If you do
    // not call either `next` or `exit`, `callback` will never be called.
    //
    // Example:
    //
    //     noodles.forEach(someBigLongArray, function (item, index, next, exit) {
    //         if ( someCondition(item) ) {
    //             exit();
    //         } else {
    //             next();
    //         }
    //     }, function () {
    //         ...
    //     });
    noodles.forEach = function (items, iterFn, callback) {
        var i = 0;
        noodles.reduce(items, function (_, it, next, exit) {
            iterFn.call(it, it, i++, next, exit);
        }, function () {
            callback.call(items, items);
        }, null);
    };

    // TODO: some and every share a horrible amount of code. Need to come back
    // and clean them up and make them share.

    // Is `testFn(item)` true for every item in `items`? Note that it is
    // vacuously true that every item in an empty array passes the test.
    //
    // Example:
    //
    //     function siteIsUp (url, returns) {
    //         jQuery.ajax({
    //             url: url,
    //             success: function () {
    //                 returns(true);
    //             },
    //             error: function () {
    //                 returns(false);
    //             }
    //         });
    //     }
    //     var faveSites = ["http://news.ycombinator.com",
    //                      "http://google.com/reader",
    //                      "http://nytimes.com"];
    //     noodles.every(faveSites, siteIsUp, function (res) {
    //         if (res) {
    //             console.log("Time to waste time on the net...");
    //         } else {
    //             console.log("Oh noes! Not all of my fave sites are up!");
    //         }
    //     });
    noodles.every = function (items, testFn, callback) {
        if ( arguments.length < 3) {
            callback = testFn || function () {};
            testFn = function (o, next) {
                return next(!!o);
            };
        }
        try {
            noodles.reduce(items, function (_, it, next, exit) {
                testFn.call(it, it, function (res) {
                    if (res) {
                        next(true);
                    } else {
                        exit(false);
                    }
                });
            }, callback, true);
        } catch (e) {
            async(function () { callback(true); });
        }
    };

    // Does `iterFn(item)` return a truthy value for at least one item in
    // `items`?  Note that when the array is empty, there is no item in `items`
    // for which `testFn(item)` is true and so the result of calling
    // `noodles.some` on an empty array is false.
    noodles.some = function (items, testFn, callback) {
        if ( arguments.length < 3) {
            callback = testFn || function () {};
            testFn = function (o, next) {
                return next(!!o);
            };
        }
        try {
            noodles.reduce(items, function (_, it, next, exit) {
                testFn.call(it, it, function (res) {
                    if (res) {
                        exit(true);
                    } else {
                        next(false);
                    }
                });
            }, callback, false);
        } catch (e) {
            async(function () { callback(false); });
        }
    };

}(typeof exports === "object"
  ? exports
  : window));