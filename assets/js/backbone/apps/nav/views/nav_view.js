// Nav
//
// Note we need to take special care to not open up this view multiple times.
// Bootstrap modals do work with multiple modal opens, and that wouldn't make
// sense anyway. We do that via a variable here (doingLogin) that bypasses
// the render here, and is reset by a callback when the modal closes later.
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var UIConfig = require('../../../config/ui.json');
var Login = require('../../../config/login.json');
var LoginController = require('../../login/controllers/login_controller');
var NavTemplate = require('../templates/nav_template.html');
var IdleModal = require('../../../components/modal_idle');
var User = require('../../../../utils/user');

var NavView = Backbone.View.extend({
  events: {
    'click .navbar-brand': linkBackbone,
    'click .nav-link': linkBackbone,
    'click .login': 'loginClick',
    'click .logout': 'logout',
    'click .toggle-one': 'toggleMenu',
    'click .toggle-two': 'toggleMenu2',
  },

  initialize: function (options) {
    var self = this;
    this.options = options;

    this.listenTo(window.cache.userEvents, 'user:login:success', function (userData) {
      self.doRender({ user: userData });
      this.idleModal = new IdleModal({ el: '#login-wrapper' }).render();
      this.idleModal.resetTimeout();
      var referrer = window.location.search.replace('?','') + window.location.hash;
      Backbone.history.navigate('/' + referrer, { trigger: true, replaceState: true });
    });

    this.listenTo(window.cache.userEvents, 'user:login:close', function () {
      self.doingLogin = false;
    });

    this.listenTo(window.cache.userEvents, 'user:request:logout', function () {
      if(this.idleModal) this.idleModal.cleanup();
      self.logout({});
    });

    this.listenTo(window.cache.userEvents, 'user:logout', function () {
      self.doRender({ user: null });
      Backbone.history.navigate('', {trigger: true});
      this.idleModal.cleanup();
      window.cache.userEvents.trigger('user:logout:success');
    });

    // request that the user log in to see the page
    this.listenTo(window.cache.userEvents, 'user:request:login', function (message) {
      Backbone.history.navigate('/login', {trigger: true});
    });

    // update the navbar when the profile changes
    this.listenTo(window.cache.userEvents, 'user:profile:save', function (data) {
      $.ajax({
        url: '/api/user',
        dataType: 'json',
      }).done(function (data) {
        // reset the currentUser object
        window.cache.currentUser = new User(data);
        // re-render the view
        self.render();
      });
    });

    // update the user's photo when they change it
    this.listenTo(window.cache.userEvents, 'user:profile:photo:save', function (url) {
      $('.navbar-people').attr('src', url);
    });
  },

  render: function () {
    var self = this;
    this.doRender({ user: window.cache.currentUser, systemName: window.cache.system.name });
    if(window.cache.currentUser) {
      this.idleModal = new IdleModal({ el: '#login-wrapper' }).render();
      this.idleModal.resetTimeout();
    }
    return this;
  },

  doRender: function (data) {
    data.login = Login;
    data.ui = UIConfig;
    var template = _.template(NavTemplate)(data);
    this.$el.html(template);
    this.$el.localize();
    this.activePage();
  },

  activePage: function () {
    if (window.cache.currentUser && window.location.pathname.match('profile/' + window.cache.currentUser.id)) {
      //set Profile to active
      $('a[title="Account"]').addClass('is-active');
      $('a[title="Account"] > span').removeClass('usajobs-nav--openopps__section');
      $('a[title="Account"] > span').addClass('usajobs-nav--openopps__section-active');
    }
    else if (window.location.pathname.match(/profiles\/?$/)) {
      //set People to active
      $('a[title="People"]').addClass('is-active');
      $('a[title="People"] > span').removeClass('usajobs-nav--openopps__section');
      $('a[title="People"] > span').addClass('usajobs-nav--openopps__section-active');
    }
    else if (window.location.pathname.match(/tasks\/?$/)) {
      //set Search to active
      $('a[title="Search Opportunities"]').addClass('is-active');
      $('a[title="Search Opportunities"] > span').removeClass('usajobs-nav--openopps__section');
      $('a[title="Search Opportunities"] > span').addClass('usajobs-nav--openopps__section-active');
    }
    else {
      //do nothing
    }
  },

  toggleMenu: function (e) {
    if (e.preventDefault) e.preventDefault();
    $('.usajobs-nav__account').attr('data-state', function (i, attr) {
      return attr == 'is-open' ? 'is-closed' : 'is-open';
    });
    $('#section-one').attr('aria-expanded', function (i, attr) {
      return attr == 'true' ? 'false' : 'true';
    });
    //close other menu
    $('.usajobs-nav__menu-search.mobile').attr('data-state', function (i, attr) {
      return attr == 'is-closed';
    });
    $('#section-two').attr('aria-expanded', function (i, attr) {
      return attr == 'false';
    });
  },

  toggleMenu2: function (e) {
    if (e.preventDefault) e.preventDefault();
    $('.usajobs-nav__menu-search.mobile').attr('data-state', function (i, attr) {
      return attr == 'is-open' ? 'is-closed' : 'is-open';
    });
    $('#section-two').attr('aria-expanded', function (i, attr) {
      return attr == 'true' ? 'false' : 'true';
    });
    //close other menu
    $('.usajobs-nav__account').attr('data-state', function (i, attr) {
      return attr == 'is-closed';
    });
    $('#section-one').attr('aria-expanded', function (i, attr) {
      return attr == 'false';
    });
  },

  loginClick: function (e) {
    if (e.preventDefault) e.preventDefault();
    Backbone.history.navigate('/login', {trigger: true});
  },

  logout: function (e) {
    if (e.preventDefault) e.preventDefault();
    $.ajax({
      url: '/api/auth/logout?json=true',
    }).done(function (success) {
      window.cache.currentUser = null;
      window.cache.userEvents.trigger('user:logout');
    }).fail(function (error) {
      // do nothing
    });
  },

  cleanup: function () {
    if (this.loginController) {
      this.loginController.cleanup();
    }
    if (this.idleModal) {
      this.idleModal.cleanup();
    }
    removeView(this);
  },
});

module.exports = NavView;
