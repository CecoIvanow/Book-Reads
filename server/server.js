(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('http'), require('fs'), require('crypto')) :
        typeof define === 'function' && define.amd ? define(['http', 'fs', 'crypto'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Server = factory(global.http, global.fs, global.crypto));
}(this, (function (http, fs, crypto) {
    'use strict';

    function _interopDefaultLegacy(e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
    var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
    var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);

    class ServiceError extends Error {
        constructor(message = 'Service Error') {
            super(message);
            this.name = 'ServiceError';
        }
    }

    class NotFoundError extends ServiceError {
        constructor(message = 'Resource not found') {
            super(message);
            this.name = 'NotFoundError';
            this.status = 404;
        }
    }

    class RequestError extends ServiceError {
        constructor(message = 'Request error') {
            super(message);
            this.name = 'RequestError';
            this.status = 400;
        }
    }

    class ConflictError extends ServiceError {
        constructor(message = 'Resource conflict') {
            super(message);
            this.name = 'ConflictError';
            this.status = 409;
        }
    }

    class AuthorizationError extends ServiceError {
        constructor(message = 'Unauthorized') {
            super(message);
            this.name = 'AuthorizationError';
            this.status = 401;
        }
    }

    class CredentialError extends ServiceError {
        constructor(message = 'Forbidden') {
            super(message);
            this.name = 'CredentialError';
            this.status = 403;
        }
    }

    var errors = {
        ServiceError,
        NotFoundError,
        RequestError,
        ConflictError,
        AuthorizationError,
        CredentialError
    };

    const { ServiceError: ServiceError$1 } = errors;


    function createHandler(plugins, services) {
        return async function handler(req, res) {
            const method = req.method;
            console.info(`<< ${req.method} ${req.url}`);


            if (req.url.slice(-6) == '/admin') {
                res.writeHead(302, {
                    'Location': `http://${req.headers.host}/admin/`
                });
                return res.end();
            }

            let status = 200;
            let headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            };
            let result = '';
            let context;


            if (method == 'OPTIONS') {
                Object.assign(headers, {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Credentials': false,
                    'Access-Control-Max-Age': '86400',
                    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin'
                });
            } else {
                try {
                    context = processPlugins();
                    await handle(context);
                } catch (err) {
                    if (err instanceof ServiceError$1) {
                        status = err.status || 400;
                        result = composeErrorObject(err.code || status, err.message);
                    } else {


                        console.error(err);
                        status = 500;
                        result = composeErrorObject(500, 'Server Error');
                    }
                }
            }

            res.writeHead(status, headers);
            if (context != undefined && context.util != undefined && context.util.throttle) {
                await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
            }
            res.end(result);

            function processPlugins() {
                const context = { params: {} };
                plugins.forEach(decorate => decorate(context, req));
                return context;
            }

            async function handle(context) {
                const { serviceName, tokens, query, body } = await parseRequest(req);
                if (serviceName == 'admin') {
                    return ({ headers, result } = services['admin'](method, tokens, query, body));
                } else if (serviceName == 'favicon.ico') {
                    return ({ headers, result } = services['favicon'](method, tokens, query, body));
                }

                const service = services[serviceName];

                if (service === undefined) {
                    status = 400;
                    result = composeErrorObject(400, `Service "${serviceName}" is not supported`);
                    console.error('Missing service ' + serviceName);
                } else {
                    result = await service(context, { method, tokens, query, body });
                }



                if (result !== undefined) {
                    result = JSON.stringify(result);
                } else {
                    status = 204;
                    delete headers['Content-Type'];
                }
            }
        };
    }



    function composeErrorObject(code, message) {
        return JSON.stringify({
            code,
            message
        });
    }

    async function parseRequest(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokens = url.pathname.split('/').filter(x => x.length > 0);
        const serviceName = tokens.shift();
        const queryString = url.search.split('?')[1] || '';
        const query = queryString
            .split('&')
            .filter(s => s != '')
            .map(x => x.split('='))
            .reduce((p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v.replace(/\+/g, " ")) }), {});

        let body;

        if (req.readableEnded) {
            body = req.body;
        } else {
            body = await parseBody(req);
        }

        return {
            serviceName,
            tokens,
            query,
            body
        };
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    resolve(body);
                }
            });
        });
    }

    var requestHandler = createHandler;

    class Service {
        constructor() {
            this._actions = [];
            this.parseRequest = this.parseRequest.bind(this);
        }

        /**
         * Handle service request, after it has been processed by a request handler
         * @param {*} context Execution context, contains result of middleware processing
         * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
         */
        async parseRequest(context, request) {
            for (let { method, name, handler } of this._actions) {
                if (method === request.method && matchAndAssignParams(context, request.tokens[0], name)) {
                    return await handler(context, request.tokens.slice(1), request.query, request.body);
                }
            }
        }

        /**
         * Register service action
         * @param {string} method HTTP method
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        registerAction(method, name, handler) {
            this._actions.push({ method, name, handler });
        }

        /**
         * Register GET action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        get(name, handler) {
            this.registerAction('GET', name, handler);
        }

        /**
         * Register POST action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        post(name, handler) {
            this.registerAction('POST', name, handler);
        }

        /**
         * Register PUT action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        put(name, handler) {
            this.registerAction('PUT', name, handler);
        }

        /**
         * Register PATCH action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        patch(name, handler) {
            this.registerAction('PATCH', name, handler);
        }

        /**
         * Register DELETE action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        delete(name, handler) {
            this.registerAction('DELETE', name, handler);
        }
    }

    function matchAndAssignParams(context, name, pattern) {
        if (pattern == '*') {
            return true;
        } else if (pattern[0] == ':') {
            context.params[pattern.slice(1)] = name;
            return true;
        } else if (name == pattern) {
            return true;
        } else {
            return false;
        }
    }

    var Service_1 = Service;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var util = {
        uuid
    };

    const uuid$1 = util.uuid;


    const data = fs__default['default'].existsSync('./data') ? fs__default['default'].readdirSync('./data').reduce((p, c) => {
        const content = JSON.parse(fs__default['default'].readFileSync('./data/' + c));
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
            p[collection][endpoint] = content[endpoint];
        }
        return p;
    }, {}) : {};

    const actions = {
        get: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            return responseData;
        },
        post: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);


            let responseData = data;
            for (let token of tokens) {
                if (responseData.hasOwnProperty(token) == false) {
                    responseData[token] = {};
                }
                responseData = responseData[token];
            }

            const newId = uuid$1();
            responseData[newId] = Object.assign({}, body, { _id: newId });
            return responseData[newId];
        },
        put: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens.slice(0, -1)) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined && responseData[tokens.slice(-1)] !== undefined) {
                responseData[tokens.slice(-1)] = body;
            }
            return responseData[tokens.slice(-1)];
        },
        patch: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined) {
                Object.assign(responseData, body);
            }
            return responseData;
        },
        delete: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (responseData.hasOwnProperty(token) == false) {
                    return null;
                }
                if (i == tokens.length - 1) {
                    const body = responseData[token];
                    delete responseData[token];
                    return body;
                } else {
                    responseData = responseData[token];
                }
            }
        }
    };

    const dataService = new Service_1();
    dataService.get(':collection', actions.get);
    dataService.post(':collection', actions.post);
    dataService.put(':collection', actions.put);
    dataService.patch(':collection', actions.patch);
    dataService.delete(':collection', actions.delete);


    var jsonstore = dataService.parseRequest;

    /*
     * This service requires storage and auth plugins
     */

    const { AuthorizationError: AuthorizationError$1 } = errors;



    const userService = new Service_1();

    userService.get('me', getSelf);
    userService.post('register', onRegister);
    userService.post('login', onLogin);
    userService.get('logout', onLogout);


    function getSelf(context, tokens, query, body) {
        if (context.user) {
            const result = Object.assign({}, context.user);
            delete result.hashedPassword;
            return result;
        } else {
            throw new AuthorizationError$1();
        }
    }

    function onRegister(context, tokens, query, body) {
        return context.auth.register(body);
    }

    function onLogin(context, tokens, query, body) {
        return context.auth.login(body);
    }

    function onLogout(context, tokens, query, body) {
        return context.auth.logout();
    }

    var users = userService.parseRequest;

    const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } = errors;


    var crud = {
        get,
        post,
        put,
        patch,
        delete: del
    };


    function validateRequest(context, tokens, query) {
        /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
        if (tokens.length > 1) {
            throw new RequestError$1();
        }
    }

    function parseWhere(query) {
        const operators = {
            '<=': (prop, value) => record => record[prop] <= JSON.parse(value),
            '<': (prop, value) => record => record[prop] < JSON.parse(value),
            '>=': (prop, value) => record => record[prop] >= JSON.parse(value),
            '>': (prop, value) => record => record[prop] > JSON.parse(value),
            '=': (prop, value) => record => record[prop] == JSON.parse(value),
            ' like ': (prop, value) => record => record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
            ' in ': (prop, value) => record => JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
        };
        const pattern = new RegExp(`^(.+?)(${Object.keys(operators).join('|')})(.+?)$`, 'i');

        try {
            let clauses = [query.trim()];
            let check = (a, b) => b;
            let acc = true;
            if (query.match(/ and /gi)) {

                clauses = query.split(/ and /gi);
                check = (a, b) => a && b;
                acc = true;
            } else if (query.match(/ or /gi)) {

                clauses = query.split(/ or /gi);
                check = (a, b) => a || b;
                acc = false;
            }
            clauses = clauses.map(createChecker);

            return (record) => clauses
                .map(c => c(record))
                .reduce(check, acc);
        } catch (err) {
            throw new Error('Could not parse WHERE clause, check your syntax.');
        }

        function createChecker(clause) {
            let [match, prop, operator, value] = pattern.exec(clause);
            [prop, value] = [prop.trim(), value.trim()];

            return operators[operator.toLowerCase()](prop, value);
        }
    }


    function get(context, tokens, query, body) {
        validateRequest(context, tokens);

        let responseData;

        try {
            if (query.where) {
                responseData = context.storage.get(context.params.collection).filter(parseWhere(query.where));
            } else if (context.params.collection) {
                responseData = context.storage.get(context.params.collection, tokens[0]);
            } else {

                return context.storage.get();
            }

            if (query.sortBy) {
                const props = query.sortBy
                    .split(',')
                    .filter(p => p != '')
                    .map(p => p.split(' ').filter(p => p != ''))
                    .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));


                for (let i = props.length - 1; i >= 0; i--) {
                    let { prop, desc } = props[i];
                    responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
                        if (typeof propA == 'number' && typeof propB == 'number') {
                            return (propA - propB) * (desc ? -1 : 1);
                        } else {
                            return propA.localeCompare(propB) * (desc ? -1 : 1);
                        }
                    });
                }
            }

            if (query.offset) {
                responseData = responseData.slice(Number(query.offset) || 0);
            }
            const pageSize = Number(query.pageSize) || 10;
            if (query.pageSize) {
                responseData = responseData.slice(0, pageSize);
            }

            if (query.distinct) {
                const props = query.distinct.split(',').filter(p => p != '');
                responseData = Object.values(responseData.reduce((distinct, c) => {
                    const key = props.map(p => c[p]).join('::');
                    if (distinct.hasOwnProperty(key) == false) {
                        distinct[key] = c;
                    }
                    return distinct;
                }, {}));
            }

            if (query.count) {
                return responseData.length;
            }

            if (query.select) {
                const props = query.select.split(',').filter(p => p != '');
                responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                function transform(r) {
                    const result = {};
                    props.forEach(p => result[p] = r[p]);
                    return result;
                }
            }

            if (query.load) {
                const props = query.load.split(',').filter(p => p != '');
                props.map(prop => {
                    const [propName, relationTokens] = prop.split('=');
                    const [idSource, collection] = relationTokens.split(':');
                    console.log(`Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`);
                    const storageSource = collection == 'users' ? context.protectedStorage : context.storage;
                    responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                    function transform(r) {
                        const seekId = r[idSource];
                        const related = storageSource.get(collection, seekId);
                        delete related.hashedPassword;
                        r[propName] = related;
                        return r;
                    }
                });
            }

        } catch (err) {
            console.error(err);
            if (err.message.includes('does not exist')) {
                throw new NotFoundError$1();
            } else {
                throw new RequestError$1(err.message);
            }
        }

        context.canAccess(responseData);

        return responseData;
    }

    function post(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length > 0) {
            throw new RequestError$1('Use PUT to update records');
        }
        context.canAccess(undefined, body);

        body._ownerId = context.user._id;
        let responseData;

        try {
            responseData = context.storage.add(context.params.collection, body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function put(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.set(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function patch(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.merge(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function del(context, tokens, query, body) {
        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing);

        try {
            responseData = context.storage.delete(context.params.collection, tokens[0]);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    /*
     * This service requires storage and auth plugins
     */

    const dataService$1 = new Service_1();
    dataService$1.get(':collection', crud.get);
    dataService$1.post(':collection', crud.post);
    dataService$1.put(':collection', crud.put);
    dataService$1.patch(':collection', crud.patch);
    dataService$1.delete(':collection', crud.delete);

    var data$1 = dataService$1.parseRequest;

    const imgdata = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAPNnpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHja7ZpZdiS7DUT/uQovgSQ4LofjOd6Bl+8LZqpULbWm7vdnqyRVKQeCBAKBAFNm/eff2/yLr2hzMSHmkmpKlq9QQ/WND8VeX+38djac3+cr3af4+5fj5nHCc0h4l+vP8nJicdxzeN7Hxz1O43h8Gmi0+0T/9cT09/jlNuAeBs+XuMuAvQ2YeQ8k/jrhwj2Re3mplvy8hH3PKPr7SLl+jP6KkmL2OeErPnmbQ9q8Rmb0c2ynxafzO+eET7mC65JPjrM95exN2jmmlYLnophSTKLDZH+GGAwWM0cyt3C8nsHWWeG4Z/Tio7cHQiZ2M7JK8X6JE3t++2v5oj9O2nlvfApc50SkGQ5FDnm5B2PezJ8Bw1PUPvl6cYv5G788u8V82y/lPTgfn4CC+e2JN+Ds5T4ubzCVHu8M9JsTLr65QR5m/LPhvh6G/S8zcs75XzxZXn/2nmXvda2uhURs051x51bzMgwXdmIl57bEK/MT+ZzPq/IqJPEA+dMO23kNV50HH9sFN41rbrvlJu/DDeaoMci8ez+AjB4rkn31QxQxQV9u+yxVphRgM8CZSDDiH3Nxx2499oYrWJ6OS71jMCD5+ct8dcF3XptMNupie4XXXQH26nCmoZHT31xGQNy+4xaPg19ejy/zFFghgvG4ubDAZvs1RI/uFVtyACBcF3m/0sjlqVHzByUB25HJOCEENjmJLjkL2LNzQXwhQI2Ze7K0EwEXo59M0geRRGwKOMI292R3rvXRX8fhbuJDRkomNlUawQohgp8cChhqUWKIMZKxscQamyEBScaU0knM1E6WxUxO5pJrbkVKKLGkkksptbTqq1AjYiWLa6m1tobNFkyLjbsbV7TWfZceeuyp51567W0AnxFG1EweZdTRpp8yIayZZp5l1tmWI6fFrLDiSiuvsupqG6xt2WFHOCXvsutuj6jdUX33+kHU3B01fyKl1+VH1Diasw50hnDKM1FjRsR8cEQ8awQAtNeY2eJC8Bo5jZmtnqyInklGjc10thmXCGFYzsftHrF7jdy342bw9Vdx89+JnNHQ/QOR82bJm7j9JmqnGo8TsSsL1adWyD7Or9J8aTjbXx/+9v3/A/1vDUS9tHOXtLaM6JoBquRHJFHdaNU5oF9rKVSjYNewoFNsW032cqqCCx/yljA2cOy7+7zJ0biaicv1TcrWXSDXVT3SpkldUqqPIJj8p9oeWVs4upKL3ZHgpNzYnTRv5EeTYXpahYRgfC+L/FyxBphCmPLK3W1Zu1QZljTMJe5AIqmOyl0qlaFCCJbaPAIMWXzurWAMXiB1fGDtc+ld0ZU12k5cQq4v7+AB2x3qLlQ3hyU/uWdzzgUTKfXSputZRtp97hZ3z4EE36WE7WtjbqMtMr912oRp47HloZDlywxJ+uyzmrW91OivysrM1Mt1rZbrrmXm2jZrYWVuF9xZVB22jM4ccdaE0kh5jIrnzBy5w6U92yZzS1wrEao2ZPnE0tL0eRIpW1dOWuZ1WlLTqm7IdCESsV5RxjQ1/KWC/y/fPxoINmQZI8Cli9oOU+MJYgrv006VQbRGC2Ug8TYzrdtUHNjnfVc6/oN8r7tywa81XHdZN1QBUhfgzRLzmPCxu1G4sjlRvmF4R/mCYdUoF2BYNMq4AjD2GkMGhEt7PAJfKrH1kHmj8eukyLb1oCGW/WdAtx0cURYqtcGnNlAqods6UnaRpY3LY8GFbPeSrjKmsvhKnWTtdYKhRW3TImUqObdpGZgv3ltrdPwwtD+l1FD/htxAwjdUzhtIkWNVy+wBUmDtphwgVemd8jV1miFXWTpumqiqvnNuArCrFMbLPexJYpABbamrLiztZEIeYPasgVbnz9/NZxe4p/B+FV3zGt79B9S0Jc0Lu+YH4FXsAsa2YnRIAb2thQmGc17WdNd9cx4+y4P89EiVRKB+CvRkiPTwM7Ts+aZ5aV0C4zGoqyOGJv3yGMJaHXajKbOGkm40Ychlkw6c6hZ4s+SDJpsmncwmm8ChEmBWspX8MkFB+kzF1ZlgoGWiwzY6w4AIPDOcJxV3rtUnabEgoNBB4MbNm8GlluVIpsboaKl0YR8kGnXZH3JQZrH2MDxxRrHFUduh+CvQszakraM9XNo7rEVjt8VpbSOnSyD5dwLfVI4+Sl+DCZc5zU6zhrXnRhZqUowkruyZupZEm/dA2uVTroDg1nfdJMBua9yCJ8QPtGw2rkzlYLik5SBzUGSoOqBMJvwTe92eGgOVx8/T39TP0r/PYgfkP1IEyGVhYHXyJiVPU0skB3dGqle6OZuwj/Hw5c2gV5nEM6TYaAryq3CRXsj1088XNwt0qcliqNc6bfW+TttRydKpeJOUWTmmUiwJKzpr6hkVzzLrVs+s66xEiCwOzfg5IRgwQgFgrriRlg6WQS/nGyRUNDjulWsUbO8qu/lWaWeFe8QTs0puzrxXH1H0b91KgDm2dkdrpkpx8Ks2zZu4K1GHPpDxPdCL0RH0SZZrGX8hRKTA+oUPzQ+I0K1C16ZSK6TR28HUdlnfpzMsIvd4TR7iuSe/+pn8vief46IQULRGcHvRVUyn9aYeoHbGhEbct+vEuzIxhxJrgk1oyo3AFA7eSSSNI/Vxl0eLMCrJ/j1QH0ybj0C9VCn9BtXbz6Kd10b8QKtpTnecbnKHWZxcK2OiKCuViBHqrzM2T1uFlGJlMKFKRF1Zy6wMqQYtgKYc4PFoGv2dX2ixqGaoFDhjzRmp4fsygFZr3t0GmBqeqbcBFpvsMVCNajVWcLRaPBhRKc4RCCUGZphKJdisKdRjDKdaNbZfwM5BulzzCvyv0AsAlu8HOAdIXAuMAg0mWa0+0vgrODoHlm7Y7rXUHmm9r2RTLpXwOfOaT6iZdASpqOIXfiABLwQkrSPFXQgAMHjYyEVrOBESVgS4g4AxcXyiPwBiCF6g2XTPk0hqn4D67rbQVFv0Lam6Vfmvq90B3WgV+peoNRb702/tesrImcBCvIEaGoI/8YpKa1XmDNr1aGUwjDETBa3VkOLYVLGKeWQcd+WaUlsMdTdUg3TcUPvdT20ftDW4+injyAarDRVVRgc906sNTo1cu7LkDGewjkQ35Z7l4Htnx9MCkbenKiNMsif+5BNVnA6op3gZVZtjIAacNia+00w1ZutIibTMOJ7IISctvEQGDxEYDUSxUiH4R4kkH86dMywCqVJ2XpzkUYUgW3mDPmz0HLW6w9daRn7abZmo4QR5i/A21r4oEvCC31oajm5CR1yBZcIfN7rmgxM9qZBhXh3C6NR9dCS1PTMJ30c4fEcwkq0IXdphpB9eg4x1zycsof4t6C4jyS68eW7OonpSEYCzb5dWjQH3H5fWq2SH41O4LahPrSJA77KqpJYwH6pdxDfDIgxLR9GptCKMoiHETrJ0wFSR3Sk7yI97KdBVSHXeS5FBnYKIz1JU6VhdCkfHIP42o0V6aqgg00JtZfdK6hPeojtXvgfnE/VX0p0+fqxp2/nDfvBuHgeo7ppkrr/MyU1dT73n5B/qi76+lzMnVnHRJDeZOyj3XXdQrrtOUPQunDqgDlz+iuS3QDafITkJd050L0Hi2kiRBX52pIVso0ZpW1YQsT2VRgtxm9iiqU2qXyZ0OdvZy0J1gFotZFEuGrnt3iiiXvECX+UcWBqpPlgLRkdN7cpl8PxDjWseAu1bPdCjBSrQeVD2RHE7bRhMb1Qd3VHVXVNBewZ3Wm7avbifhB+4LNQrmp0WxiCNkm7dd7mV39SnokrvfzIr+oDSFq1D76MZchw6Vl4Z67CL01I6ZiX/VEqfM1azjaSkKqC+kx67tqTg5ntLii5b96TAA3wMTx2NvqsyyUajYQHJ1qkpmzHQITXDUZRGTYtNw9uLSndMmI9tfMdEeRgwWHB7NlosyivZPlvT5KIOc+GefU9UhA4MmKFXmhAuJRFVWHRJySbREImpQysz4g3uJckihD7P84nWtLo7oR4tr8IKdSBXYvYaZnm3ffhh9nyWPDa+zQfzdULsFlr/khrMb7hhAroOKSZgxbUzqdiVIhQc+iZaTbpesLXSbIfbjwXTf8AjbnV6kTpD4ZsMdXMK45G1NRiMdh/bLb6oXX+4rWHen9BW+xJDV1N+i6HTlKdLDMnVkx8tdHryus3VlCOXXKlDIiuOkimXnmzmrtbGqmAHL1TVXU73PX5nx3xhSO3QKtBqbd31iQHHBNXXrYIXHVyQqDGIcc6qHEcz2ieN+radKS9br/cGzC0G7g0YFQPGdqs7MI6pOt2BgYtt/4MNW8NJ3VT5es/izZZFd9yIfwY1lUubGSSnPiWWzDpAN+sExNptEoBx74q8bAzdFu6NocvC2RgK2WR7doZodiZ6OgoUrBoWIBM2xtMHXUX3GGktr5RtwPZ9tTWfleFP3iEc2hTar6IC1Y55ktYKQtXTsKkfgQ+al0aXBCh2dlCxdBtLtc8QJ4WUKIX+jlRR/TN9pXpNA1bUC7LaYUzJvxr6rh2Q7ellILBd0PcFF5F6uArA6ODZdjQYosZpf7lbu5kNFfbGUUY5C2p7esLhhjw94Miqk+8tDPgTVXX23iliu782KzsaVdexRSq4NORtmY3erV/NFsJU9S7naPXmPGLYvuy5USQA2pcb4z/fYafpPj0t5HEeD1y7W/Z+PHA2t8L1eGCCeFS/Ph04Hafu+Uf8ly2tjUNDQnNUIOqVLrBLIwxK67p3fP7LaX/LjnlniCYv6jNK0ce5YrPud1Gc6LQWg+sumIt2hCCVG3e8e5tsLAL2qWekqp1nKPKqKIJcmxO3oljxVa1TXVDVWmxQ/lhHHnYNP9UDrtFdwekRKCueDRSRAYoo0nEssbG3znTTDahVUXyDj+afeEhn3w/UyY0fSv5b8ZuSmaDVrURYmBrf0ZgIMOGuGFNG3FH45iA7VFzUnj/odcwHzY72OnQEhByP3PtKWxh/Q+/hkl9x5lEic5ojDGgEzcSpnJEwY2y6ZN0RiyMBhZQ35AigLvK/dt9fn9ZJXaHUpf9Y4IxtBSkanMxxP6xb/pC/I1D1icMLDcmjZlj9L61LoIyLxKGRjUcUtOiFju4YqimZ3K0odbd1Usaa7gPp/77IJRuOmxAmqhrWXAPOftoY0P/BsgifTmC2ChOlRSbIMBjjm3bQIeahGwQamM9wHqy19zaTCZr/AtjdNfWMu8SZAAAA13pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHjaPU9LjkMhDNtzijlCyMd5HKflgdRdF72/xmFGJSIEx9ihvd6f2X5qdWizy9WH3+KM7xrRp2iw6hLARIfnSKsqoRKGSEXA0YuZVxOx+QcnMMBKJR2bMdNUDraxWJ2ciQuDDPKgNDA8kakNOwMLriTRO2Alk3okJsUiidC9Ex9HbNUMWJz28uQIzhhNxQduKhdkujHiSJVTCt133eqpJX/6MDXh7nrXydzNq9tssr14NXuwFXaoh/CPiLRfLvxMyj3GtTgAAAGFaUNDUElDQyBwcm9maWxlAAB4nH2RPUjDQBzFX1NFKfUD7CDikKE6WRAVESepYhEslLZCqw4ml35Bk4YkxcVRcC04+LFYdXBx1tXBVRAEP0Dc3JwUXaTE/yWFFjEeHPfj3b3H3TtAqJeZanaMA6pmGclYVMxkV8WuVwjoRQCz6JeYqcdTi2l4jq97+Ph6F+FZ3uf+HD1KzmSATySeY7phEW8QT29aOud94hArSgrxOfGYQRckfuS67PIb54LDAs8MGenkPHGIWCy0sdzGrGioxFPEYUXVKF/IuKxw3uKslquseU/+wmBOW0lxneYwYlhCHAmIkFFFCWVYiNCqkWIiSftRD/+Q40+QSyZXCYwcC6hAheT4wf/gd7dmfnLCTQpGgc4X2/4YAbp2gUbNtr+PbbtxAvifgSut5a/UgZlP0mstLXwE9G0DF9ctTd4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC';
    const img = Buffer.from(imgdata, 'base64');

    var favicon = (method, tokens, query, body) => {
        console.log('serving favicon...');
        const headers = {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        };
        let result = img;

        return {
            headers,
            result
        };
    };

    var require$$0 = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: '';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type=\"module\">\nimport { html, render } from 'https://unpkg.com/lit-html@1.3.0?module';\nimport { until } from 'https://unpkg.com/lit-html@1.3.0/directives/until?module';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: 'POST',\r\n            headers: { 'Content-Type': 'application/json' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch('/' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get('data');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get('data/' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get('util/throttle');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post('util', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class=\"collection-list\">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href=\"javascript:void(0)\" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set(['_id']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from '//unpkg.com/page/page.mjs';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector('main');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class=\"col\">Loading&hellip;</div>`;\r\n    let viewer = html`<div class=\"col\">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class=\"col\">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class=\"layout\">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class=\"layout\">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class=\"col\">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>";

    const mode = process.argv[2] == '-dev' ? 'dev' : 'prod';

    const files = {
        index: mode == 'prod' ? require$$0 : fs__default['default'].readFileSync('./client/index.html', 'utf-8')
    };

    var admin = (method, tokens, query, body) => {
        const headers = {
            'Content-Type': 'text/html'
        };
        let result = '';

        const resource = tokens.join('/');
        if (resource && resource.split('.').pop() == 'js') {
            headers['Content-Type'] = 'application/javascript';

            files[resource] = files[resource] || fs__default['default'].readFileSync('./client/' + resource, 'utf-8');
            result = files[resource];
        } else {
            result = files.index;
        }

        return {
            headers,
            result
        };
    };

    /*
     * This service requires util plugin
     */

    const utilService = new Service_1();

    utilService.post('*', onRequest);
    utilService.get(':service', getStatus);

    function getStatus(context, tokens, query, body) {
        return context.util[context.params.service];
    }

    function onRequest(context, tokens, query, body) {
        Object.entries(body).forEach(([k, v]) => {
            console.log(`${k} ${v ? 'enabled' : 'disabled'}`);
            context.util[k] = v;
        });
        return '';
    }

    var util$1 = utilService.parseRequest;

    var services = {
        jsonstore,
        users,
        data: data$1,
        favicon,
        admin,
        util: util$1
    };

    const { uuid: uuid$2 } = util;


    function initPlugin(settings) {
        const storage = createInstance(settings.seedData);
        const protectedStorage = createInstance(settings.protectedData);

        return function decoreateContext(context, request) {
            context.storage = storage;
            context.protectedStorage = protectedStorage;
        };
    }


    /**
     * Create storage instance and populate with seed data
     * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
     */
    function createInstance(seedData = {}) {
        const collections = new Map();


        for (let collectionName in seedData) {
            if (seedData.hasOwnProperty(collectionName)) {
                const collection = new Map();
                for (let recordId in seedData[collectionName]) {
                    if (seedData.hasOwnProperty(collectionName)) {
                        collection.set(recordId, seedData[collectionName][recordId]);
                    }
                }
                collections.set(collectionName, collection);
            }
        }




        /**
         * Get entry by ID or list of all entries from collection or list of all collections
         * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
         * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
         * @return {Object} Matching entry.
         */
        function get(collection, id) {
            if (!collection) {
                return [...collections.keys()];
            }
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!id) {
                const entries = [...targetCollection.entries()];
                let result = entries.map(([k, v]) => {
                    return Object.assign(deepCopy(v), { _id: k });
                });
                return result;
            }
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            const entry = targetCollection.get(id);
            return Object.assign(deepCopy(entry), { _id: id });
        }

        /**
         * Add new entry to collection. ID will be auto-generated
         * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
         * @param {Object} data Value to store.
         * @return {Object} Original value with resulting ID under _id property.
         */
        function add(collection, data) {
            const record = assignClean({ _ownerId: data._ownerId }, data);

            let targetCollection = collections.get(collection);
            if (!targetCollection) {
                targetCollection = new Map();
                collections.set(collection, targetCollection);
            }
            let id = uuid$2();

            while (targetCollection.has(id)) {
                id = uuid$2();
            }

            record._createdOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Replace entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Record will be replaced!
         * @return {Object} Updated entry.
         */
        function set(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = targetCollection.get(id);
            const record = assignSystemProps(deepCopy(data), existing);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Modify entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Shallow merge will be performed!
         * @return {Object} Updated entry.
         */
        function merge(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = deepCopy(targetCollection.get(id));
            const record = assignClean(existing, data);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Delete entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @return {{_deletedOn: number}} Server time of deletion.
         */
        function del(collection, id) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            targetCollection.delete(id);

            return { _deletedOn: Date.now() };
        }

        /**
         * Search in collection by query object
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {Object} query Query object. Format {prop: value}.
         * @return {Object[]} Array of matching entries.
         */
        function query(collection, query) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            const result = [];

            for (let [key, entry] of [...targetCollection.entries()]) {
                let match = true;
                for (let prop in entry) {
                    if (query.hasOwnProperty(prop)) {
                        const targetValue = query[prop];

                        if (typeof targetValue === 'string' && typeof entry[prop] === 'string') {
                            if (targetValue.toLocaleLowerCase() !== entry[prop].toLocaleLowerCase()) {
                                match = false;
                                break;
                            }
                        } else if (targetValue != entry[prop]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    result.push(Object.assign(deepCopy(entry), { _id: key }));
                }
            }

            return result;
        }

        return { get, add, set, merge, delete: del, query };
    }


    function assignSystemProps(target, entry, ...rest) {
        const whitelist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let prop of whitelist) {
            if (entry.hasOwnProperty(prop)) {
                target[prop] = deepCopy(entry[prop]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }


    function assignClean(target, entry, ...rest) {
        const blacklist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let key in entry) {
            if (blacklist.includes(key) == false) {
                target[key] = deepCopy(entry[key]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }

    function deepCopy(value) {
        if (Array.isArray(value)) {
            return value.map(deepCopy);
        } else if (typeof value == 'object') {
            return [...Object.entries(value)].reduce((p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }), {});
        } else {
            return value;
        }
    }

    var storage = initPlugin;

    const { ConflictError: ConflictError$1, CredentialError: CredentialError$1, RequestError: RequestError$2 } = errors;

    function initPlugin$1(settings) {
        const identity = settings.identity;

        return function decorateContext(context, request) {
            context.auth = {
                register,
                login,
                logout
            };

            const userToken = request.headers['x-authorization'];
            if (userToken !== undefined) {
                let user;
                const session = findSessionByToken(userToken);
                if (session !== undefined) {
                    const userData = context.protectedStorage.get('users', session.userId);
                    if (userData !== undefined) {
                        console.log('Authorized as ' + userData[identity]);
                        user = userData;
                    }
                }
                if (user !== undefined) {
                    context.user = user;
                } else {
                    throw new CredentialError$1('Invalid access token');
                }
            }

            function register(body) {
                if (body.hasOwnProperty(identity) === false ||
                    body.hasOwnProperty('password') === false ||
                    body[identity].length == 0 ||
                    body.password.length == 0) {
                    throw new RequestError$2('Missing fields');
                } else if (context.protectedStorage.query('users', { [identity]: body[identity] }).length !== 0) {
                    throw new ConflictError$1(`A user with the same ${identity} already exists`);
                } else {
                    const newUser = Object.assign({}, body, {
                        [identity]: body[identity],
                        hashedPassword: hash(body.password)
                    });
                    const result = context.protectedStorage.add('users', newUser);
                    delete result.hashedPassword;

                    const session = saveSession(result._id);
                    result.accessToken = session.accessToken;

                    return result;
                }
            }

            function login(body) {
                const targetUser = context.protectedStorage.query('users', { [identity]: body[identity] });
                if (targetUser.length == 1) {
                    if (hash(body.password) === targetUser[0].hashedPassword) {
                        const result = targetUser[0];
                        delete result.hashedPassword;

                        const session = saveSession(result._id);
                        result.accessToken = session.accessToken;

                        return result;
                    } else {
                        throw new CredentialError$1('Login or password don\'t match');
                    }
                } else {
                    throw new CredentialError$1('Login or password don\'t match');
                }
            }

            function logout() {
                if (context.user !== undefined) {
                    const session = findSessionByUserId(context.user._id);
                    if (session !== undefined) {
                        context.protectedStorage.delete('sessions', session._id);
                    }
                } else {
                    throw new CredentialError$1('User session does not exist');
                }
            }

            function saveSession(userId) {
                let session = context.protectedStorage.add('sessions', { userId });
                const accessToken = hash(session._id);
                session = context.protectedStorage.set('sessions', session._id, Object.assign({ accessToken }, session));
                return session;
            }

            function findSessionByToken(userToken) {
                return context.protectedStorage.query('sessions', { accessToken: userToken })[0];
            }

            function findSessionByUserId(userId) {
                return context.protectedStorage.query('sessions', { userId })[0];
            }
        };
    }


    const secret = 'This is not a production server';

    function hash(string) {
        const hash = crypto__default['default'].createHmac('sha256', secret);
        hash.update(string);
        return hash.digest('hex');
    }

    var auth = initPlugin$1;

    function initPlugin$2(settings) {
        const util = {
            throttle: false
        };

        return function decoreateContext(context, request) {
            context.util = util;
        };
    }

    var util$2 = initPlugin$2;

    /*
     * This plugin requires auth and storage plugins
     */

    const { RequestError: RequestError$3, ConflictError: ConflictError$2, CredentialError: CredentialError$2, AuthorizationError: AuthorizationError$2 } = errors;

    function initPlugin$3(settings) {
        const actions = {
            'GET': '.read',
            'POST': '.create',
            'PUT': '.update',
            'PATCH': '.update',
            'DELETE': '.delete'
        };
        const rules = Object.assign({
            '*': {
                '.create': ['User'],
                '.update': ['Owner'],
                '.delete': ['Owner']
            }
        }, settings.rules);

        return function decorateContext(context, request) {

            const get = (collectionName, id) => {
                return context.storage.get(collectionName, id);
            };
            const isOwner = (user, object) => {
                return user._id == object._ownerId;
            };
            context.rules = {
                get,
                isOwner
            };
            const isAdmin = request.headers.hasOwnProperty('x-admin');

            context.canAccess = canAccess;

            function canAccess(data, newData) {
                const user = context.user;
                const action = actions[request.method];
                let { rule, propRules } = getRule(action, context.params.collection, data);

                if (Array.isArray(rule)) {
                    rule = checkRoles(rule, data);
                } else if (typeof rule == 'string') {
                    rule = !!(eval(rule));
                }
                if (!rule && !isAdmin) {
                    throw new CredentialError$2();
                }
                propRules.map(r => applyPropRule(action, r, user, data, newData));
            }

            function applyPropRule(action, [prop, rule], user, data, newData) {

                if (typeof rule == 'string') {
                    rule = !!eval(rule);
                }

                if (rule == false) {
                    if (action == '.create' || action == '.update') {
                        delete newData[prop];
                    } else if (action == '.read') {
                        delete data[prop];
                    }
                }
            }

            function checkRoles(roles, data, newData) {
                if (roles.includes('Guest')) {
                    return true;
                } else if (!context.user && !isAdmin) {
                    throw new AuthorizationError$2();
                } else if (roles.includes('User')) {
                    return true;
                } else if (context.user && roles.includes('Owner')) {
                    return context.user._id == data._ownerId;
                } else {
                    return false;
                }
            }
        };



        function getRule(action, collection, data = {}) {
            let currentRule = ruleOrDefault(true, rules['*'][action]);
            let propRules = [];


            const collectionRules = rules[collection];
            if (collectionRules !== undefined) {

                currentRule = ruleOrDefault(currentRule, collectionRules[action]);


                const allPropRules = collectionRules['*'];
                if (allPropRules !== undefined) {
                    propRules = ruleOrDefault(propRules, getPropRule(allPropRules, action));
                }


                const recordRules = collectionRules[data._id];
                if (recordRules !== undefined) {
                    currentRule = ruleOrDefault(currentRule, recordRules[action]);
                    propRules = ruleOrDefault(propRules, getPropRule(recordRules, action));
                }
            }

            return {
                rule: currentRule,
                propRules
            };
        }

        function ruleOrDefault(current, rule) {
            return (rule === undefined || rule.length === 0) ? current : rule;
        }

        function getPropRule(record, action) {
            const props = Object
                .entries(record)
                .filter(([k]) => k[0] != '.')
                .filter(([k, v]) => v.hasOwnProperty(action))
                .map(([k, v]) => [k, v[action]]);

            return props;
        }
    }

    var rules = initPlugin$3;

    var identity = "email";
    var protectedData = {
        users: {
            "35c62d76-8152-4626-8712-eeb96381bea8": {
                email: "peter@abv.bg",
                username: "Peter",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Peter',
                lastName: 'Ivanov'
            },
            "847ec027-f659-4086-8032-5173e2f9c93a": {
                email: "george@abv.bg",
                username: "George",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'George',
                lastName: 'Vladimirov'
            },
            "60f0cf0b-34b0-4abd-9769-8c42f830dffc": {
                email: "admin@abv.bg",
                username: "Admin",
                hashedPassword: "fac7060c3e17e6f151f247eacb2cd5ae80b8c36aedb8764e18a41bbdc16aa302",
                firstName: 'Admin',
                lastName: 'Admin'
            },
            "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b": {
                email: "sophia@abv.bg",
                username: "Sophia",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Sophia',
                lastName: 'Petrova'
            },
            "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d": {
                email: "liam@abv.bg",
                username: "Liam",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Liam',
                lastName: 'Johnson'
            },
            "aa11bb22-cc33-dd44-ee55-ff66aa11bb22": {
                email: "olivia@abv.bg",
                username: "Olivia",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Olivia',
                lastName: 'Williams'
            },
            "123e4567-e89b-12d3-a456-426614174000": {
                email: "noah@abv.bg",
                username: "Noah",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Noah',
                lastName: 'Brown'
            },
            "f47ac10b-58cc-4372-a567-0e02b2c3d479": {
                email: "emma@abv.bg",
                username: "Emma",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Emma',
                lastName: 'Davis'
            },
            "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f": {
                email: "michael@abv.bg",
                username: "Michael",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Michael',
                lastName: 'Wilson'
            },
            "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a": {
                email: "ava@abv.bg",
                username: "Ava",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Ava',
                lastName: 'Miller'
            },
            "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b": {
                email: "james@abv.bg",
                username: "James",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'James',
                lastName: 'Taylor'
            },
            "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c": {
                email: "isabella@abv.bg",
                username: "Isabella",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Isabella',
                lastName: 'Anderson'
            },
            "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d": {
                email: "benjamin@abv.bg",
                username: "Benjamin",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Benjamin',
                lastName: 'Thomas'
            },
            "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e": {
                email: "mia@abv.bg",
                username: "Mia",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Mia',
                lastName: 'Jackson'
            },
            "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f": {
                email: "william@abv.bg",
                username: "William",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'William',
                lastName: 'White'
            },
            "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a": {
                email: "charlotte@abv.bg",
                username: "Charlotte",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Charlotte',
                lastName: 'Harris'
            },
            "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b": {
                email: "ethan@abv.bg",
                username: "Ethan",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Ethan',
                lastName: 'Martin'
            },
            "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c": {
                email: "amelia@abv.bg",
                username: "Amelia",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Amelia',
                lastName: 'Thompson'
            },
            "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d": {
                email: "alexander@abv.bg",
                username: "Alexander",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Alexander',
                lastName: 'Garcia'
            },
            "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e": {
                email: "harper@abv.bg",
                username: "Harper",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Harper',
                lastName: 'Martinez'
            },
            "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f": {
                email: "daniel@abv.bg",
                username: "Daniel",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Daniel',
                lastName: 'Robinson'
            },
            "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a": {
                email: "abigail@abv.bg",
                username: "Abigail",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Abigail',
                lastName: 'Clark'
            },
            "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b": {
                email: "matthew@abv.bg",
                username: "Matthew",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Matthew',
                lastName: 'Rodriguez'
            },
            "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c": {
                email: "ella@abv.bg",
                username: "Ella",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1",
                firstName: 'Ella',
                lastName: 'Lewis'
            }
        },
        sessions: {
        }
    };
    var seedData = {
        books: {
            "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                title: "The Shining",
                author: "Stephen King",
                img: "https://assets.blogs.bsu.edu/wp-content/uploads/sites/25/2020/03/09153737/shining.jpg",
                createdOn: "1711929600000",
                _id: "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
                comments: [
                    "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b"
                ],
                summary: "Struggling writer Jack Torrance becomes winter caretaker at the isolated Overlook Hotel, bringing his wife and psychic son Danny. As supernatural forces amplify Jack's instability, Danny's 'shining' abilities become their only hope. King's masterpiece explores addiction, family trauma, and haunted places through relentless psychological horror."
            },
            "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "Beloved",
                author: "Toni Morrison",
                img: "https://m.media-amazon.com/images/I/51Qj9kPD4CL.jpg",
                createdOn: "1714521600000",
                _id: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                comments: [
                    "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
                    "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d"
                ],
                summary: "Former slave Sethe is haunted by her decision to kill her baby daughter rather than have her enslaved. When a mysterious young woman named Beloved appears, the family confronts suppressed memories of trauma. Morrison's ghost story explores slavery's psychological aftermath through poetic prose and magical realism."
            },
            "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "Dune",
                author: "Frank Herbert",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg",
                createdOn: "1717200000000",
                _id: "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                comments: [
                    "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e"
                ],
                summary: "On desert planet Arrakis, young Paul Atreides inherits stewardship of the universe's most valuable substance: spice. Betrayed by political rivals, he leads native Fremen in a revolution that fulfills ancient prophecies. Herbert's ecological epic blends politics, religion, and human evolution in a richly detailed sci-fi universe."
            },
            "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "Gone Girl",
                author: "Gillian Flynn",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1554086139i/19288043.jpg",
                createdOn: "1719792000000",
                _id: "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                comments: [
                    "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f"
                ],
                summary: "On their fifth anniversary, Nick Dunne reports his wife Amy missing amid growing media frenzy. As police scrutiny intensifies, alternating narratives reveal disturbing truths about their marriage. Flynn's psychological thriller deconstructs modern relationships with razor-sharp twists and unreliable narrators."
            },
            "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                title: "The Name of the Wind",
                author: "Patrick Rothfuss",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1270352123i/186074.jpg",
                createdOn: "1722470400000",
                _id: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                comments: [
                    "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
                    "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b"
                ],
                summary: "Chronicler tracks down legendary hero Kvothe to record his true story: from childhood troupe tragedy to University magic student and beyond. Rothfuss reinvents fantasy tropes through lyrical storytelling, music-infused magic, and layered myths. This bildungsroman balances wonder with harsh realities of genius and ambition."
            },
            "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "The Sun Also Rises",
                author: "Ernest Hemingway",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1692653547i/196840591.jpg",
                createdOn: "1725148800000",
                _id: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                comments: [],
                summary: "American expatriates in post-WWI Europe drift through Paris cafes and Spanish bullfights, masking spiritual emptiness with alcohol and aimless adventure. Jake Barnes' impotence from war wounds symbolizes the Lost Generation's disillusionment. Hemingway's sparse prose captures existential despair beneath surface bravado."
            },
            "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "The Brothers Karamazov",
                author: "Fyodor Dostoevsky",
                img: "https://images.penguinrandomhouse.com/cover/9780451530608",
                createdOn: "1727827200000",
                _id: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                comments: [
                    "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
                ],
                summary: "Dostoevsky's final novel explores patricide through philosophical debates among four brothers: sensual Dmitri, intellectual Ivan, spiritual Alyosha, and cunning Smerdyakov. Their conflicts over faith, ethics, and free will culminate in courtroom drama. This Russian classic probes humanity's capacity for good and evil with psychological depth."
            },
            "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "The Hitchhiker's Guide to the Galaxy",
                author: "Douglas Adams",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1559986152i/386162.jpg",
                createdOn: "1730419200000",
                _id: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                comments: [
                    "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                    "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
                ],
                summary: "Seconds before Earth's demolition for interstellar highway, Arthur Dent escapes with alien researcher Ford Prefect. Their cosmic adventures introduce depressed robot Marvin, two-headed president Zaphod Beeblebrox, and the answer to life (42). Adams' satire blends absurd humor with philosophical inquiry about existence."
            },
            "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "The Night Circus",
                author: "Erin Morgenstern",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1387124618i/9361589.jpg",
                createdOn: "1733097600000",
                _id: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                comments: [
                    "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
                ],
                summary: "Mysterious Le Cirque des Rêves appears without warning, featuring magical tents and ethereal performances. Behind its black-and-white spectacle, illusionists Celia and Marco compete in a deadly magical duel bound by mentors. Their growing love threatens the circus and all within it. Morgenstern crafts an atmospheric romance where magic has tangible costs."
            },
            "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "Educated",
                author: "Tara Westover",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
                createdOn: "1735689600000",
                _id: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                comments: [
                    "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                    "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b"
                ],
                summary: "Westover recounts her journey from Idaho survivalist family to Cambridge PhD, never attending school until age 17. Overcoming violent brother and distrustful parents, education becomes liberation from alternative facts. This memoir examines family loyalty versus self-invention with brutal honesty and lyrical insight."
            },
            "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                title: "The Chronicles of Narnia",
                author: "C.S. Lewis",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1449868701i/11127.jpg",
                createdOn: "1685577600000",
                _id: "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
                comments: [
                    "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e"
                ],
                summary: "Four siblings discover a magical wardrobe leading to Narnia, a frozen world under the White Witch's curse. With talking animals and mythical creatures, they join lion-god Aslan's struggle to reclaim the kingdom. This beloved allegorical series explores faith, sacrifice, and coming-of-age through seven interconnected fantasy adventures."
            },
            "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "Fahrenheit 451",
                author: "Ray Bradbury",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1383718290i/13079982.jpg",
                createdOn: "1688169600000",
                _id: "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                comments: [
                    "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                    "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a"
                ],
                summary: "In a dystopian future where firemen burn books to suppress dissenting ideas, Guy Montag begins questioning society after meeting free-thinking neighbors. His journey from enforcer to fugitive reveals the dangers of censorship and entertainment saturation. Bradbury's prescient vision explores memory, knowledge, and the power of literature in a screen-dominated world."
            },
            "5f6a7b8c-d9e0-1f2a-3b4c-5d6e7f8a9b0c": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "The Picture of Dorian Gray",
                author: "Oscar Wilde",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1546103428i/5297.jpg",
                createdOn: "1690848000000",
                _id: "5f6a7b8c-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                comments: [],
                summary: "Handsome Dorian Gray wishes his portrait would age instead of him, enabling a life of hedonism without physical consequences. As his soul corrupts, the painting grotesquely transforms to reflect his sins. Wilde's philosophical novel examines aestheticism, morality, and the dangerous pursuit of eternal youth through sharp wit and Gothic horror."
            },
            "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                title: "Jane Eyre",
                author: "Charlotte Brontë",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1557343311i/10210.jpg",
                createdOn: "1693526400000",
                _id: "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                comments: [
                    "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                    "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                    "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f"
                ],
                summary: "Orphaned Jane Eyre becomes governess at Thornfield Hall, developing a complex relationship with the brooding Mr. Rochester. Her moral convictions are tested by dark secrets, social constraints, and unexpected revelations. This groundbreaking Victorian novel explores class, gender equality, and spiritual integrity through Jane's first-person narrative."
            },
            "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "Wuthering Heights",
                author: "Emily Brontë",
                img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfw7MyU9SVnv6XPp6DUDQ98qhmCpYIY77Nqw&s",
                createdOn: "1696118400000",
                _id: "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                comments: [
                    "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a"
                ],
                summary: "On the stormy Yorkshire moors, Heathcliff's obsessive love for Catherine Earnshaw fuels generations of vengeance. Told through layered narratives, this Gothic masterpiece explores destructive passion, social class, and the haunting power of landscape. Brontë's only novel revolutionized romance fiction with its raw emotional intensity and complex antihero."
            },
            "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "The Kite Runner",
                author: "Khaled Hosseini",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1579036753i/77203.jpg",
                createdOn: "1698796800000",
                _id: "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                comments: [
                    "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                    "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0b"
                ],
                summary: "Amir's childhood betrayal of loyal friend Hassan haunts him through Afghanistan's turbulent history - from monarchy to Taliban rule. Returning to Kabul years later, he seeks redemption in this powerful story of guilt, atonement, and the enduring bonds of friendship. Hosseini's debut humanizes Middle Eastern conflicts through intimate personal drama."
            },
            "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "Slaughterhouse-Five",
                author: "Kurt Vonnegut",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1440319389i/4981.jpg",
                createdOn: "1701388800000",
                _id: "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                comments: [
                    "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d"
                ],
                summary: "Prisoner-of-war Billy Pilgrim becomes 'unstuck in time' after surviving the Dresden firebombing, experiencing his life out of sequence alongside alien encounters. Vonnegut's absurdist anti-war novel blends science fiction with autobiographical elements to process trauma. Famous for its refrain 'So it goes,' this postmodern classic questions free will and the senselessness of violence."
            },
            "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                title: "The Handmaid's Tale",
                author: "Margaret Atwood",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1578028274i/38447.jpg",
                createdOn: "1704067200000",
                _id: "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                comments: [
                    "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                    "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                    "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a"
                ],
                summary: "In theocratic Gilead (formerly USA), fertile 'handmaid' Offred serves as a reproductive vessel for powerful men. Her clandestine memories of family and freedom fuel resistance against a regime that controls women's bodies and language. Atwood's dystopian vision explores gender oppression, religious extremism, and the fragility of rights through harrowing first-person narration."
            },
            "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "The Road",
                author: "Cormac McCarthy",
                img: "https://m.media-amazon.com/images/I/61kKUlUoQHL._UF894,1000_QL80_.jpg",
                createdOn: "1706745600000",
                _id: "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                comments: [
                    "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b"
                ],
                summary: "A father and son traverse a post-apocalyptic America destroyed by an unspecified cataclysm. Carrying minimal supplies and a pistol, they face starvation, cannibal gangs, and fading hope while heading south. McCarthy's spare prose amplifies this devastating meditation on survival, morality, and paternal love in a world stripped of civilization."
            },
            "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "One Hundred Years of Solitude",
                author: "Gabriel García Márquez",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327881361i/320.jpg",
                createdOn: "1709251200000",
                _id: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
                comments: [
                    "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                    "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d"
                ],
                summary: "The magical history of Macondo chronicles seven generations of the Buendía family, blending reality with fantastical elements. From founding to decline, their lives intertwine with civil wars, inventions, and prophecies in this seminal work of magical realism. Márquez explores cyclical time, political turmoil, and the solitude inherent in the human condition."
            },
            "e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "Moby Dick",
                author: "Herman Melville",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1327940656i/153747.jpg",
                createdOn: "1672531200000",
                _id: "e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b",
                comments: [
                    "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
                    "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d"
                ],
                summary: "The epic tale of Captain Ahab's obsessive quest to hunt the white whale Moby Dick, told through the eyes of sailor Ishmael. This masterpiece explores themes of revenge, fate, and man's struggle against nature, set against the backdrop of 19th-century whaling culture with rich symbolism and philosophical depth."
            },
            "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "Frankenstein",
                author: "Mary Shelley",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1381512375i/18490.jpg",
                createdOn: "1675209600000",
                _id: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
                comments: [
                    "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                    "2c3d4e5f-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
                    "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a"
                ],
                summary: "A young scientist's ambition leads him to create life from dead body parts, resulting in a creature rejected by its creator and society. This gothic novel explores themes of scientific ethics, parental responsibility, and the destructive consequences of prejudice and isolation."
            },
            "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "Crime and Punishment",
                author: "Fyodor Dostoevsky",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1382846449i/7144.jpg",
                createdOn: "1677628800000",
                _id: "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                comments: [
                    "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b"
                ],
                summary: "A destitute former student murders a pawnbroker, believing himself exempt from moral laws. As he navigates St. Petersburg's underworld, his guilt manifests in psychological torment. This psychological thriller explores morality, redemption, and the human capacity for rationalization in 19th-century Russia."
            },
            "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "The Odyssey",
                author: "Homer",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1390173285i/1381.jpg",
                createdOn: "1680307200000",
                _id: "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                comments: [
                    "5f6a7b8c-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                    "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d"
                ],
                summary: "The epic journey of Greek hero Odysseus as he struggles to return home after the Trojan War. Facing mythical creatures, vengeful gods, and treacherous seas over ten years, this foundational work explores themes of heroism, cunning versus strength, loyalty, and the meaning of homecoming."
            },
            "2c3d4e5f-a6b7-8c9d-0e1f-2a3b4c5d6e7f": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "Alice's Adventures in Wonderland",
                author: "Lewis Carroll",
                img: "https://m.media-amazon.com/images/I/81svZOFopwL._SY466_.jpg",
                createdOn: "1682899200000",
                _id: "2c3d4e5f-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
                comments: [],
                summary: "A young girl follows a white rabbit down a hole into a fantastical world where logic is inverted and absurdity reigns. Through encounters with iconic characters like the Mad Hatter and Cheshire Cat, this children's classic explores themes of identity, growth, and the subversion of Victorian social norms through surreal wordplay and symbolic imagery."
            },
            "fdd2faf9-c0f2-4c79-b799-9121ca0ad36d": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "To Kill a Mockingbird",
                author: "Harper Lee",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1553383690i/2657.jpg",
                createdOn: "1751236331451",
                _id: "fdd2faf9-c0f2-4c79-b799-9121ca0ad36d",
                comments: [
                    "d7bd20b8-1ee1-4178-a8e7-0014f8f6afa5",
                    "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b"
                ],
                summary: "Set in 1930s Alabama, this Pulitzer Prize-winning novel follows young Scout Finch as her lawyer father Atticus defends Tom Robinson, a Black man falsely accused of raping a white woman. Through Scout's innocent perspective, the story explores themes of racial injustice, moral growth, and the loss of innocence in a deeply segregated society. The children's fascination with their reclusive neighbor Boo Radley provides a parallel narrative about prejudice and human kindness."
            },
            "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "1984",
                author: "George Orwell",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1657781256i/61439040.jpg",
                createdOn: "1577884800000",
                _id: "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
                comments: [
                    "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
                    "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d"
                ],
                summary: "In a dystopian future London, Winston Smith works for the totalitarian Party that controls every aspect of life through omnipresent surveillance and psychological manipulation. As Winston secretly rebels by keeping a diary and pursuing a forbidden relationship, he discovers the terrifying extent of the Party's power to rewrite history and control thought. The novel's concepts of Newspeak, doublethink, and Big Brother have become fundamental to discussions about government overreach and individual freedom."
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1490528560i/4671.jpg",
                createdOn: "1583020800000",
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                comments: [
                    "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c"
                ],
                summary: "Narrated by Nick Carraway, this Jazz Age classic explores the mysterious millionaire Jay Gatsby and his obsessive pursuit of Daisy Buchanan, his lost love from years past. Through lavish parties at Gatsby's West Egg mansion and tense encounters in New York City, Fitzgerald reveals the hollow excess and moral decay beneath the glittering surface of the Roaring Twenties. The novel's exploration of the American Dream, class barriers, and romantic idealism culminates in a tragic confrontation that exposes the emptiness of wealth without purpose."
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "Pride and Prejudice",
                author: "Jane Austen",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1320399351i/1885.jpg",
                createdOn: "1585699200000",
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                comments: [
                    "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b",
                    "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f"
                ],
                summary: "The spirited Elizabeth Bennet navigates the complexities of social expectations and romantic entanglements in Regency England. Her initial dislike for the proud Mr. Darcy transforms through a series of misunderstandings, family crises, and revelations about true character. Austen's witty social commentary explores themes of marriage, class, reputation, and personal growth as Elizabeth learns to distinguish between superficial charm and genuine virtue."
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                title: "The Hobbit",
                author: "J.R.R. Tolkien",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1546071216i/5907.jpg",
                createdOn: "1590969600000",
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                comments: [
                    "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c",
                    "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a"
                ],
                summary: "The comfortable life of Bilbo Baggins is disrupted when the wizard Gandalf recruits him as a 'burglar' for a quest to reclaim the Lonely Mountain from the dragon Smaug. Accompanied by thirteen dwarves led by Thorin Oakenshield, Bilbo journeys through treacherous lands, encountering trolls, elves, goblins, and the mysterious Gollum. Through these trials, the reluctant hobbit discovers unexpected courage, resourcefulness, and the corrupting power of treasure."
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "Harry Potter and the Sorcerer's Stone",
                author: "J.K. Rowling",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1474154022i/3.jpg",
                createdOn: "1596240000000",
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                comments: [
                    "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                    "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b"
                ],
                summary: "Harry Potter discovers on his eleventh birthday that he is a famous wizard, rescued from his neglectful Muggle relatives to attend Hogwarts School of Witchcraft and Wizardry. As he befriends Ron Weasley and Hermione Granger, Harry learns about his parents' murder by the dark wizard Voldemort and his own mysterious connection to the evil sorcerer. Their first year culminates in a quest to protect the Sorcerer's Stone from falling into Voldemort's hands, revealing hidden strengths and loyalties."
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                title: "Animal Farm",
                author: "George Orwell",
                img: "https://images.penguinrandomhouse.com/cover/9780452284241",
                createdOn: "1601510400000",
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                comments: [
                    "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
                    "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c"
                ],
                summary: "When the mistreated animals of Manor Farm revolt against their human owner Mr. Jones, they establish an egalitarian society under the principles of Animalism. As the pigs Napoleon and Snowball vie for leadership, the revolution gradually corrupts into a new tyranny more oppressive than the original. Orwell's allegorical novella traces how ideals of equality become twisted through propaganda, rewritten history, and the consolidation of power by a ruling elite."
            },
            "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "The Diary of a Young Girl",
                author: "Anne Frank",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1560816565i/48855.jpg",
                createdOn: "1606780800000",
                _id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                comments: [
                    "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e"
                ],
                summary: "Discovered in the attic where she spent the last years of her life, Anne Frank's remarkable diary documents her experiences hiding with her family during the Nazi occupation of the Netherlands. Written between ages 13-15 while confined in the Secret Annex, the diary reveals Anne's thoughts on family dynamics, budding sexuality, human nature, and her aspirations to become a writer. This intimate account personalizes the Holocaust while showcasing the resilience of the human spirit under unimaginable circumstances."
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "The Alchemist",
                author: "Paulo Coelho",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1466865542i/18144590.jpg",
                createdOn: "1612051200000",
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                comments: [
                    "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
                    "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f"
                ],
                summary: "Santiago, an Andalusian shepherd boy, embarks on a journey to Egypt after a recurring dream about treasure near the Pyramids. Along his odyssey across the Mediterranean and Sahara, he encounters a series of mentors who teach him to listen to his heart, recognize omens, and understand the Soul of the World. This allegorical novel explores themes of destiny, personal legend, and the idea that when you pursue your dreams, the universe conspires to help you achieve them."
            },
            "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "The Little Prince",
                author: "Antoine de Saint-Exupéry",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1367545443i/157993.jpg",
                createdOn: "1617321600000",
                _id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                comments: [
                    "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                    "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d"
                ],
                summary: "After crash-landing in the Sahara Desert, a stranded pilot meets a curious little prince who has traveled from his tiny asteroid home. Through their conversations, the prince recounts his interstellar journey visiting various planets inhabited by symbolic adult characters representing vanity, greed, and narrow-mindedness. This poetic fable explores profound themes of love, loss, friendship, and the importance of seeing with the heart rather than just the eyes."
            },
            "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                title: "The Book Thief",
                author: "Markus Zusak",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1522157426i/19063.jpg",
                createdOn: "1622592000000",
                _id: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                comments: [
                    "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                    "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a"
                ],
                summary: "Narrated by Death, this WWII novel follows Liesel Meminger, a young girl in Nazi Germany who finds solace by stealing books and sharing them with others. After being sent to live with foster parents in Munich, she forms powerful bonds with her accordion-playing foster father, her neighbor Rudy, and Max, the Jewish refugee hidden in their basement. Through the power of words and storytelling, Liesel preserves her humanity in a time of devastating cruelty and loss."
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                title: "The Da Vinci Code",
                author: "Dan Brown",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1579621267i/968.jpg",
                createdOn: "1627862400000",
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                comments: [
                    "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                    "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b"
                ],
                summary: "Harvard symbologist Robert Langdon finds himself embroiled in a murder investigation at the Louvre Museum after the curator is killed with mysterious symbols carved into his body. Teaming up with cryptologist Sophie Neveu, they uncover clues hidden in Da Vinci's paintings that lead to a centuries-old secret society protecting a religious secret that could shatter Christianity's foundations. Their breathless race through Paris and London pits them against a secret Catholic organization determined to silence them at any cost."
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                title: "The Hunger Games",
                author: "Suzanne Collins",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1586722975i/2767052.jpg",
                createdOn: "1633132800000",
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                comments: [
                    "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c"
                ],
                summary: "In the dystopian nation of Panem, teenager Katniss Everdeen volunteers for the Hunger Games to save her younger sister from participating in the annual televised death match. Forced into an arena with 23 other tributes, Katniss must use her hunting skills and instincts to survive while navigating complex alliances and the Capitol's manipulative game-making. Her actions spark unexpected political consequences that challenge the Capitol's absolute control over the oppressed districts."
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                title: "Brave New World",
                author: "Aldous Huxley",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1575509280i/5129.jpg",
                createdOn: "1638403200000",
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                comments: [
                    "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                    "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e"
                ],
                summary: "Set in a futuristic World State where humans are genetically engineered and conditioned for predetermined social roles, this dystopian novel explores a society obsessed with stability, pleasure, and consumption. When Bernard Marx brings John the Savage—a man born naturally outside this controlled system—from a reservation into London, his presence exposes the profound costs of this engineered utopia. The ensuing conflict questions the value of truth, art, suffering, and what it means to be truly human."
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                title: "The Catcher in the Rye",
                author: "J.D. Salinger",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1398034300i/5107.jpg",
                createdOn: "1643673600000",
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                comments: [
                    "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                    "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a"
                ],
                summary: "After being expelled from prep school, disillusioned teenager Holden Caulfield spends three days wandering New York City, reflecting on his encounters with teachers, classmates, and strangers. Through his distinctive cynical voice and recurring expressions of disgust for 'phonies,' Holden reveals his deep alienation and struggle with the transition to adulthood. His fantasy of being 'the catcher in the rye'—protecting children from falling off a cliff into adulthood—symbolizes his desire to preserve innocence in a world he finds corrupt and artificial."
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "The Lord of the Rings",
                author: "J.R.R. Tolkien",
                img: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1566425108i/33.jpg",
                createdOn: "1648944000000",
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                comments: [
                    "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                    "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d"
                ],
                summary: "In this epic fantasy trilogy, a young hobbit named Frodo Baggins inherits the One Ring, a powerful artifact created by the Dark Lord Sauron to dominate Middle-earth. Joined by a diverse fellowship including humans, elves, dwarves, and other hobbits, Frodo embarks on a perilous journey to Mount Doom to destroy the ring. Their quest becomes a sweeping battle between good and evil that explores themes of power, corruption, friendship, and sacrifice across richly imagined kingdoms and cultures."
            }
        },
        comments: {
            "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b": {
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
                content: "The 'redrum' scene still terrifies me decades later. Masterclass in psychological tension.",
                _id: "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b"
            },
            "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                content: "The ghost metaphor for intergenerational trauma is devastatingly effective. Morrison's prose is transcendent.",
                _id: "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c"
            },
            "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                content: "Found the non-linear structure challenging but rewarding. The last paragraph shattered me.",
                _id: "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d"
            },
            "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e": {
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                content: "The sandworm ecology and spice politics create unparalleled world-building depth. Sci-fi at its best!",
                _id: "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e"
            },
            "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f": {
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                content: "The 'Cool Girl' monologue should be required reading on gender performance. Terrifyingly sharp.",
                _id: "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f"
            },
            "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                content: "Kvothe's music-magic system feels fresh and emotionally resonant. The lute descriptions are magical.",
                _id: "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a"
            },
            "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b": {
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                content: "Sometimes the descriptions drag, but the frame story payoff makes it worthwhile.",
                _id: "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b"
            },
            "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c": {
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                content: "The Grand Inquisitor chapter alone justifies the page count. Philosophical gold.",
                _id: "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
            },
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                content: "The Vogon poetry scene made me laugh out loud on public transit. Adams' wit is timeless.",
                _id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
            },
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e": {
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                content: "Marvin the depressed robot is my spirit animal. Perfect satire of AI anxiety.",
                _id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
            },
            "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f": {
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                content: "The ice garden descriptions are breathtaking. Wish the romance had more development though.",
                _id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                content: "Her description of first hearing about the Holocaust broke me. Essential reading on education's power.",
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a"
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                content: "The tension between self-invention and family loyalty is handled with incredible nuance. Courageous writing.",
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b"
            },
            "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e": {
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
                content: "Aslan's sacrifice scene still gives me chills decades after first reading. Timeless allegory!",
                _id: "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e"
            },
            "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                content: "Unsettling how accurately Bradbury predicted earbuds, wall-sized TVs, and shortened attention spans.",
                _id: "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f"
            },
            "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a": {
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                content: "The mechanical hound terrified me more than any horror monster. Chilling commentary on technology.",
                _id: "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a"
            },
            "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d": {
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                content: "Jane's 'I am no bird' declaration is one of literature's most powerful feminist moments. Iconic!",
                _id: "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d"
            },
            "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e": {
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                content: "The madwoman in the attic trope hasn't aged well, but Jane's moral compass remains inspiring.",
                _id: "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e"
            },
            "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f": {
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                content: "Rochester's flaws make him fascinating. Their dynamic was way ahead of its time.",
                _id: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f"
            },
            "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a": {
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "7b8c9d0e-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                content: "Heathcliff and Cathy's toxic relationship is frustrating but impossible to look away from.",
                _id: "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a"
            },
            "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b": {
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                content: "The pomegranate tree scene shattered me. Hosseini makes you feel every moment of guilt and redemption.",
                _id: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b"
            },
            "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0b": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "8c9d0e1f-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                content: "Amir's cowardice made me furious, which shows how effectively Hosseini crafts emotional stakes.",
                _id: "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0b"
            },
            "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d": {
                _ownerId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
                bookId: "9d0e1f2a-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                content: "The Tralfamadorian sections are genius - dark humor making war's absurdity bearable.",
                _id: "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d"
            },
            "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e": {
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                content: "The Latin phrase 'Nolite te bastardes carborundorum' gave me chills. Brilliant world-building.",
                _id: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e"
            },
            "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f": {
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                content: "Offred's stolen butter as hand lotion - such small details make the oppression feel visceral.",
                _id: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f"
            },
            "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a": {
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                content: "The historical notes ending reframes everything. Atwood reminds us all regimes eventually fall.",
                _id: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a"
            },
            "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b": {
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                content: "McCarthy's minimalist style perfectly captures the bleakness. The canned peaches scene destroyed me.",
                _id: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b"
            },
            "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c": {
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
                content: "Rebecca eating earth! Remedios ascending! Magical realism at its most inventive.",
                _id: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c"
            },
            "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
                content: "The cyclical structure makes rereads essential - new connections emerge every time.",
                _id: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d"
            },
            "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c": {
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b",
                content: "The whale hunting chapters dragged for me, but Ahab's obsession makes this worth reading.",
                _id: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c"
            },
            "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d": {
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b",
                content: "Melville's prose is dense but rewarding. The final chase scene is one of literature's most thrilling sequences!",
                _id: "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d"
            },
            "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
                content: "Surprisingly modern themes about scientific responsibility. The creature's perspective chapters are heartbreaking.",
                _id: "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e"
            },
            "2c3d4e5f-a6b7-8c9d-0e1f-2a3b4c5d6e7f": {
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
                content: "The moral ambiguity here is fascinating - who's the real monster? Still relevant after 200 years.",
                _id: "2c3d4e5f-a6b7-8c9d-0e1f-2a3b4c5d6e7f"
            },
            "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
                content: "Expected horror but got profound philosophy instead. Victor's arrogance is infuriating though.",
                _id: "3d4e5f6a-b7c8-9d0e-1f2a-3b4c5d6e7f8a"
            },
            "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "0a1b2c3d-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
                content: "Raskolnikov's psychological unraveling is masterfully written. The police interrogation scenes are tense!",
                _id: "4e5f6a7b-c8d9-0e1f-2a3b-4c5d6e7f8a9b"
            },
            "5f6a7b8c-d9e0-1f2a-3b4c-5d6e7f8a9b0c": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                content: "The Cyclops encounter still gives me chills! Ancient but surprisingly accessible in good translation.",
                _id: "5f6a7b8c-d9e0-1f2a-3b4c-5d6e7f8a9b0c"
            },
            "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d": {
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "1b2c3d4e-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
                content: "Penelope's weaving trick is one of the smartest moves in classical literature. Timeless cleverness!",
                _id: "6a7b8c9d-e0f1-2a3b-4c5d-6e7f8a9b0c1d"
            },
            "d7bd20b8-1ee1-4178-a8e7-0014f8f6afa5": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "fdd2faf9-c0f2-4c79-b799-9121ca0ad36d",
                content: "This book really shows the racial discrimination in America during the 30s, I loved the book.",
                _id: "d7bd20b8-1ee1-4178-a8e7-0014f8f6afa5"
            },
            "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
                content: "Chilling depiction of totalitarianism that feels more relevant every year.",
                _id: "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a"
            },
            "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                content: "Elizabeth Bennet remains one of literature's most compelling heroines.",
                _id: "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b"
            },
            "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                content: "Bilbo's journey sets the standard for fantasy adventures. Timeless!",
                _id: "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
            },
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                content: "The start of an incredible journey. Hogwarts feels like home.",
                _id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
            },
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                content: "A perfect allegory that remains terrifyingly accurate.",
                _id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
            },
            "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f": {
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                content: "Simple yet profound. Changed how I view personal journeys.",
                _id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                content: "Deceptively simple story with deep philosophical insights.",
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a"
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                content: "Death as narrator gives this WWII story unforgettable perspective.",
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b"
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                content: "The puzzles and historical references make this impossible to put down.",
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c"
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                content: "Scary how many predictions came true about society's direction.",
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d"
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                content: "Holden's voice still resonates with teenage rebellion decades later.",
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e"
            },
            "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b": {
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "fdd2faf9-c0f2-4c79-b799-9121ca0ad36d",
                content: "Atticus Finch is the moral compass we all need. Powerful storytelling!",
                _id: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b"
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
                content: "The concept of thoughtcrime feels more real with each passing year.",
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d"
            },
            "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c": {
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                content: "Fitzgerald's critique of the American Dream is still relevant today.",
                _id: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c"
            },
            "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f": {
                _ownerId: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                bookId: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                content: "Mr. Darcy's character development is masterfully written.",
                _id: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f"
            },
            "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a": {
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                content: "Gollum's character remains one of Tolkien's most fascinating creations.",
                _id: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a"
            },
            "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b": {
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                content: "The world-building in this series sets the gold standard for fantasy.",
                _id: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b"
            },
            "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c": {
                _ownerId: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                bookId: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                content: "The parallels to real historical events make this especially chilling.",
                _id: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c"
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                content: "Anne's voice feels timeless - her insights transcend her circumstances.",
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e"
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _ownerId: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
                bookId: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                content: "The simplicity of the storytelling carries profound wisdom about destiny.",
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f"
            },
            "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d": {
                _ownerId: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                bookId: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                content: "The fox's secret is perhaps the most beautiful line in literature.",
                _id: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d"
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _ownerId: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                bookId: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                content: "Liesel's relationship with books during wartime is profoundly moving.",
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a"
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _ownerId: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                bookId: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                content: "The symbology research felt authentic and added great depth to the mystery.",
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b"
            },
            "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c": {
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                content: "Katniss's resilience makes her an iconic heroine for our times.",
                _id: "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c"
            },
            "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e": {
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                content: "The societal conditioning in this book is both fascinating and terrifying.",
                _id: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e"
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _ownerId: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                bookId: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                content: "Holden's cynicism masks a deep vulnerability that makes him relatable.",
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a"
            },
            "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d": {
                _ownerId: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
                bookId: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                content: "The scope of Middle-earth feels alive in every chapter. Epic in every sense!",
                _id: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d"
            }
        },
        likes: {
            "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f": {
                _id: "c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                _createdOn: 1717200000000 + 86400000 * 2
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                _createdOn: 1714521600000 + 86400000 * 5
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
                _createdOn: 1711929600000 + 86400000 * 1
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
                _createdOn: 1714521600000 + 86400000 * 3
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c",
                _createdOn: 1717200000000 + 86400000 * 7
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d",
                _createdOn: 1719792000000 + 86400000 * 4
            },
            "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f": {
                _id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 6
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 2
            },
            "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": {
                _id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 8
            },
            "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c": {
                _id: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 1
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                _ownerId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 9
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 5
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 3
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 7
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 4
            },
            "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c": {
                _id: "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c",
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 6
            },
            "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d": {
                _id: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 2
            },
            "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e": {
                _id: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 8
            },
            "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f": {
                _id: "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 9
            },
            "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a": {
                _id: "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
                _ownerId: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 1
            },
            "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b": {
                _id: "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 6
            },
            "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c": {
                _id: "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 3
            },
            "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d": {
                _id: "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d",
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 7
            },
            "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e": {
                _id: "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e",
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 4
            },
            "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f": {
                _id: "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f",
                _ownerId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 5
            },
            "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a": {
                _id: "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 8
            },
            "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b": {
                _id: "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 1
            },
            "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c": {
                _id: "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 7
            },
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d": {
                _id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 3
            },
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e": {
                _id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 9
            },
            "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f": {
                _id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 4
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 6
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 2
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                _ownerId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 8
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 5
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 7
            },
            "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f": {
                _id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 1
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 9
            },
            "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": {
                _id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 3
            },
            "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c": {
                _id: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 4
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 6
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 2
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                _ownerId: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 8
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 5
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 7
            },
            "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c": {
                _id: "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c",
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 2
            },
            "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d": {
                _id: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 1
            },
            "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e": {
                _id: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
                _ownerId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 3
            },
            "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f": {
                _id: "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 7
            },
            "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a": {
                _id: "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 4
            },
            "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b": {
                _id: "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 5
            },
            "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c": {
                _id: "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 6
            },
            "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d": {
                _id: "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d",
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 8
            },
            "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e": {
                _id: "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e",
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 1
            },
            "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f": {
                _id: "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f",
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 2
            },
            "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a": {
                _id: "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 3
            },
            "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b": {
                _id: "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b",
                _ownerId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 4
            },
            "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c": {
                _id: "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c",
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 5
            },
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d": {
                _id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 6
            },
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e": {
                _id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 7
            },
            "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f": {
                _id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 8
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 9
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 1
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 2
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 3
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                _ownerId: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 4
            },
            "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f": {
                _id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 5
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 6
            },
            "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": {
                _id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 7
            },
            "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c": {
                _id: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 8
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                _ownerId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 9
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 5
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 1
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 2
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 3
            },
            "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c": {
                _id: "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c",
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 4
            },
            "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d": {
                _id: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 5
            },
            "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e": {
                _id: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 6
            },
            "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f": {
                _id: "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 7
            },
            "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a": {
                _id: "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
                _ownerId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 8
            },
            "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b": {
                _id: "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 9
            },
            "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c": {
                _id: "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 1
            },
            "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d": {
                _id: "a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d",
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 2
            },
            "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e": {
                _id: "b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e",
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 3
            },
            "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f": {
                _id: "c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f",
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 4
            },
            "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a": {
                _id: "d8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a",
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 5
            },
            "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b": {
                _id: "e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b",
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 6
            },
            "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c": {
                _id: "f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c",
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 7
            },
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d": {
                _id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                _ownerId: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 8
            },
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e": {
                _id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
                _ownerId: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 9
            },
            "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f": {
                _id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
                _ownerId: "b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 1
            },
            "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a": {
                _id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
                _ownerId: "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 2
            },
            "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b": {
                _id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
                _ownerId: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 3
            },
            "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c": {
                _id: "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
                _ownerId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 4
            },
            "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d": {
                _id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
                _ownerId: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 5
            },
            "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e": {
                _id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 6
            },
            "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f": {
                _id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 7
            },
            "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a": {
                _id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
                _ownerId: "9f8e7d6c-5a4b-3c2d-1e0f-9f8e7d6c5a4b",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 8
            },
            "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": {
                _id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
                _ownerId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 9
            },
            "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c": {
                _id: "f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
                _ownerId: "aa11bb22-cc33-dd44-ee55-ff66aa11bb22",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 1
            },
            "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d": {
                _id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
                _ownerId: "123e4567-e89b-12d3-a456-426614174000",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 2
            },
            "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e": {
                _id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
                _ownerId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 3
            },
            "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f": {
                _id: "c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f",
                _ownerId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 4
            },
            "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a": {
                _id: "d6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a",
                _ownerId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 5
            },
            "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b": {
                _id: "e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b",
                _ownerId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 6
            },
            "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c": {
                _id: "f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c",
                _ownerId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 7
            },
            "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d": {
                _id: "a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d",
                _ownerId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                bookId: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                _createdOn: 1733097600000 + 86400000 * 8
            },
            "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e": {
                _id: "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
                _ownerId: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
                bookId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
                _createdOn: 1735689600000 + 86400000 * 9
            },
            "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f": {
                _id: "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
                _ownerId: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
                bookId: "b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e",
                _createdOn: 1706745600000 + 86400000 * 1
            },
            "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a": {
                _id: "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
                _ownerId: "d5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a",
                bookId: "c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f",
                _createdOn: 1709251200000 + 86400000 * 2
            },
            "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b": {
                _id: "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
                _ownerId: "e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b",
                bookId: "d9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a",
                _createdOn: 1727827200000 + 86400000 * 3
            },
            "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c": {
                _id: "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
                _ownerId: "f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
                bookId: "e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b",
                _createdOn: 1730419200000 + 86400000 * 4
            }
        }
    };
    var rules$1 = {
        users: {
            ".create": false,
            ".read": [
                "Owner"
            ],
            ".update": false,
            ".delete": false
        },
        members: {
            ".update": "isOwner(user, get('teams', data.teamId))",
            ".delete": "isOwner(user, get('teams', data.teamId)) || isOwner(user, data)",
            "*": {
                teamId: {
                    ".update": "newData.teamId = data.teamId"
                },
                status: {
                    ".create": "newData.status = 'pending'"
                }
            }
        }
    };
    var settings = {
        identity: identity,
        protectedData: protectedData,
        seedData: seedData,
        rules: rules$1
    };

    const plugins = [
        storage(settings),
        auth(settings),
        util$2(),
        rules(settings)
    ];

    const server = http__default['default'].createServer(requestHandler(plugins, services));

    const port = 3030;

    server.listen(port);

    console.log(`Server started on port ${port}. You can make requests to http://localhost:${port}/`);
    console.log(`Admin panel located at http://localhost:${port}/admin`);

    var softuniPracticeServer = server;

    return softuniPracticeServer;

})));
