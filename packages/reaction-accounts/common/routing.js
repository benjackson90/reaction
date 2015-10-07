
Router.map(function() {

  this.route('dashboard/accounts', {
    controller: ShopAdminController,
    path: '/dashboard/accounts',
    template: 'accountsDashboard',
    subscriptions: function () {
      this.subscribe('ServiceConfiguration', Meteor.userId())
      this.subscribe('ShopMembers')
    },
  });

  this.route('signIn', {
    controller: ShopController,
    path: 'signin',
    template: 'loginForm'
  });

  // account profile
  this.route('account/profile', {
    controller: ShopAccountsController,
    path: 'account/profile',
    template: 'accountProfile',
    subscriptions: function () {
      this.subscribe('AccountOrders', Meteor.userId())
    },

    data: function () {
      if (this.ready()) {
        if (Orders.findOne() || Meteor.userId()) {
          // if subscription has results or Meteor userId
          return ReactionCore.Collections.Orders.find({}, {sort: { createdAt: -1 }})
        } else {
          this.render('unauthorized');
        }
      } else {
        this.render('loading');
      }
    }

  });


});
