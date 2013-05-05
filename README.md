fatso
=====
A layer on top of casperjs to enable testing of the state of a page using JSON config.
Currently it tests by resolving expressions to values or recording resource requests from the page (e.g. script includes) that match a regex mask.

Install
===
Only currently supported on mac (OSX):
http://mxcl.github.com/homebrew/
```brew install casperjs```

Running the tests
===
Requires node & npm:
http://nodejs.org/
```npm install``` from the root and ```nodeunit tests/suites/*.js```