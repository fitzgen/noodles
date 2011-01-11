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

(function (exports) {

    var slice = Array.prototype.slice;

    function async (fn) {
        setTimeout(fn, exports.noodles.TIMEOUT);
    }

    // `reduce` applies `iterFn` across each item in `items` from left to right,
    // accumulating the results. All the other functions provided by `noodles`
    // are based upon this one. It takes the following arguments:
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
    // Here is an example use of `reduce` to find the sum of the numbers in an
    // array and log them to the console:
    //
    //     noodles([1,2,3,4,5,6,7,8,9,10]).reduce(function (sum, n, next, exit) {
    //         next(sum + n);
    //     }, function (sum) {
    //         console.log("The sum is " + sum);
    //     }, 0);
    function reduce (iterFn, callback, initial) {
        callback = callback || function () {};
        var items = this.items,
            length = this.items.length,
            start = +new Date(),
            i = 0,
            iteratedOnce = false;

        function next (accumulation) {
            if ( (+new Date()) - start > exports.noodles.BATCH_TIME
                 && iteratedOnce ) {
                // Keep from blocking if we run longer than 50ms.
                async(function () {
                    start = +new Date();
                    iteratedOnce = false;
                    next(accumulation);
                });
            } else {
                if ( i < length ) {
                    iteratedOnce = true;
                    iterFn.call(accumulation,
                                accumulation,
                                items[i++],
                                next,
                                function (accumulation) {
                                    callback.call(accumulation, accumulation);
                                });
                } else {
                    callback.call(accumulation, accumulation);
                }
            }
        }

        if ( items.length === 0 ) {
            throw new TypeError("noodles: reduce on empty array with no initial value.");
        } else {
            async(function () {
                next(typeof initial !== "undefined"
                     ? initial
                     : items[i++]);
            });
        }
    }

    // Create a new array with the results of calling `iterFn` on each of the
    // `items`. The order of `items` and their execution is preserved.
    //
    // Example using node's `fs` module:
    //
    //     var fs = require("fs");
    //     noodles(["a.txt", "b.txt", "c.txt"]).map(function (file, next) {
    //         fs.readFile(file, "utf-8", function (err, data) {
    //             // Ignore errors for brevity.
    //             next(data);
    //         });
    //     }, function (fileBodies) {
    //         ...
    //     });
    function map (iterFn, callback) {
        this.reduce(function (xs, x, next) {
            iterFn.call(x, x, function (res) {
                xs.push(res);
                next(xs);
            });
        }, callback, []);
    }

    // Create a new array which consists of only each item in `items` for which
    // `testFn(item)` is truthy. The order of `items` and execution is
    // preserved.
    function filter (testFn, callback) {
        this.reduce(function (xs, x, next) {
            testFn.call(x, x, function (res) {
                if (res) {
                    next(xs.concat(x));
                } else {
                    next(xs);
                }
            });
        }, callback, []);
    }

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
    //     noodles(someBigLongArray).forEach(function (item, index, next, exit) {
    //         if ( someCondition(item) ) {
    //             exit();
    //         } else {
    //             next();
    //         }
    //     }, function () {
    //         ...
    //     });
    function forEach (iterFn, callback) {
        var i = 0, items = this.items;
        this.reduce(function (_, it, next, exit) {
            iterFn.call(it, it, i++, next, exit);
        }, function () {
            callback.call(items, items);
        }, null);
    }

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
    //     noodles(faveSites).every(siteIsUp, function (res) {
    //         if (res) {
    //             console.log("Time to waste time on the net...");
    //         } else {
    //             console.log("Oh noes! Not all of my fave sites are up!");
    //         }
    //     });
    function every (testFn, callback) {
        // Assume coercion to boolean for the `testFn` if only one function is passed.
        if ( arguments.length === 1 ) {
            callback = testFn;
            testFn = function (o, next) {
                return next(!!o);
            };
        }
        this.reduce(function (_, it, next, exit) {
            testFn.call(it, it, function (res) {
                if (res) {
                    next(true);
                } else {
                    exit(false);
                }
            });
        }, callback, true);
    }

    // Does `iterFn(item)` return a truthy value for at least one item in
    // `items`?  Note that when the array is empty, there is no item in `items`
    // for which `testFn(item)` is true and so the result of calling `some` on
    // an empty array is false.
    function some (testFn, callback) {
        // Assume coercion to boolean if testFn is not provided.
        if ( arguments.length === 1) {
            callback = testFn;
            testFn = function (o, next) {
                return next(!!o);
            };
        }
        this.reduce(function (_, it, next, exit) {
            testFn.call(it, it, function (res) {
                if (res) {
                    exit(true);
                } else {
                    next(false);
                }
            });
        }, callback, false);
    }

    function Noodle (items) {
        this.items = items;
    }

    // Globally exposed function.
    exports.noodles = function (items) {
        return new Noodle(items);
    };

    exports.noodles.prototype = Noodle.prototype = {
        reduce: reduce,
        map: map,
        filter: filter,
        forEach: forEach,
        every: every,
        some: some
    };

    // Configuration values for the ms time lengths of the `async` timeout and
    // batch processing respectively.
    exports.noodles.TIMEOUT = 15;
    exports.noodles.BATCH_TIME = 50;

}(typeof exports === "object"
  ? exports
  : this));