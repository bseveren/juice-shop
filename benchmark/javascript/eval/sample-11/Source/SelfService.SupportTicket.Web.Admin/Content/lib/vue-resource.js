(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.VueResource = factory());
}(this, (function () {
    'use strict';

    var RESOLVED = 0;
    var REJECTED = 1;
    var PENDING = 2;

    function Promise$1(executor) {

        this.state = PENDING;
        this.value = undefined;
        this.deferred = [];

        var promise = this;

        try {
            executor(function (x) {
                promise.resolve(x);
            }, function (r) {
                promise.reject(r);
            });
        } catch (e) {
            promise.reject(e);
        }
    }

    Promise$1.reject = function (r) {
        return new Promise$1(function (resolve, reject) {
            reject(r);
        });
    };

    Promise$1.resolve = function (x) {
        return new Promise$1(function (resolve, reject) {
            resolve(x);
        });
    };

    Promise$1.all = function all(iterable) {
        return new Promise$1(function (resolve, reject) {
            var count = 0,
                result = [];

            if (iterable.length === 0) {
                resolve(result);
            }

            function resolver(i) {
                return function (x) {
                    result[i] = x;
                    count += 1;

                    if (count === iterable.length) {
                        resolve(result);
                    }
                };
            }

            for (var i = 0; i < iterable.length; i += 1) {
                Promise$1.resolve(iterable[i]).then(resolver(i), reject);
            }
        });
    };

    Promise$1.race = function race(iterable) {
        return new Promise$1(function (resolve, reject) {
            for (var i = 0; i < iterable.length; i += 1) {
                Promise$1.resolve(iterable[i]).then(resolve, reject);
            }
        });
    };

    var p$1 = Promise$1.prototype;

    p$1.resolve = function resolve(x) {
        var promise = this;

        if (promise.state === PENDING) {
            if (x === promise) {
                throw new TypeError('Promise settled with itself.');
            }

            var called = false;

            try {
                var then = x && x['then'];

                if (x !== null && typeof x === 'object' && typeof then === 'function') {
                    then.call(x, function (x) {
                        if (!called) {
                            promise.resolve(x);
                        }
                        called = true;
                    }, function (r) {
                        if (!called) {
                            promise.reject(r);

    function timeout(request, next) {

        var timeout;

        if (request.timeout) {
            timeout = setTimeout(function () {
                request.abort();
            }, request.timeout);
        }

        next(function (response) {

            clearTimeout(timeout);
        });
    }
