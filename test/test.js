function add (a, b, returns) {
    returns(a + b);
}

function square (n, returns) {
    returns(n * n);
}

function isEven (n, returns) {
    returns(n % 2 === 0);
}

module("reduce");

asyncTest("Sum of numbers", function () {
    noodles.reduce([1,2,3,4,5], add, function (sum) {
        equal(sum, 15);
        noodles([1,2,3,4,5]).reduce(add, function (sum) {
            equal(sum, 15);
            start();
        });
    });
});

module("map");

asyncTest("square each item in list", function () {
    noodles.map([1,2,3,4,5], square, function (res) {
        deepEqual(res, [1,4,9,16,25]);
        noodles([1,2,3,4,5]).map(square, function (res) {
            deepEqual(res, [1,4,9,16,25]);
            start();
        });
    });
});

module("filter");

asyncTest("removing odd numbers from the list", function () {
    noodles.filter([1,2,3,4,5,6,7,8,9], isEven, function (res) {
        deepEqual(res, [2,4,6,8]);
        noodles([1,2,3,4,5,6,7,8,9]).filter(isEven, function (res) {
            deepEqual(res, [2,4,6,8]);
            start();
        });
    });
});

module("forEach");

asyncTest("incrementing a number", function () {
    var n = 0, items = [1,2,3,4,5];

    function incr (el, index, next) {
        equal(el, items.shift());
        n++;
        next();
    }

    noodles.forEach(items, incr, function () {
        equal(n, 5);
        items.push(1,2,3,4,5);
        noodles(items).forEach(incr, function () {
            equal(n, 10);
            start();
        });
    });
});

module("every");

asyncTest("all items are even", function () {
    var iterations = 0;
    noodles.every([1,2,3,4], function (n, returns) {
        iterations++;
        isEven(n, returns);
    }, function (res) {
        // Stopped after finding a single non-even number.
        equal(iterations, 1);
        equal(res, false);
        noodles([2,4,6,8]).every(isEven, function (res) {
            equal(res, true);
            start();
        });
    });
});

module("some");

asyncTest("some items are even", function () {
    var iterations = 0;
    noodles.some([1,2,3,4,5], function (n, returns) {
        iterations++;
        isEven(n, returns);
    }, function (res) {
        // Exited early once a single even number was found.
        equal(iterations, 2);
        ok(res);
        noodles([1,3,5,7,9]).some(isEven, function (res) {
            equal(res, false);
            start();
        });
    });
});
