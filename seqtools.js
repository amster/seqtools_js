/**
 * seqtools.js
 *
 * Depends on jQuery 1.4 or later
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2009-2011 Sequence Mediaworks
 */

var $SEQ = $SEQ || {};

// Uncomment these lines or set them BEFORE you include this JavaScript file to disable/enable
// functionality.
//
//$SEQ.DISABLE_MOUSE_TRACKING = true;

$SEQ.CONST = {
    KEYCODES: {
        BACKSPACE:  8,
        ENTER:      13,
        ESC:        27,
        TAB:        9
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
        if (!el || !el.getAttribute) {
            // MSIE: When you get down to the leaf getAttribute() turns into 'object'?
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
        jQuery.each(t.subscription_mapping[ev.type][acn], function () {
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
        jQuery.each(pparams.events, function () {
            var tt = '' + this;
            
            if (t.subscribed_event_types[tt] != true) {
                t.subscribed_event_types[tt] = true;
                t.$scope.bind(tt, t.responder);
            }
            
            // Map in this event type.
            t.subscription_mapping[tt] = t.subscription_mapping[tt] || {};
            
            jQuery.each(pparams.action_names, function () {
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
 *             function (thisEditableDiv, $element, lastValue) { ... }
 *
 *     cancelKeycode: (int) (optional) Keycode to use for Cancel,
 *         defaults to ESC.
 *
 *     commitCallback: (Function) (optional) Callback to be called if
 *         the user presses Enter their edits.  Called as:
 *
 *             function (thisEditableDiv, $element, lastValue) { ... }
 *
 *     commitKeycode: (int) (optional) Keycode to use for Commit,
 *         defaults to ENTER.
 *
 *     enterEditingCallback: (Function) (optional) Callback triggered
 *         the user is starting to edit the field.
 *
 *             function (thisEditableDiv, $element, lastValue) { ... }
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
            t.cancel_callback(t, t.$el, t.$input.val());
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
            t.commit_callback(t, t.$el, committed_val);
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
            t.editing_callback(t, t.$el, div_current_value);
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
    t.$span = jQuery('._seq_editable_div_html', t.$el);
    t.$input = jQuery('._seq_editable_div_field', t.$el);
    
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

// Events namespace
$SEQ.events = $SEQ.events || {};

// ......................................................................

/**
 * Helper to set the window.top location hash with a cache buster (that
 * $SEQ.events.watchHashchange() knows how to strip)
 *
 * @params value - (String) Value to set, URL-escaping is automatic.
 */
$SEQ.events.setTopHash = function (value) {
    window.top.location.hash = '#' + $SEQ.utils.escapeUrl(value) + ':' + Math.floor(Math.random()*10000);
};

// ......................................................................

/**
 * Tries to monitor your browser for a hash change event, using
 * onhashchange if it can, otherwise uses a polling frequency (in ms).
 * The URL hash can have a special format that includes a random
 * cache-busting number in it like #somevalue:2468 or #somevalue:9876.
 * Just set strip_cache_buster to true to eliminate the numbers after
 * the colon.
 *
 * @param polling_frequency - (int) How often do you want to poll?  Use null for the default.
 * @param callback - (Function) Callback receiving: callback(hash_value)
 * @params strip_cache_buster - (boolean) If true then a NUMERIC cache buster is
 *     removed from the name.
 *
 * Note: the hash value does not include the '#'.  :)
 * Note: you can only have ONE watchHashchange active at any time!
 */
$SEQ.events.watchHashchange = function (polling_frequency, callback, strip_cache_buster) {
    if (!polling_frequency) { polling_frequency = 300; }
    
    $SEQ._hashchange_callback = callback;
    $SEQ._hashchange_strip_cache_buster = strip_cache_buster;
    $SEQ._hashchange_fn = function () {
        if ($SEQ._hashchange_callback) {
            var val = null;
            
            if (window.location.hash) {
               val = window.location.hash.replace(/^#/, ''); 
               if ($SEQ._hashchange_strip_cache_buster) {
                   val = val.replace(/:\d+$/, '')
               }
            }
            
            $SEQ._hashchange_callback(val);
        }
    };
    
    // From: https://developer.mozilla.org/en/dom/window.onhashchange
    if ("onhashchange" in window) {  
        window.onhashchange = $SEQ._hashchange_fn;
    } else {
        $SEQ._hashchange_current_hash = window.location.hash;
        $SEQ._hashchange_intv = window.setInterval(function () {
            if ($SEQ._hashchange_current_hash != window.location.hash) {
                $SEQ._hashchange_current_hash = window.location.hash;
                $SEQ._hashchange_fn();
            }
        }, polling_frequency);
    }
};

// ====================================================================

/**
 * Simple wrapper to put your function fn inside a block that assigns
 * $ to jQuery on document-ready.  (It just saves you a step.)
 */
$SEQ.jready = function (fn) {
    (function ($) {
        $(document).ready(fn);
    })(jQuery);
};

// ====================================================================

// Override if you need to
$SEQ.body_height = function () {
    return jQuery('body').height();
};

// Override if you need to
$SEQ.body_width = function () {
    return jQuery('body').width();
};

/**
 * Test to see if there's a modal visible.
 */
$SEQ.modal_is_on = function () {
    var $modal = $('.seq-modal-dialog-container');
    return ($modal.length > 0) && ($modal.css('display') == 'block');
};

/**
 * @param title - (String) (Optional) Title for the dialog box.
 * @params html - (String) HTML body.
 * @params ok_label - (String) Label to click, calls the callback with true.
 * @params cancel_label - (String) (Optional) Label to click, calls the callback with false.
 * @params callback - (Function) Function to call:
 *
 *     function (result) { ... true if OK was clicked, false otherwise ... }
 *
 * @params opts - (Hash) More options:
 *
 *     blocker_close: (Boolean) (default: false) Clicking on the blocker will close the page.
 *     blocker_opacity: (Float) (default: 0.5) Opacity level of the blocker.
 *     css_class: (String) (optional) Extra class for the modal-dialog-content.
 *     margins: (Hash) (optional) make the blocker have margins from the edges of the viewport.
 *         Supported margin properties are: top, right, bottom, left.
 *     modal: (Boolean) (default: true) Puts up a modal dialog, darkening the rest of the page.
 *     ok_close: (Boolean) (default: true)
 *     width: (Integer) (optional) Force the width of the dialog.
 */
$SEQ.ModalDialog = function (title, html, ok_label, cancel_label, callback, opts) {
    var dialog_padding = 60;
    var t = this,
        $win = jQuery(window),
        $body = jQuery('body');
        
    var options = {
        blocker_opacity: 0.5,
        ok_close: true,
        margins: {}
    };
    jQuery.extend(options, opts || {});
    if (options.modal == undefined) { options.modal = true; }
    
    var width_css = (options.width ? (' style="width: '+options.width+'px;"') : ''),
        width_title_css = (options.width ? (' style="width: '+(options.width + 60)+'px;"') : '');
        
    // Install the blocker
    var margins = {
        top: options.margins.top || 0,
        right: options.margins.right || 0,
        bottom: options.margins.bottom || 0,
        left: options.margins.left || 0
    };
    margins.effective_height = margins.top + margins.bottom;
    margins.effective_width = margins.left + margins.right;
    t.$blocker = jQuery('<div class="seq-modal-blocker"></div>')
    $body.append(t.$blocker);
    t.$blocker.css({
        top: margins.top, 
        left: margins.left, 
        width: $body.width() - margins.left - margins.right, 
        height: $body.height() - margins.top - margins.bottom, 
        opacity: 0
    }).fadeTo(500, options.blocker_opacity);
    
    // Otherwise put up our dialog
    t.$dialog = jQuery('<div class="seq-modal-dialog-container">'+
        '<div class="seq-modal-dialog-content'+(options.css_class ? (' ' + options.css_class) : '')+'"' + width_css + '>'+
            (title ? ('<div class="seq-modal-title"'+width_title_css+'>'+title+'</div>') : '')+
            '<div class="seq-modal-body">'+
                '<div class="seq-modal-content">' +
                    (html ? html : '')+
                '</div>' +
                '<div class="seq-modal-controls">'+
                    (ok_label ? ('<input class="seq-modal-button-ok" type="button" value="'+ok_label+'" />') : '') +
                    (cancel_label ? ('<input class="seq-modal-button-cancel" type="button" value="'+cancel_label+'" />') : '') +
                '</div>' +  // modal-controls
            '</div>' +  // modal-body
        '</div>'+
    '</div>');
    $body.append(t.$dialog);
    t.$dialog.css({
        top: jQuery(window).scrollTop() + 40, 
        left: margins.left, 
        width: $body.width() - margins.effective_width, 
        height: $body.height() - margins.effective_height, 
        opacity: 0
    }).fadeTo(100, 1.0);
    
    /**
     * Manual closing
     */
    t.close = function () {
        t.$blocker.fadeOut().unbind();
        t.$dialog.fadeOut().unbind();
        window.setTimeout(function () {
            t.$blocker.remove();
            t.$dialog.remove();
        }, 500);
    };

    t.close_dialogs = function (cb, cb_result) {
        t.close();
        if (cb) {
            cb(cb_result);
        }
    };
    
    t.content_div = function () {
        return jQuery('.seq-modal-content', t.$dialog);
    };
    
    t.handle_window_resize = function () {
        var w = $SEQ.body_width() - margins.effective_width,
            h = $SEQ.body_height() - margins.effective_height;
        
        t.$blocker.css({ width: w, height: h });
        t.$dialog.css({ width: w, height: h });
    };

    // Add a closer...?
    (function (cbfn, op) {
        t.$dialog.click(function (ev) {
            if (ev && ev.target) {
                if (ev.target.className == 'seq-modal-button-ok') { 
                    if (options.ok_close) {
                        t.close_dialogs(cbfn, true); 
                    } else {
                        // Hm, we don't close but instead let the callback do the closing...
                        if (cbfn) {
                            cbfn(true);
                        }
                    }
                }
                if (ev.target.className == 'seq-modal-button-cancel') { t.close_dialogs(cbfn, false); }
            } 
        });
        
        if (op.blocker_close) {
            t.$blocker.click(function () {
                t.close_dialogs(cbfn, false);
            });
            t.$dialog.click(function (ev) {
                if (ev && ev.target && ev.target.className == 'seq-modal-dialog-container') {
                    t.close_dialogs(cbfn, false);
                }
            });
        }
    })(callback, options);

    jQuery(window).resize(t.handle_window_resize);
    window.setTimeout(function () {
        t.handle_window_resize();
    }, 100);
};

// ====================================================================

/**
 * Creates a very simple popover that shows up near the element you
 * give it.
 *
 * @param params - (Hash) Initialization params, supporting:
 *
 *     draggable: (bool) (optional) (default: false) Make the popover
 *         draggable?  (REQUIRES: jQuery UI)  Note: If you have a
 *         scrolling results section and you try to move the scrollbar
 *         the whole popover may move as well.  Don't use draggable in
 *         that case!
 *     hide_speed: (int) (optional) Fade speed when hiding, use 0 to
 *         make it fade out immediately.
 *     on_hide: (function) (optional) Callback triggered when this
 *         popover is hidden.
 *     on_show: (function) (optional) Callback triggered when this
 *         popover is shown.
 *     show_speed: (int) (optional) Fade speed when showing, use 0 to
 *         make it fade in immediately.
 */
$SEQ.SimplePopover = function (params) {
    var t = this;
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Appends a section to the body, returning the section itself.
     *
     * @param html_content - (String) HTML content to add.
     * @param additional_css_class - (String) (optional) Additional
     *     class specs.  You can use shortcuts:
     *
     *     'label': Inserts 'seq-popover-label-section'
     *     'results': Inserts 'seq-popover-results'.  Note: create DIV
     *         elements inside the results as 'seq-popover-result'.
     */
    t.appendSection = function (html_content, additional_css_class) {
        if (!additional_css_class) {
            additional_css_class = '';
        } else {
            additional_css_class = ' ' + additional_css_class + ' '; // Pad it out.
            additional_css_class = additional_css_class.
                replace(/ label /g, 'seq-popover-label-section').
                replace(/ results /g, 'seq-popover-results');
        }

        var $new_section = jQuery('<div class="seq-popover-section '+additional_css_class+'">' + html_content + '</div>');
        t.$po_html.append($new_section);
        return $new_section;
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    var createInitialPopoverHtml = function () {
        t.$po_html = jQuery('<div class="seq-popover-box" seq-po-id="'+t.random_id+'">'+
            '<div class="seq-popover-pointer-arrow"></div>' +
            '<div class="seq-popover-dismiss">X</div>' +
        '</div>');
    };
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Hide the popover.
     */
    t.hide = function () {
        if (!t.is_shown) { return; }
        
        if (t.hide_speed > 0) {
            t.$po_html.fadeOut(t.hide_speed);
        } else {
            t.$po_html.hide();
        }
        t.is_shown = false;
        
        if (t.on_hide) {
            t.on_hide(t);
        }
    };
    
    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    var hideIfMouseNotOverPopover = function (ev) {
        if (!t.is_shown) { return; }
        if (!$SEQ.mouse_position) { return; }
        
        var po_pos = t.$po_html.position();
        if (!po_pos) { return; }

        var left_bounds =    po_pos.left,
            right_bounds =   po_pos.left + t.$po_html.width(),
            top_bounds =     po_pos.top,
            bottom_bounds =  po_pos.top + t.$po_html.height(),
            mousex =        $SEQ.mouse_position.left,
            mousey =        $SEQ.mouse_position.top;
        
        if (!(mousex >= left_bounds && mousex <= right_bounds && mousey >= top_bounds && mousey <= bottom_bounds)) {
            t.hide();
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Returns the jQuery popover object itself.
     */
    t.popover = function () {
        return t.$po_html;
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    /**
     * Hide the popover.
     *
     * @param element - (DOM element) element to appear by.
     */
    t.show = function (element) {
        if (!element) { throw 'Missing element'; }
        var $el =       jQuery(element),
            el_width =  $el.width(),
            el_pos =    $el.offset(),
            $body =     jQuery('body'),
            b_offs =    $body.offset();
        $body.append(t.$po_html);
        
        t.$po_html.css({
            left:   el_pos.left + b_offs.left - (t.width/2) + (el_width/2),
            top:    el_pos.top + b_offs.top + t.indicator_height + 20
        });
        
        if (t.show_speed > 0) {
            t.$po_html.fadeIn(t.show_speed);
        } else {
            t.$po_html.show();
        }
        
        // Mark it as shown after a brief delay.
        window.setTimeout(function () {
            t.is_shown = true;
        }, 100);
        
        if (t.on_show) {
            t.on_show(t);
        }
    };

    // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
    
    // Init.
    params = params || {};
    t.hide_speed = params.hide_speed == null ? 250 : params.hide_speed;
    t.show_speed = params.show_speed == null ? 100 : params.show_speed;
    t.width = 200;
    t.indicator_height = 10;
    t.on_hide = params.on_hide;
    t.on_show = params.on_show;
    
    t.random_id = 'SEQ-popover-' + (new Date().getTime()) + '-' + Math.floor(Math.random()*10000);
    t.is_shown = 0;
    createInitialPopoverHtml();
    if (params.draggable) {
        t.$po_html.draggable();
    }
    
    // Standard events
    jQuery(document).click(hideIfMouseNotOverPopover);
    jQuery('.seq-popover-dismiss', t.$po_html).click(t.hide);
};

// =====================================================================

// Utils namespace
$SEQ.utils = $SEQ.utils || {};

// ......................................................................

/**
 * Adds a temporary highlight to a particular element, $el.
 *
 * @param $el - (jQuery Element) Element to affect.
 * @param highlightClass - (String) Classname to apply.
 * @param duration - (String) (optional) Duration to flash, default 400.
 */
$SEQ.utils.addTemporaryClassToElement = function ($el, highlightClass, duration) {
    if (!$el || $el.length < 1) { throw 'Missing $el'; }
    if (!highlightClass) { throw 'Missing highlightClass'; }
    if (duration == null) { duration = 400; }
    
    $el.addClass(highlightClass);
    window.setTimeout(function () {
        $el.removeClass(highlightClass);
    }, duration);
};

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
 * Given a jQuery element bubble up elements until an element's tag is
 * tagName.
 *
 * @param $el - (jQuery Element) Selected element.
 * @param tagName - (String) Tag name for the desired element.
 */
$SEQ.utils.elementBubbleUpToTagName = function ($el, tagName) {
    if (!$el || $el.length < 1) { return null; }
    
    if ($el[0].tagName.toUpperCase() === tagName.toUpperCase()) {
        return $el;
    } else {
        return $SEQ.utils.elementBubbleUpToTagName($el.parent(), tagName);
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
 * Escape a string, s, for URL encoding.
 *
 * @param s - (String) String to be escaped.
 * @return (String) URL-escaped string.
 */
$SEQ.utils.escapeUrl = function (s) {
    if (typeof(s) === 'undefined' || s === null) { return ''; }
    return encodeURIComponent('' + s);
};

// ......................................................................

/**
 * Gets a keycode from an event.
 *
 * @param ev - (Event) Event.
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

// ....................................................................

/**
 * Takes a flat key-value Hash and transforms it into a list of parameters
 * at the end of a base URL.
 *
 * @params base_url - (String) URL to start with
 * @params hash - (Hash of Strings) Non-nested hash of key-value pairs to
 *     add to the base_url.
 * @return (String) URL with the hash appended.
 */
$SEQ.utils.hashToUrl = function (base_url, hash) {
    if (!hash) { return base_url; }
    
    var original_base_url = base_url;
    base_url += (base_url.indexOf('?') >= 0 ? '&' : '?');
    
    var items = [];
    for (var h in hash) {
        items.push($SEQ.utils.escapeUrl(h) + '=' + $SEQ.utils.escapeUrl(hash[h]));
    }
    
    return (base_url + items.join('&')).replace(/[&?]$/, '').replace(/\&+/, '&');
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
 * Tests if the input is 1) an array or null, 2) it has items.  If arr
 * is not an array or null then an exception will be raised.
 *
 * @param arr - (Array or null) Array to be tested.
 * @return true if it's an array and has at least 1 item, false if it
 *     is an array and has no items, exception if not an array or null.
 */
$SEQ.utils.isArrayEmpty = function (arr) {
    if (arr == null || typeof(arr) === 'undefined') { return true; }
    if (!jQuery.isArray(arr)) { throw 'Not an array.'; }
    
    return arr.length < 1;
};

// ....................................................................

/**
 * Tests if a string is blank.
 *
 * @param str - (String) String to test.
 * @return (Boolean) true if it's blank/null/empty string.
 */
$SEQ.utils.isBlank = function (str) {
    return(str == null || jQuery.trim(str) === '');
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
    
    var email_trim = jQuery.trim(email);
    if (email_trim.match(/^[A-Z0-9._%+\-]+\@(([A-Z0-9.\-]+)\.)+[A-Z]{2,4}$/i) ||
        email_trim.match(/^[^<>]+\s*<[A-Z0-9._%+\-]+\@(([A-Z0-9.\-]+)\.)+[A-Z]{2,4}>$/i)
        ) {
        return true;
    }
    return false;
};

// ....................................................................

/**
 * Compares two strings, case sensitive.
 */
$SEQ.utils.stringCompare = function (a,b) {
    var aa = ('' + a),
        bb = ('' + b);
        
    return a < b ? -1 : (a > b ? 1 : 0);
};

// ....................................................................

/**
 * Get the mouse position any time by looking at $SEQ.mouse_position.
 */
$SEQ.utils.updateMousePositionFromEvent = function (ev) {
    if (!ev) { return; }
    $SEQ.mouse_position = {left: ev.pageX, top: ev.pageY}
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

// ====================================================================

// Name shortcuts to commonly-used
$SEQ.a_emp =        $SEQ.utils.isArrayEmpty;
$SEQ.esc =          $SEQ.utils.escapeHtml;
$SEQ.evlsn =        $SEQ.BubbledEventListener;
$SEQ.is_b =         $SEQ.utils.isBlank;

// Bind to some global events if we can.
if (!$SEQ.DISABLE_MOUSE_TRACKING) {
    jQuery(document).
        bind('mousemove', $SEQ.utils.updateMousePositionFromEvent).
        bind('scroll', $SEQ.utils.updateMousePositionFromEvent);
}
