var connect = require('connect');

module.exports = (function () {
  var server;
  function start(port, baseTestPath) {
    server = connect()
      .use(connect.static(baseTestPath))
      .listen(port);
    return server;
  }
  function stop() {
      if (server) {
          server.close();
      }
  }
  return {
      start:start,
      stop:stop
  };
})();
