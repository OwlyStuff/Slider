/**
 * Owly Stuff - Slider v0.0.1
 *
 * Released under the MIT license
 *
 * Created By: Shahrukh Omar <shahrukhomar@gmail.com> https://github.com/OwlyStuff
 */

(function($, window, undefined) {

    "use strict"

    var _vendorSupport = ["Moz", "Webkit", "Khtml", "O", "ms"],
        _namespace     = '.owlystuff.slider',
        _constants     = {
            directionNext: -1,
            directionPrev: 1
        }

    var Slider = function($parent, config) {
        this.$parent      = $parent
        this.config       = config
        this.$slides      = this.$parent.children()
        this.activeSlide  = this.isAnimating = 0
        this.vendorPrefix = _getNativeCSS3TransitionsPrefix()
        this.init()
    }

    Slider.prototype = {
        init: function() {
            if (_setStage(this.$slides)) {
                // check if we have any actionables elements
                var actionables = this.$parent.data('slider-actions')
                if (actionables && actionables.length) {
                    // actionables are expected to be comma seperated list of selectors
                    $.each(actionables.split(','), $.proxy(function(index, value) {
                        var $actionable = $(value)
                        if ($actionable instanceof jQuery) {
                            // the actionable must define the action and the action
                            // must be a callable function that is exposed by this plugin
                            var action = $actionable.data('slider-action')
                            if (action.length) {
                                action = this[action]
                                if (typeof action === 'function') {
                                    $actionable.on('click'+_namespace, $.proxy(action, this))
                                }
                            }
                        }
                    }, this))
                }

                // kick off the autplay if it is required for the slideshow
                if (this.config.autoplay) {
                    this.play()
                }
            }
        }

        , next: function() {
            _animate({
                    direction: _constants.directionNext,
                    from:      $(this.$slides[this.activeSlide]),
                    to:        $(this.$slides[this.getNextSlideIndex()]),
                    effect:    this.config.transitionEffect
                }, this)
        }

        , previous: function() {
            _animate({
                    direction: _constants.directionPrev,
                    from:      $(this.$slides[this.activeSlide]),
                    to:        $(this.$slides[this.getPreviousSlideIndex()]),
                    effect:    this.config.transitionEffect
                }, this)
        }

        , gotoSlide: function(index) {
            // this method can be called as callback for click event so we need
            // to capture the origin target and resolve the target slide attribute
            if (typeof index === 'object') {
                if (index.originalEvent) {
                    var slideIndex = $(index.originalEvent.target).data('slider-slide-index')
                    slideIndex != undefined && (index = slideIndex)
                }
            }

            if (typeof index == 'number') {
                // make sure the requested index is in range
                if (index > 0 && index < this.$slides.length - 1) {
                    _animate({
                        direction: index > this.activeSlide ? _constants.directionNext : _constants.directionPrev,
                        from:      $(this.$slides[this.activeSlide]),
                        to:        $(this.$slides[index]),
                        effect:    this.config.transitionEffect
                    }, this)
                }
            }
        }

        , getNextSlideIndex: function() {

            if (this.activeSlide == this.$slides.length - 1) {
                return 0
            }

            return this.activeSlide + 1
        }

        , getPreviousSlideIndex: function() {
            if (this.activeSlide == 0) {
                // wrap around if at the first slide
                return this.$slides.length - 1
            }

            return this.activeSlide - 1
        }

        , play: function() {
            this.pause() // clear any existing intervals set for this instance
            if (this.autoplayInterval == undefined && this.config.autoplay) {
                this.autoplayInterval = window.setTimeout(
                    $.proxy(this.next, this), this.config.autoplayInterval)
            }

        }

        , pause: function() {
            this.autoplayInterval != undefined && window.clearTimeout(this.autoplayInterval)
            this.autoplayInterval = undefined
        }
    }

    //--- PRIVATE FUNCTIONS

    // Users should setup their slideshow so only the first slide ever shows
    // on load, this function basically ensures that's the case when the
    // slideshow hasn't been setup correctly
    function _setStage($slides) {
        if ($slides instanceof jQuery && $slides.length > 1) {
            $slides.not(':first-child').hide()

            return true
        }

        return false
    }

    function _reset(token, _this) {
        token.from.hide()
        _this.activeSlide = token.to.index()
        _this.isAnimating = _this.$parent[0].style['left'] = token.to[0].style['left'] = token.from[0].style['left'] = 0
    }

    function _animate(token, _this) {
        _this.pause()
        if (!_this.isAnimating) {
            _prepareSlide(_this, token)
            _this.config.transitionEffect == 'fade' ? _fade(token, _this) : _slide(token, _this)
        }
        _this.config.autoplay && _this.play()
    }

    function _slide(token, _this) {
        var distance = token.direction * token.to.outerWidth(),
            duration = token.speed ? token.speed : _this.config.transitionDuration

        // isAnimating is an animation lock that will disregard multiple animation
        // requests when one is already under way
        _this.isAnimating = true

        // Use native CSS3 transitions to slide if they are supported
        if (_this.vendorPrefix) {
            var styles = {}
            styles[_this.vendorPrefix + "Transform"] = "translate3d(" + distance + "px,0,0)"
            styles[_this.vendorPrefix + "TransitionDuration"] = duration + "ms"
            styles[_this.vendorPrefix + "TransitionTimingFunction"] = "ease"

            for (var style in styles) {
                _this.$parent[0].style[style] = styles[style]
            }

            _this.$parent.one("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function() {
                // reset transition styles
                for (var style in styles) {
                    _this.$parent[0].style[style] = ""
                }
                _reset(token, _this)
            })
        } else { //fallback
            _this.$parent
                .stop() // clear the animation queue
                .animate({left: distance}, duration, 'swing', function(){_reset(token, _this)})
        }
    }

    function _fade(token, _this) {
        // set up two deffered promises for the fade in and fade out complete
        // callbacks, we'll reset the isAnimating flag to false only when both
        // of these are complete
        var fadeOutPromise = $.Deferred(),
            fadeInPromise  = $.Deferred(),
            duration       = token.speed ? token.speed : _this.config.transitionDuration

        _this.isAnimating = true
        token.to
            .css('opacity', 0)
            .show()
            .stop()
            .animate({opacity:1}, duration, 'swing', fadeInPromise.resolve)

        token.from
            .stop()
            .animate({opacity:0}, duration, 'swing', fadeOutPromise.resolve)

        // reset the isAnimating flag only when both promises have resolved
        $.when(fadeInPromise, fadeOutPromise).done(function() {
            _reset(token, _this)
        })
    }

    function _prepareSlide(_this, token) {
        // when sliding; ensure the target slide is visible AND in position i.e.
        // offset by the width of slideshow in the direction of the slide
        if (token.effect == "slide") {
            if (token.to.length) {
                var offset = token.direction * _this.$parent.outerWidth() * -1
                token.to.show().css('left', offset)
            }
        }
    }

    function _getNativeCSS3TransitionsPrefix() {
        var body  = document.body || document.documentElement,
            // query the CSSStyleDeclaration collection for the native
            // transition effects support
            style = body.style,
            i     = 0

        while (i < _vendorSupport.length) {
            if (typeof style[_vendorSupport[i] + "Transition"] === "string") {
                return _vendorSupport[i]
            } i++
        }

        return undefined
    }

    $.fn.slider = function(o) {
        var i = this.data('owlystuff-slider'),
            // override the default config params with ones being passed when set
            o = $.extend({}, $.fn.slider.defaults, o)
        if (!i) this.data('owlystuff-slider', (i = new Slider(this, o)))

        return i
    }

    $.fn.slider.defaults = {
        transitionDuration: 1000,    // ms
        transitionEffect  : 'slide', // {slide|fade}
        autoplay          : true,    // {true|false}
        autoplayInterval  : 4000     // ms
    }

    $(function() {
        $('[data-slider]').each(function() {
            var $this = $(this)
            $this.slider({
                // fetch slider config param from data attrs if set
                transitionDuration: $this.data('slider-transition-duration'),
                transitionEffect  : $this.data('slider'),
                autoplay          : $this.data('slider-autoplay'),
                autoplayInterval  : $this.data('slider-autoplay-interval')
            })
        })
    })
})(jQuery, this);
