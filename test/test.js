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
    noodles([1,2,3,4,5]).reduce(add, function (sum) {
        equal(sum, 15);
        start();
    });
});

module("map");

asyncTest("square each item in list", function () {
    noodles([1,2,3,4,5]).map(square, function (res) {
        deepEqual(res, [1,4,9,16,25]);
        start();
    });
});

module("filter");

asyncTest("removing odd numbers from the list", function () {
    noodles([1,2,3,4,5,6,7,8,9]).filter(isEven, function (res) {
        deepEqual(res, [2,4,6,8]);
        start();
    });
});

module("forEach");

asyncTest("incrementing a number", function () {
    var n = 0, i = 0, items = [1,2,3,4,5];

    function incr (el, index, next) {
        equal(el, items[i++]);
        n++;
        next();
    }

    noodles(items).forEach(incr, function () {
        equal(n, 5);
        start();
    });
});

module("every");

asyncTest("all items are even", function () {
    noodles([2,4,6,8]).every(isEven, function (res) {
        equal(res, true);
        start();
    });
});

module("some");

asyncTest("some items are even", function () {
    noodles([1,3,5,7,9]).some(isEven, function (res) {
        equal(res, false);
        start();
    });
});
