/**
 * Seqtools.js
 *
 * Depends on jQuery 1.4 or later
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2009-2010 Sequence Mediaworks
 */

var $SEQ = $SEQ || {};

$SEQ.CONST = {
    KEYCODES: {
        ENTER:  13,
        ESC:    27
    }
};

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
        if (!ev || !ev.target || !ev.type) { return; }
        
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
        if (!pparams) { throw('Missing pparams'); }
        
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
    if (!params) { throw('Missing params'); }
    if (!params.scope) { throw('Missing scope'); }
    t.$scope = params.scope;
    
    t.action_string = $SEQ.utils.isBlank(params.action_string) ? 'seq-acn' : params.action_string;
};

// ====================================================================

/**
 * Turns a DIV full of text into an on-click editable DIV.  (The DIV
 * should ONLY have TEXT in it!  HTML tags will cause funny results.)
 * If the user presses ESC then the old field value will be brought
 * back.  If the users presses ENTER then the field value will become
 * the $element's value and a callback will be fired.
 *
 * @param params - (Hash) Initialization params, supporting:
 *
 *     $element: (jQuery Selection) Element to apply to.
 *
 *     cancelOnBlur: (bool) (optional) Does a cancel if a blur event
 *         is detected, default: false.
 *
 *     cancelCallback: (Function) (optional) Callback to be called if
 *         the user cancels their edits.  Called as:
 *
 *             function ($element, lastValue) { ... }
 *
 *     cancelKeycode: (int) (optional) Keycode to use for Cancel,
 *         defaults to ESC.
 *
 *     commitCallback: (Function) (optional) Callback to be called if
 *         the user presses Enter their edits.  Called as:
 *
 *             function ($element, lastValue) { ... }
 *
 *     commitKeycode: (int) (optional) Keycode to use for Commit,
 *         defaults to ENTER.
 *
 *     enterEditingCallback: (Function) (optional) Callback triggered
 *         the user is starting to edit the field.
 *
 *             function ($element, lastValue) { ... }
 */
$SEQ.EditableDiv = function (params) {
    var t = this,
        cancel_keycode = $SEQ.CONST.KEYCODES.ESC,
        commit_keycode = $SEQ.CONST.KEYCODES.ENTER,
        div_current_value = null,
        in_edit_mode = false;
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Private method: back up current value so we can revert it...
     */
    var back_up_current_span_value = function () {
        div_current_value = t.$span.text();
    };
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Public method: cancel!  Throws errors if we're not in edit mode.
     */
    t.cancel = function () {
        if (!in_edit_mode) { throw 'Not in edit mode'; }
        
        inputFieldCanceled();
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Public method: do a commit.  Throws errors if we're not in edit mode.
     */
    t.commit = function () {
        if (!in_edit_mode) { throw 'Not in edit mode'; }

        inputFieldCommitted();
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Public method: focuses on the input field if in edit mode.
     */
    t.focus = function () {
        if (!in_edit_mode) {
            inputFieldEdit();
        }

        t.$input.focus();
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Private method: HTML text clicked...turn it into the editable DIV.
     */
    var htmlTextClicked = function () {
        t.select();
    };
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Private method: user decided to cancel edit.
     */
    var inputFieldCanceled = function (dont_fire_callbacks) {
        in_edit_mode = false;
        
        t.$input.hide();
        t.$span.show();
        if (t.cancel_callback && !dont_fire_callbacks) {
            t.cancel_callback(t.$el, t.$input.val());
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Private method: user decided to commit their edits.
     */
    var inputFieldCommitted = function (dont_fire_callbacks) {
        in_edit_mode = false;
        
        var committed_val = t.$input.val();
        t.$input.hide();
        t.$span.text(committed_val).show();
        if (t.commit_callback && !dont_fire_callbacks) {
            t.commit_callback(t.$el, committed_val);
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Put the field in edit mode if it isn't already.
     */
    var inputFieldEdit = function () {
        if (in_edit_mode) { return; }

        in_edit_mode = true;

        back_up_current_span_value();

        t.$input.val(div_current_value);           // Copy text version!
        t.$span.hide();
        t.$input.show();
        
        if (t.editing_callback) {
            t.editing_callback(t.$el, div_current_value);
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Private method: trap keypresses and stuff.
     */
    var inputKeypressDetected = function (ev) {
        var code = $SEQ.utils.getKeycodeFromEvent(ev);
        if (!code) { return; }
        switch (code) {
            case commit_keycode: inputFieldCommitted(); break;
            case cancel_keycode: inputFieldCanceled(); break;
        }
    };
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Reverts the value of the $element to its last value before the
     * last edit.
     */
    t.revert = function () {
        inputFieldCanceled(true);
        t.$span.text(div_current_value);
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Public method: focuses and selects on the input field if in edit mode.
     */
    t.select = function () {
        if (!in_edit_mode) {
            inputFieldEdit();
        }

        t.$input.select();
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Set/return the current text value if not in editing mode, or the
     * current input field value if editing.
     *
     * @new_val (String) (optional) Value to set.  To blank out the
     *     value use the empty string, "".  The value is HTML, btw.
     * @return (String) Current value.
     */
    t.val = function (new_val) {
        // Setting the value phase
        if (new_val != null) {
            if (in_edit_mode) {
                t.$input.val(new_val);
            } else {
                t.$span.html(new_val);
            }
        }
        
        // OK, returning phase.
        if (in_edit_mode) {
            return t.$input.val();
        } else {
            return t.$span.html();
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
    
    // Init.
    if (!params) { throw('Missing params'); }
    if (!params.$element) { throw('Missing $element'); }
    if (params.$element.length < 1) { throw('$element doesn\'t match any elements'); }
    
    // Make internal copies of params
    t.$el =                     params.$element;
    t.cancel_callback =         params.cancelCallback;
    t.commit_callback =         params.commitCallback;
    t.editing_callback =        params.enterEditingCallback;
    if (params.cancelKeycode != null) { cancel_keycode = params.cancelKeycode; }
    if (params.commitKeycode != null) { commit_keycode = params.commitKeycode; }
    
    // Wrap the internal text with a <span> so we can grab it!  Also append
    // the text field in a hidden fashion.
    t.$el.html(
        '<span class="_seq_editable_div_html">'+t.$el.html()+'</span>'+
        '<input type="text" class="_seq_editable_div_field" style="display: none;" />'
    );

    // Make some shortcuts to the elements.
    t.$span = $('._seq_editable_div_html', t.$el);
    t.$input = $('._seq_editable_div_field', t.$el);
    
    // Make sure there's something there.
    back_up_current_span_value();

    // Bind eventage.
    t.$span.click(htmlTextClicked);
    t.$input.bind('keydown', inputKeypressDetected)
    if (params.cancelOnBlur === true) {
        t.$input.bind('blur', inputFieldCanceled);
    }
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
    if (!$el || $el.length < 1) { return null; }
    
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
    if (typeof(s) === 'undefined' || s === null) { return ''; }
    
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
    if (!$el || !keycode || !fn) { return; }
    
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
    if ($SEQ.utils.isBlank(email)) { return false; }
    
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