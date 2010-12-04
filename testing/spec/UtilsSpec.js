/**
 * UtilsSpec.js
 *
 * Depends on jQuery 1.4 or later, Jasmine 1.0.1 or later
 *
 * Testing $SEQ.utils.*
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2009-2010 Sequence Mediaworks
 */

describe("Utils", function() {
    beforeEach(function() {
    });
    
    it("should be able to augment a URL with a Hash", function () {
        expect($SEQ.utils.hashToUrl('http://www.google.com')).toEqual('http://www.google.com');
        expect($SEQ.utils.hashToUrl('http://www.google.com', {})).toEqual('http://www.google.com');
        expect($SEQ.utils.hashToUrl('http://www.google.com?', {})).toEqual('http://www.google.com?');
        expect($SEQ.utils.hashToUrl('http://www.google.com', {a:1})).toEqual('http://www.google.com?a=1');
        expect($SEQ.utils.hashToUrl('http://www.google.com', {a:1, b:2})).toEqual('http://www.google.com?a=1&b=2');
        expect($SEQ.utils.hashToUrl('http://www.google.com?c=3', {a:1, b:2})).toEqual('http://www.google.com?c=3&a=1&b=2');
        expect($SEQ.utils.hashToUrl('http://www.google.com?c=3', {'result&with&amps': (7*14)})).toEqual('http://www.google.com?c=3&result%26with%26amps=98');
        expect($SEQ.utils.hashToUrl('http://www.google.com?c=3&', {'result&with&amps': (7*14)})).toEqual('http://www.google.com?c=3&result%26with%26amps=98');
    });

    it("should be able to escape HTML", function () {
        expect($SEQ.utils.escapeHtml(null)).toEqual('');
        expect($SEQ.utils.escapeHtml('')).toEqual('');
        expect($SEQ.utils.escapeHtml(' ')).toEqual(' ');
        expect($SEQ.utils.escapeHtml('hello world')).toEqual('hello world');
        expect($SEQ.utils.escapeHtml('  hello world')).toEqual('  hello world');
        expect($SEQ.utils.escapeHtml('  hello world  ')).toEqual('  hello world  ');
        expect($SEQ.utils.escapeHtml('  hello & world  ')).toEqual('  hello &amp; world  ');
        expect($SEQ.utils.escapeHtml('  "hello" & world  ')).toEqual('  &quot;hello&quot; &amp; world  ');
        expect($SEQ.utils.escapeHtml('  "hello" &amp; world  ')).toEqual('  &quot;hello&quot; &amp;amp; world  ');
        expect($SEQ.utils.escapeHtml('  "hello" &amp; <world>  ')).toEqual('  &quot;hello&quot; &amp;amp; &lt;world&gt;  ');
        expect($SEQ.utils.escapeHtml('  "hello" &amp; <"world">  ')).toEqual('  &quot;hello&quot; &amp;amp; &lt;&quot;world&quot;&gt;  ');
        expect($SEQ.utils.escapeHtml('  "hello" &amp;\' <"world">  ')).toEqual('  &quot;hello&quot; &amp;amp;\' &lt;&quot;world&quot;&gt;  ');
    });

    it("should detect array emptiness", function () {
        expect($SEQ.utils.isArrayEmpty(null)).toBeTruthy();
        expect($SEQ.utils.isArrayEmpty(undefined)).toBeTruthy();
        expect($SEQ.utils.isArrayEmpty([])).toBeTruthy();
        
        try {
            $SEQ.utils.isArrayEmpty('I am not an array')
            expect(false).toBeTruthy();
        } catch(e) {
            // Nothing to do.  :)
        }
        expect($SEQ.utils.isArrayEmpty(['a'])).toBeFalsy();
    });

    it("should detect blankness", function () {
        expect($SEQ.utils.isBlank(null)).toBeTruthy();
        expect($SEQ.utils.isBlank('')).toBeTruthy();
        expect($SEQ.utils.isBlank(' ')).toBeTruthy();
        expect($SEQ.utils.isBlank("\n")).toBeTruthy();
        expect($SEQ.utils.isBlank("  \n  ")).toBeTruthy();

        expect($SEQ.utils.isBlank(" f     ")).toBeFalsy();
    });

    it("should properly test email formats", function() {
        expect($SEQ.utils.isEmailFormat('')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a@b')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a@b.c')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a@.com')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a @b.co.uk')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a@ b.co.uk')).toBeFalsy();
        expect($SEQ.utils.isEmailFormat('a@b .co.uk')).toBeFalsy();
        
        expect($SEQ.utils.isEmailFormat('a@b.com')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.org')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.net')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.edu')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.co.uk')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.co.uk')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('  a@b.co.uk')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('a@b.co.uk  ')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('Foo<a@b.co.uk>')).toBeTruthy();
        expect($SEQ.utils.isEmailFormat('Foo Bar <a@b.co.uk>')).toBeTruthy();
    });
});
