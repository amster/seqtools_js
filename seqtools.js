/**
 * Seqtools.js
 *
 * Depends on jQuery 1.4 or later.
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2009-2010 Sequence Mediaworks
 */

var $SEQ = $SEQ || {};

// ====================================================================

/**
 * When events happen within a scope subscribing handlers are notified.
 *
 * @param params - (Hash) Initialization params, supporting:
 *
 *     action_string: (String) (optional) (default: 'seq-acn') Action string
 *         we are scanning for.
 *     scope: (jQuery Elem) target scope
 */
$SEQ.BubbledEventListener = function (params) {
    var t = this;
    t.subscription_mapping = {};
    t.subscribed_event_types = {};
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Scoped responder.  The handler should be like:
     *
     *     function (<Event>, <Event type>, <action name>, <action Element>) { ... }
     *
     * @param ev - (Event) Event passed in.
     */
    t.responder = function (ev) {
        // Check that we have a target!
        if (!ev || !ev.target || !ev.type) {
            return;
        }
        
        // Bubble up until we run into an action.
        var el = ev.target;
        while (el && el.tagName != 'BODY' && typeof(el.getAttribute) == 'function' && !el.getAttribute(t.action_string)) {
            el = el.parentNode;
        }
        if (!el || typeof(el.getAttribute) != 'function') {
            return;
        }
        
        // Is this action mapped?
        var acn = el.getAttribute(t.action_string);
        if (!t.subscription_mapping[ev.type] || !t.subscription_mapping[ev.type][acn] || t.subscription_mapping[ev.type][acn].length < 1) {
            return;
        }
        
        // OK, stop propagation!
        ev.stopPropagation();
        
        // OK, iterate through all subscribers!
        $.each(t.subscription_mapping[ev.type][acn], function () {
            this(ev, ev.type, acn, el);
        });
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Add an event handler.
     *
     * @param pparams - (Hash) Supported options:
     *
     *     events: (Array of String) List of all events you want to bind
     *         to.
     *
     *     action_names: (Array of String) List of all action names to
     *         respond to.
     *
     *     handler: (Function) Handler for the above.
     */
    t.subscribe = function (pparams) {
        if (!pparams) {
            throw('Missing pparams');
        }
        
        // Just bind all events to the handler if we HAVE NOT already
        $.each(pparams.events, function () {
            var tt = '' + this;
            
            if (t.subscribed_event_types[tt] != true) {
                t.subscribed_event_types[tt] = true;
                t.$scope.bind(tt, t.responder);
            }
            
            // Map in this event type.
            t.subscription_mapping[tt] = t.subscription_mapping[tt] || {};
            
            $.each(pparams.action_names, function () {
                t.subscription_mapping[tt][this] = t.subscription_mapping[tt][this] || [];
                t.subscription_mapping[tt][this].push(pparams.handler);
            });
        });
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
    
    // Init.
    if (!params) {
        throw('Missing params');
    }
    if (!params.scope) {
        throw('Missing scope');
    }
    t.$scope = params.scope;
    
    t.action_string = $SEQ.utils.isBlank(params.action_string) ? 'seq-acn' : params.action_string;
};

// ====================================================================

// Utils namespace
$SEQ.utils = $SEQ.utils || {};

// ......................................................................

/**
 * Given a jQuery element bubble up elements until an element has the
 * className.
 *
 * @param $el - (jQuery Element) Selected element.
 * @param className - (String) Class name that must be set.
 */
$SEQ.utils.elementBubbleUpToClass = function ($el, className) {
    if (!$el || $el.length < 1) {
        return null;
    }
    if ($el.hasClass(className)) {
        return $el;
    } else {
        return $SEQ.utils.elementBubbleUpToClass($el.parent(), className);
    }
};

// ......................................................................

/**
 * Escape a string, s, for HTML output.
 *
 * @param s - (String) String to be escaped.
 * @return (String) HTML-escaped string.
 */
$SEQ.utils.escapeHtml = function (s) {
    if (typeof(s) === 'undefined' || s === null) {
        return '';
    }
    
    return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// ......................................................................

/**
 * Gets a keycode from an event.
 *
 * @params ev - (Event) Event.
 * @return (int) Keycode.
 */
$SEQ.utils.getKeycodeFromEvent = function (ev) {
    var e = ev || window.event;

    if (e.keyCode) {
        return e.keyCode;
    } else if (e.which) {
        return e.which;
    }
    
    return null;
};

// ......................................................................

/**
 * Listens on a jQuery element for a keycode and calls a function.
 *
 * @param $el - (jQuery element) Element selected by jQuery
 * @param keycode - (int) key code, or (String) 1-character string
 * @param fn - (func) Function to call:
 *
 *     function (event, keycode) {...}
 */
$SEQ.utils.keycodeListen = function ($el, keycode, fn) {
    if (!$el || !keycode || !fn) {
        return;
    }
    
    if (typeof(keycode) == 'string') {
        keycode = keycode.charCodeAt(0);
    }
    
    // If Safari trap the keydown instead of the keypress?
    if (navigator.userAgent.toLowerCase().indexOf('safari') >= 0) {
        (function($_el, _keycode, _fn){
            $_el.keydown(function (ev) {
                var c = $SEQ.utils.getKeycodeFromEvent(ev);
                if (c === _keycode) {
                    _fn(_keycode, ev);
                }
            });
        })($el, keycode, fn);
    } else {
        (function($_el, _keycode, _fn){
            $_el.keypress(function (ev) {
                var c = $SEQ.utils.getKeycodeFromEvent(ev);
                if (c === _keycode) {
                    _fn(_keycode, ev);
                }
            });
        })($el, keycode, fn);
    }
};

// ....................................................................

/**
 * Tests if a string is blank.
 *
 * @params str - (String) String to test.
 * @return (Boolean) true if it's blank/null/empty string.
 */
$SEQ.utils.isBlank = function (str) {
    return(str == null || $.trim(str) === '');
};

// ....................................................................

/**
 * Testing that the email is formatted properly.
 *
 * @param email - (String) Email to test.
 * @return (Boolean) true if it looks valid.
 */
$SEQ.utils.isEmailFormat = function (email) {
    if ($SEQ.utils.isBlank(email)) {
        return false;
    }
    
    var email_trim = $.trim(email);
    if (email_trim.match(/^[A-Z0-9._%+\-]+\@(([A-Z0-9.\-]+)\.)+[A-Z]{2,4}$/i) ||
        email_trim.match(/^[^<>]+\s*<[A-Z0-9._%+\-]+\@(([A-Z0-9.\-]+)\.)+[A-Z]{2,4}>$/i)
        ) {
        return true;
    }
    return false;
};

// ....................................................................

/**
 * Sets the window location.
 *
 * @param url - (String)
 */
$SEQ.utils.urlSet = function (url) {
    if (window.location) {
        if (window.location.href) {
            window.location.href = url;
        } else {
            window.location = url;
        }
    }
}
