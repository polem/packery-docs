var path = require('path');
var handlebars = require('handlebars');

var highlight = require('./utils/highlight');

// -------------------------- Handlebar Helpers -------------------------- //

// https://gist.github.com/meddulla/2571518
handlebars.registerHelper( 'if_equal', function( a, b, options ) {
  if ( a == b ) {
    return options.fn( this );
  }
});

// -------------------------- parseJSONFrontMatter -------------------------- //

function parseJSONFrontMatter( src ) {
  // file must begin with ---
  var parsed = {
    src: src
  };
  if ( src.indexOf('---\n') !== 0 ) {
    return parsed;
  }
  var split = src.split('---\n');
  var json;
  try {
    json = JSON.parse( split[1] );
  } catch ( err ) {}

  if ( !json ) {
    return parsed;
  }

  // remove first parts
  split.splice( 0, 2 );
  parsed.json = json;
  parsed.src = split.join('---\n');
  return parsed;
}

// --------------------------  -------------------------- //

module.exports = function( grunt ) {

  grunt.registerMultiTask( 'hbarz', 'Process Handlebars templates', function() {
    var opts = this.options();

    var templateFiles = grunt.file.expand( opts.templates );
    // hash of Handlebar templates
    var templates = {};
    templateFiles.forEach( function( filepath ) {
      var name = path.basename( filepath, path.extname( filepath ) );
      var src = grunt.file.read( filepath );
      templates[ name ] = handlebars.compile( src );
      // register all as partials
      handlebars.registerPartial( name, src );
    });

    // properties made available for templating
    var site = {};
    site.css = grunt.file.expand( grunt.config.get('concat.css.src') );
    site.js = grunt.file.expand( grunt.config.get('concat.js.src') );

    this.files.forEach( function( file ) {
      file.src.forEach( function( filepath ) {
        // first process page source
        var src = grunt.file.read( filepath );
        var parsed = parseJSONFrontMatter( src );
        src = parsed.src;
        var pageJson = parsed.json || {};
        var context = {
          site: site,
          basename: path.basename( filepath, path.extname( filepath ) ),
          page: pageJson
        };
        src = handlebars.compile( src )( context );

        // process source into page template
        var splitPath = filepath.split( path.sep );
        // remove leading directory
        if ( splitPath.length > 1 ) {
          splitPath.splice( 0, 1 );
        }
        src = highlight( src );
        context.content = src;
        var templated = templates[ opts.defaultTemplate ]( context );
        var dest = file.dest + splitPath.join( path.sep );
        grunt.file.write( dest, templated );
      });
    });
  });

};
