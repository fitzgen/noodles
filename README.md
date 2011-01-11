# `noodles`

Asynchronous, non-blocking, continuation-passing-style versions of the common
higher order functions in `Array.prototype`.

## `noodles(items).reduce(iterFn, callback [, initial])`

`reduce` applies `iterFn` across each item in `items` from left to right,
accumulating the results. All the other functions provided by `noodles` are
based upon this one. It takes the following arguments:

  * `items`: Array of items to reduce.

  * `iterFn`: Function doing the reducing. Is passed four arguments on each
    iteration:

      1. Accumulated result of reducing items thus far.

      2. The current item.

      3. Function which takes result of reducing the accumulation with the
         current item and continues the computation.

      4. Function which can be used to break out of the reduce iteration and
         send callback a final value prematurely.

  * `callback`: Function which takes the resulting value once the iteration has
    finished (or was short circuited).

  * `initial`: The starting value for reducing, or result if items is
    empty. This is optional, so long as `items` is not empty. If it is not
    provided, than the first element in `items` becomes the initial value.

Here is an example use of `reduce` to find the sum of the numbers in an
array and log them to the console:

    noodles([1,2,3,4,5,6,7,8,9,10]).reduce(function (sum, n, next, exit) {
        next(sum + n);
    }, function (sum) {
        console.log("The sum is " + sum);
    }, 0);

## `noodles(items).map(iterFn, callback)`

Create a new array with the results of calling `iterFn` on each of the
`items`. The order of `items` and their execution is preserved.

Here is an example using node's `fs` module:

    var fs = require("fs");
    noodles(["a.txt", "b.txt", "c.txt"]).map(function (file, next) {
        fs.readFile(file, "utf-8", function (err, data) {
            // Ignore errors for brevity.
            next(data);
        });
    }, function (fileBodies) {
        ...
    });

## `noodles(items).filter(testFn, callback)`

Create a new array which consists of only each item in `items` for which
`testFn(item)` is truthy. The order of `items` and execution is preserved.

## `noodles(items).forEach(iterFn, callback)`

Call `iterFn(item)` for each item in `items` (presumably for side effects). The
order of items and execution is preserved.

Note that even though you aren't "returning" anything to the `next` function
passed to `iterFn`, you must still call it if you want iteration to continue. If
you would like to stop iteration prematurely, you should call the `exit`
function so that `callback` is still triggered. If you do not call either `next`
or `exit`, `callback` will never be called.

Example:

    noodles(someBigLongArray).forEach(function (item, index, next, exit) {
        if ( someCondition(item) ) {
            exit();
        } else {
            next();
        }
    }, function () {
        ...
    });

## `noodles(items).every(testFn, callback)`

Is `testFn(item)` true for every item in `items`? Note that it is vacuously true
that every item in an empty array passes the test.

Example:

    function siteIsUp (url, returns) {
        jQuery.ajax({
            url: url,
            success: function () {
                returns(true);
            },
            error: function () {
                returns(false);
            }
        });
    }
    var faveSites = ["http://news.ycombinator.com",
                     "http://google.com/reader",
                     "http://nytimes.com"];
    noodles(faveSites).every(siteIsUp, function (res) {
        if (res) {
            console.log("Time to waste time on the net...");
        } else {
            console.log("Oh noes! Not all of my fave sites are up!");
        }
    });

## `noodles(items).some(testFn, callback)`

Does `iterFn(item)` return a truthy value for at least one item in `items`?
Note that when the array is empty, there is no item in `items` for which
`testFn(item)` is true and so the result of calling `some` on an empty
array is false.

