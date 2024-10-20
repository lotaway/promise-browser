(function (window) {
    if (window.Promise) return false;
    var _Promise = function (executor) {
        if (!(this instanceof _Promise)) {
            // throw new Error("Promise need to be instance");
            return new _Promise(executor);
        }
        var promise = this
            , excCallBack = function (data, status, targetArr) {
                promise["[[PromiseStatus]]"] = _Promise._status[status];
                promise["[[PromiseValue]]"] = data;
                promise._handler(targetArr);
            }
        ;
        promise["[[PromiseStatus]]"] = _Promise._status.pending;
        promise["[[PromiseValue]]"] = undefined;
        promise._then = [];
        promise._catch = [];
        executor(function (data) {
            excCallBack(data, "resolve", promise._then);
        }, function (err) {
            excCallBack(err, "reject", promise._catch);
        });
    };
    _Promise._status = {
        pending: "pending",
        resolve: "resolve",
        reject: "reject"
    };
    _Promise.resolve = function (data) {
        return new _Promise(function (resolve) {
            resolve(data);
        });
    };
    _Promise.reject = function (reason) {
        return new _Promise(function (resolve, reject) {
            reject(reason);
        });
    };
    //  所有结果成功才返回resolve，若有一个失败则返回reject
    _Promise.all = function (promiseArr) {
        if (promiseArr.length) {
            var thenCount = 0
                , hasCatch = false
                , dataArr = []
            ;
            return new _Promise(function (resolve, reject) {
                promiseArr.forEach(function (item, index) {
                    item.then(function (data) {
                        if (!hasCatch) {
                            dataArr[index] = data;
                            ++thenCount;
                            if (thenCount === promiseArr.length) {
                                resolve(dataArr);
                            }
                        }
                    }).catch(function (error) {
                        !hasCatch && (hasCatch = true) && reject(error);
                    });
                });
            });
        } else {
            throw new Error("param missing");
        }
    };
    //  无论是成功或失败，等待所有结果出来再返回resolve
    _Promise.allSettled = function (promiseArr) {
        if (promiseArr.length) {
            var settledCount = 0
                , resultArr = Array(promiseArr.length)
            ;
            return new _Promise(function (resolve, reject) {
                promiseArr.forEach(function (item, index) {
                    item.finally(function (result) {
                        resultArr[index] = result;
                        settledCount++;
                        if (settledCount === promiseArr.length) {
                            resolve(resultArr);
                        }
                    });
                });
            });
        } else {
            throw new Error("param missing");
        }
    }
    //  任意成功或失败就返回resolve/reject
    _Promise.race = function (promiseArr) {
        if (promiseArr.length) {
            var hasResult = false;
            return new _Promise(function (resolve, reject) {
                promiseArr.forEach(function (item) {
                    item.then(function (data) {
                        !hasResult && (hasResult = true) && resolve(data);
                    }).catch(function (error) {
                        !hasResult && (hasResult = true) && reject(error);
                    });
                });
            });
        } else {
            throw new Error("param missing");
        }
    };
    //  任意一个成功即返回resolve，所有都失败才返回reject
    _Promise.any = function (promiseArr) {
        if (promiseArr.length) {
            var hasThen = false
                , catchCount = 0
                , errorArr = Array(promiseArr.length)
            ;
            return new _Promise(function (resolve, reject) {
                promiseArr.forEach(function (item, index) {
                    item.then(function (data) {
                        !hasThen && (hasThen = true) && resolve(data);
                    }).catch(function (err) {
                        if (!hasThen) {
                            errorArr[index] = err;
                            catchCount++;
                            catchCount === promiseArr.length && reject(errorArr);
                        }
                    });
                });
            });
        }
    }
    //  如果抛出错误则将其包装为异步catch
    _Promise.try = function (callback) {
        try {
            return callback();
        } catch (error) {
            return Promise.reject(error);
        }
    }
    _Promise.prototype._handler = function (targetArr) {
        while (targetArr.length) {
            var nextObj = targetArr.shift()
                , result = nextObj.callback(this["[[PromiseValue]]"])
            ;
            if (result instanceof _Promise) {
                result.then(nextObj.resolve).catch(nextObj.reject);
            } else {
                nextObj.resolve(result);
            }
        }
    };
    _Promise.prototype._next = function (callback, targetArr, status) {
        var promise = this;
        return new _Promise(function (nextResolve, nextReject) {
            targetArr.push({
                callback: callback,
                resolve: nextResolve,
                reject: nextReject
            });
            status === _Promise._status.resolve && promise._catch.push({
                callback: nextReject,
                resolve: function () {
                },
                reject: function () {
                }
            });
            status === _Promise._status.reject && promise._then.push({
                callback: nextResolve,
                resolve: function () {
                },
                reject: function () {
                }
            });
            // promise["[[PromiseStatus]]"] === status ? promise._handler(targetArr) : "";
            promise["[[PromiseStatus]]"] === _Promise._status.resolve && promise._handler(promise._then);
            promise["[[PromiseStatus]]"] === _Promise._status.reject && promise._handler(promise._catch);
        });
    };
    _Promise.prototype.then = function (callback) {
        return this._next(callback || function (data) {
            return data;
        }, this._then, _Promise._status.resolve);
    };
    _Promise.prototype.catch = function (callback) {
        return this._next(callback || function (error) {
            return error;
        }, this._catch, _Promise._status.reject);
    };
    _Promise.prototype.finally = function (callback) {
        var promise = this;
        if (typeof callback !== "function") throw new Error("callback param error");
        return new _Promise(function (resolve, reject) {
            [{
                status: _Promise._status.resolve,
                handler: promise._then
            }, {
                status: _Promise._status.reject,
                handler: promise._catch
            }].forEach(function (target) {
                promise._next(callback || function (result) {
                    return result;
                }, target.handler, target.status).then(resolve).catch(reject);
            });
        });
    }
    window.Promise = _Promise;
})(window);