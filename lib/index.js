(function() {
  var ZkTree, delegates, flow, zookeeper;

  zookeeper = require('node-zookeeper-client');

  delegates = require('delegates');

  flow = require('flat-flow').flow;

  ZkTree = (function() {
    ZkTree.prototype.cache = null;

    function ZkTree(options) {
      if (options == null) {
        options = {};
      }
      this.root = options.root || '';
      this.client = options.client || zookeeper.createClient(options.connection || "localhost:2181");
      delegates(this, 'client').method('connect').method('close');
    }

    ZkTree.prototype.ls = function(path, done) {
      return this.client.getChildren("" + this.root + path, done);
    };

    ZkTree.prototype.cat = function(path, done) {
      return this.client.getData("" + this.root + path, function(err, data, stat) {
        var ex;
        if (err == null) {
          try {
            return done(null, JSON.parse("" + data), stat);
          } catch (_error) {
            ex = _error;
            return done(null, data, stat);
          }
        } else {
          return done(err);
        }
      });
    };

    ZkTree.prototype.dump = function(selector, done) {
      var _ref;
      if (typeof selector === 'function') {
        _ref = ['', selector], selector = _ref[0], done = _ref[1];
      }
      return flow({
        self: this
      }, [
        function(done) {
          return this.self.cat(selector, function(err, value) {
            return done(err, {
              value: value
            });
          });
        }, function(done) {
          return this.self.ls(selector, function(err, childrenNames) {
            if (childrenNames == null) {
              childrenNames = [];
            }
            return done(err, {
              childrenNames: childrenNames
            });
          });
        }, function(done) {
          return async.map(this.childrenNames, (function(_this) {
            return function(childName, done) {
              return _this.self.dump([selector, childName].join('/'), done);
            };
          })(this), (function(_this) {
            return function(err, childrenValues) {
              var childName, children, i, _i, _len, _ref1;
              if (err == null) {
                children = {};
                _ref1 = _this.childrenNames;
                for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
                  childName = _ref1[i];
                  children[childName] = childrenValues[i];
                }
                return done(err, {
                  children: children
                });
              } else {
                return done(err);
              }
            };
          })(this));
        }
      ], function(err) {
        if (err == null) {
          this.children.$ = this.value;
          return done(err, this.children);
        } else {
          return done(err);
        }
      });
    };

    ZkTree.prototype.sync = function(zkSelector, cacheSelector, done) {
      throw 'TODO';
    };

    ZkTree.prototype.copy = function(selector) {
      return selector.split('/');
    };

    return ZkTree;

  })();

}).call(this);
