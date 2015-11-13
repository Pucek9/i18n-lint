/**
 * i18n-lint lib tests
 *
 * Copyright (c) 2015 James Warwood
 * Licensed under the MIT license.
 */
/* global describe, it */
/* jshint -W030 */
'use strict';

var expect = require('chai').expect;

var i18n-lint = require('../../lib/hslint');

var MESSAGES = {
  text: /Hardcoded <.*?> tag/,
  attr: /Hardcoded .*? attribute/
};

describe('i18n-lint lib', function() {
  it('should throw an error if no filename provided', function(done) {
    expect(i18n-lint).to.throw(TypeError, /path must be/);
    done();
  });

  it('should return errors in the proper format', function(done) {
    var error = i18n-lint('test/fixtures/testing.html').pop(),
      details = error.error,
      expectedDetails = {
        id: 'string',
        code: 'string',
        reason: 'string',
        evidence: 'regexp',
        line: 'number',
        character: 'number',
        scope: 'string'
      };

    expect(error).to.have.property('file');
    expect(error).to.have.property('error');

    Object.keys(expectedDetails).forEach(function(property) {
      expect(details)
        .to.have.property(property)
        .that.is.a(expectedDetails[property]);
    });

    done();
  });

  it('should produce accurate error report', function(done) {
    var error = i18n-lint('test/fixtures/testing.html').pop(),
      expected = require('../expected/error.js');

    expect(error).to.deep.equal(expected);

    done();
  });

  it('should produce correct output for default options', function(done) {
    var errors = i18n-lint('test/fixtures/testing.html');

    expect(errors).to.have.length(10);

    expect(
      errors.filter(function(error) {
        return MESSAGES.text.test(error.error.reason);
      })
    ).to.have.length(9);

    done();
  });

  it('should produce correct output for custom options', function(done) {
    var errors = i18n-lint('test/fixtures/testing.html', {
      attributes: []
    });

    expect(errors).to.have.length(9);

    expect(
      errors.filter(function(error) {
        return MESSAGES.attr.test(error.error.reason);
      })
    ).to.be.empty;

    done();
  });

  it('should report line numbers correctly', function(done) {
    var errors = i18n-lint('test/fixtures/testing.html');

    expect(
      errors.map(function(error) {
        return error.error.line;
      })
    ).to.have.members([6, 7, 8, 8, 8, 9, 9, 9, 12, 13]);

    done();
  });

  it('should handle templated content correctly', function(done) {

    // Test with EJS-style delimiters, <% and %>
    expect(
      i18n-lint('test/fixtures/testing.ejs', {
        templateDelimiters: ['<%', '%>']
      })
    ).to.have.length(4);

    // Test with Mustache-style delimiters, {{ and }}
    expect(
      i18n-lint('test/fixtures/testing.hbs', {
        templateDelimiters: ['{{', '}}']
      })
    ).to.have.length(3);

    done();
  });

  it('should return empty array for clean file', function(done) {
    var errors = i18n-lint('test/fixtures/clean.hbs', {
      templateDelimiters: ['{{', '}}']
    });

    expect(errors).to.be.empty;

    done();
  });

  it('should handle text nodes split over multiple lines', function(done) {
    var errors = i18n-lint('test/fixtures/multiline_text_node.hbs', {
      templateDelimiters: ['{{', '}}']
    });

    expect(errors).to.have.length(2);

    expect(errors[1])
      .to.have.deep.property('error.reason')
      .to.include('(continued)');

    // Second test case
    errors = i18n-lint('test/fixtures/multiline_text_node_2.hbs');
    expect(errors).to.have.length(1);
    expect(errors[0])
      .to.have.deep.property('error.line').that.equals(11);

    done();
  });

  it ('should handle a text node with templated content', function(done) {
    var errors = i18n-lint('test/fixtures/text_node_with_template_content.ejs', {
      templateDelimiters: ['<%', '%>']
    });

    expect(errors).to.have.length(1);
    expect(errors[0])
      .to.have.deep.property('error.reason').to.match(MESSAGES.text);

    done();
  });

  it('should handle attributes with templated content', function(done) {
    var errors = i18n-lint('test/fixtures/attribute_with_template_content.ejs', {
      templateDelimiters: ['<%', '%>']
    });

    expect(errors).to.have.length(1);
    expect(errors[0]).to.have.deep.property('error.scope').to.contain(
      '<h5 alt="Showing <%= count %> of <%= total %> comments">'
    );
    expect(errors[0])
      .to.have.deep.property('error.reason')
        .that.equals('Hardcoded \'alt\' attribute');

    done();
  });

  it('should escape RegExp characters in source strings', function(done) {
    expect(
      function() {
        i18n-lint('test/fixtures/regex_escaping.html');
      }
    ).not.to.throw(SyntaxError);

    done();
  });

  it('should ignore tags specified in `ignoreTags`', function(done) {

    // Test with default options
    var errors = i18n-lint('test/fixtures/script_tag.html');

    expect(errors).to.have.length(1);

    expect(errors[0]).to.have.deep.property('error.line').that.equals(2);

    // Test with custom options
    errors = i18n-lint('test/fixtures/ignore_tags_option.html', {
      ignoreTags: ['pre', 'script']
    });

    expect(errors).to.have.length(0);
    done();
  });

  it('should handle unicode in input', function(done) {
    var errors = i18n-lint('test/fixtures/unicode.html');

    expect(errors).to.have.length(2);

    expect(
      errors.filter(function(error) {
        return error.error.reason === 'Hardcoded <p> tag';
      }).pop()
    ).to.have.deep.property('error.scope').to.match(/©/);

    done();
  });

  it('should catch hardcoded strings with ... ellipsis', function(done) {
    var errors = i18n-lint('test/fixtures/ellipsis_translation.ejs', {
      templateDelimiters: ['<%', '%>']
    });

    expect(errors).to.have.length(1);

    expect(errors[0])
      .to.have.deep.property('error.evidence')
      .to.satisfy(function(regex) {
        return regex.toString().indexOf('should\\.\\.\\.') !== -1;
      });

    done();
  });

  it('should handle Windows line endings', function(done) {
    var errors = i18n-lint('test/fixtures/windows_line_endings.html');

    expect(errors).to.have.length(3);

    done();
  });

  it('should get correct scope when offending text appears twice', function(done) {
    var expected = [{
        line: 1,
        character: 24
      }, {
        line: 3,
        character: 17
      }, {
        line: 3,
        character: 33
      }, {
        line: 5,
        character: 11
      }],
      errors = i18n-lint('test/fixtures/multi_instance.html');

    expect(errors).to.have.length(expected.length);

    expected.forEach(function(e, index) {
      Object.keys(e).forEach(function(key) {
        expect(errors[index].error)
          .to.have.property(key).that.equals(expected[index][key]);
      });
    });

    done();
  });

  it('should handle invalid HTML', function(done) {
    var expected = [{
        line: 2,
        character: 183
      }, {
        line: 3,
        character: 170
      }],
      errors = i18n-lint('test/fixtures/invalid_html.html');

    expect(errors).to.have.length(expected.length);

    expected.forEach(function(e, index) {
      Object.keys(e).forEach(function(key) {
        expect(errors[index].error)
          .to.have.property(key).that.equals(expected[index][key]);
      });
    });

    done();
  });

  it('should handle multiple instances of exactly the same tag/contents', function(done) {
    var expected = [{
        line: 2,
        character: 6
      }, {
        line: 4,
        character: 5
      }, {
        line: 7,
        character: 6
      }, {
        line: 9,
        character: 5
      }],
      errors = i18n-lint('test/fixtures/repeated_tags.html');

    expect(errors).to.have.length(expected.length);

    expected.forEach(function(e, index) {
      Object.keys(e).forEach(function(key) {
        expect(errors[index].error)
          .to.have.property(key).that.equals(expected[index][key]);
      });
    });

    done();
  });

  /* This test is for situations where HTML entities appear within a tag's child
   * tags, e.g.
   *   <p>Something in <code>&lt;these entities cause the problem&gt;</code></p>
   */
  it('should account for cheerios tag toString replacements', function(done) {
    var errors = i18n-lint('test/fixtures/cheerio_replacements.html'),
      error;

    expect(errors).to.have.length(1);

    error = errors.pop().error;
    expect(error).to.have.property('line').that.equals(1);
    expect(error).to.have.property('character').that.equals(3);

    done();
  });

  it('should handle cases where a tags content does not start until the next line', function(done) {
    var errors = i18n-lint('test/fixtures/newline_tag.html');

    expect(errors).to.have.length(1);

    done();
  });

  it('should handle tags inside other tags', function(done) {
    var errors = i18n-lint('test/fixtures/tag_within_tag.html');

    expect(errors).to.have.length(1);

    done();
  });

  it('should handle attributes on new lines', function(done) {
    var errors = i18n-lint('test/fixtures/attribute_new_lines.html');

    expect(errors).to.have.length(2);

    done();
  });

  it('should handle content in brackets', function(done) {
    var errors = i18n-lint('test/fixtures/brackets.html');

    expect(errors).to.have.length(1);

    expect(errors.pop().error).to.have.a.property('line').that.is.a('number');

    done();
  });

  it('should handle mixed quotes', function(done) {
    var errors = i18n-lint.bind(hslint, 'test/fixtures/mixed_quotes.html');

    expect(errors).not.to.throw(TypeError);

    expect(errors).to.have.length(1);

    done();
  });

  it(
    'should report correct character when offending text already appears in tag string',
    function(done) {
      var errors = i18n-lint('test/fixtures/repeated.html');

      expect(errors[0].error)
        .to.have.a.property('character')
        .that.equals(140)
      ;

      done();
    }
  );
});
