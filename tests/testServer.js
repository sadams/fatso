//var fs = require('fs');
//var util = require('util');
//var http = require('http');
var sys  = require('sys');
var connect = require('connect');
//var url  = require('url');

module.exports = (function () {
    var server;
    function start(port, baseTestPath) {
        console.log(baseTestPath);
      server = connect()
//        .use(connect.logger('dev'))
        .use(connect.static(baseTestPath))
//            .use(function(req, res){
//                res.end('hello world\n');
//            })
        .listen(port);
      sys.log('Listening on: ' + port);
      return server;
//        console.log(port);
//        server = http.createServer(function(request, response) {
//
//            sys.log('Request received: ' + request.url);
//            //request.url = get_url(request.url);
//
//            var requestPath = request.url;
//            // request path is everything before ? (without the query part)
//            if (requestPath.indexOf('?') !== -1) {
//                requestPath = request.url.split('?')[0];
//            }
//
//            var pageFile = fs.pathJoin(baseTestPath, requestPath);
//            if (!fs.exists(pageFile) || !fs.isFile(pageFile)) {
//                response.statusCode = 404;
//                console.log(util.format('Test server url not found: %s (file: %s)', request.url, pageFile), "warning");
//                response.write("404 - NOT FOUND");
//            } else {
//                var headers = {};
//                //if the requested file ends in *.js, return javascript content type
//                if (/\.js$/.test(pageFile)) {
//                    headers['Content-Type'] = "application/javascript";
//                }
//                response.writeHead(200, headers);
//                response.write(fs.read(pageFile));
//            }
//            response.close();
//
//        }).listen(port);
//        sys.log('Listening on: ' + port);
    }
    function stop() {
        if (server) {
            server.close();
        }
    }
    return {
        start:start,
        stop:stop
    }
})();
