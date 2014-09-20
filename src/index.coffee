
zookeeper = require 'node-zookeeper-client'
delegates = require 'delegates'
{ flow } = require 'flat-flow'

# ZkTree provides simple interface into JSON formatted zookeeper.
class ZkTree

  cache: null

  # @param [Object] options
  # @option options [String] root (default "")
  # @option options [zookeeper.Client] client (optional)
  # @option options [String] connection Connection string in "host:port[/path][,host:port[/path]]..." format (optional)
  constructor: (options = {}) ->
    @root = options.root or ''
    @client = options.client or zookeeper.createClient(options.connection or "localhost:2181")
    delegates(@, 'client')
      .method('connect')
      .method('close')

  # List items at a specified path.
  #
  # @param [String] path
  # @param [Function(err, items)] done
  ls: (path, done) ->
    @client.getChildren "#{@root}#{path}", done # log "ls(#{path})"

  # Get decoded JSON string from item at specified path.
  #
  # @param [String] path
  # @param [Function(err, document)] done
  cat: (path, done) ->
    @client.getData "#{@root}#{path}", (err, data, stat) -> # log "cat(#{path})"
      unless err?
        try
          done null, JSON.parse("#{data}"), stat
        catch ex
          done null, data, stat
      else
        done err

  # Dump the whole tree into object. Node values are stored under {'$':{...}}
  # attribute name. The binary value is JSON parsed. If the JSON is malformed,
  # value is null, or an empty ([] or {}), the {'$':{...}} attribute is
  # skipped.
  #
  # NOTE: We don't care about the failures when dumping.
  #
  # @param [String] selector (Optional)
  # @param [Function(done, document)]
  dump: (selector, done) ->
    [ selector, done ] = [ '', selector ] if typeof selector is 'function'

    flow { self: @ }, [

      # Get current value
      (done) ->
        @self.cat selector, (err, value) ->
          done err, { value }

      # Get children
      (done) ->
        @self.ls selector, (err, childrenNames = []) ->
          done err, { childrenNames }

      # Map children
      (done) ->
        async.map @childrenNames, (childName, done) =>
          @self.dump [ selector, childName ].join('/'), done
        , (err, childrenValues) =>
          unless err?
            children = {}
            for childName, i in @childrenNames
              children[ childName ] = childrenValues[ i ]
            done err, { children }
          else
            done err

    ], (err) ->
      unless err?

        # HACK
        @children.$ = @value
        done err, @children
      else
        done err

  sync: (zkSelector, cacheSelector, done) ->
    throw 'TODO'

  # Copy cached tree.
  #
  # @param
  copy: (selector) ->
    selector.split('/')
