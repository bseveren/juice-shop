window.FeedbackData = (function () {
  var module = {};

  module.defaultOptions = {
    mode: ''
  };

  module.construct = function (dataModel, options) {
    var self = this;

    self.options = $.extend(true, module.defaultOptions, options);

    self.loading = ko.observable();
    self.loadingMoreFeedback = ko.observable();
    self.maxFeedback = ko.observable(0);
    self.records = ko.observableArray();
    self.model = dataModel;

    self.viewFeedbackListingsByType = function (values) {
      const feedbackTypes = _.dr(values, 'feedback_types.length')
        ? _.dr(values, 'feedback_types')
        : [
            'inspection',
            'ofi',
            'offer',
            'agent_vendor',
            'price_reduction',
            'enquiry',
            'followup'
          ];

      self.loading(true);

      var criteria = [{ name: 'contact_id', value: self.model.data._id }];
      criteria.push({
        name: 'feedback_type_id',
        type: 'in',
        value: feedbackTypes
      });
      if (_.dr(values, 'interest_levels.length')) {
        criteria.push({
          name: 'interest_level_id',
          type: 'in',
          value: _.dr(values, 'interest_levels')
        });
      }
      if (_.dr(values, 'listing_states.length')) {
        criteria.push({
          name: 'listing_state',
          type: 'in',
          value: _.dr(values, 'listing_states')
        });
      }
      if (_.dr(values, 'starts_at')) {
        criteria.push({
          name: 'date_of',
          type: '>=',
          value: _.dr(values, 'starts_at')
        });
      }
      if (_.dr(values, 'ends_at')) {
        criteria.push({
          name: 'date_of',
          type: '<=',
          value: _.dr(values, 'ends_at')
        });
      }

      _.wings({ criteria: criteria }, 'Feedback::getListingViewstateForSearch')
        .then(function (response) {
          if (response) {
            new r2.data.modelBuilder.lists.listings().gotoViewstate(response);
          } else {
            r2.ui.dialogs.system.notice(
              'No listings found',
              () => self.selectRecordFeedbackTypes('listing'),
              {
                title: 'Unable to view listings'
              }
            );
          }
        })
        .fail(r2.u.StandardError.getHandler())
        .always(function () {
          self.loading(false);
        });
    };

    self.viewFeedbackContacts = function (feedback) {
      const type = _.dr(feedback, 'data.feedback_type.id');
      if (type === 'ofi') {
        AVM.shell.dialogs.filterFeedbackContacts.open({
          values: self.filterFeedbackContactsValues(),
          onClose: ({ values }) => {
            self.filterFeedbackContactsValues(values);
            load(values);
          }
        });
      } else {
        load({});
      }

      function load(values) {
        var criteria = [{ name: 'id', value: _.dr(feedback, 'data.id') }];
        if (_.dr(values, 'interest_levels.length')) {
          criteria.push({
            name: 'interest_level_id',

    self.mapRecord = function (feedbackModel) {
      var feedbackItem = {
        data: ko.mapping.fromJS(
          feedbackModel.data,
          r2.u.knockout.basicMapOptions([
            'system_approval_status',
            'system_approval_status_user',
            'interest_level',
            'enquiry_source',
            'project',
            'project_stage'
          ])
        ),
        model: feedbackModel
      };

      feedbackItem.reportedToVendor = ko.computed({
        read: function () {
          return feedbackItem.data.is_reported();
        },
        write: function (checked) {
          feedbackItem.loading(true);

          feedbackItem.model.setVendorReported(checked, function () {
            feedbackItem.data.is_reported(checked);
            feedbackItem.loading(false);
          });
        }
      });

      feedbackItem.approvedForReporting = ko.computed({
        owner: feedbackItem,
        read: function () {
          return (
            _.dotRead(this, 'data.system_approval_status.id', true) ==
            'approved'
          );
        },
        write: function (status) {
          var self = this;
          self.loading(true);

          self.model.setApprovalStatus(
            status ? 'approved' : 'pending',
            function (response) {
              self.data.system_approval_status(response.system_approval_status);
              self.data.system_approval_status_user(
                response.system_approval_status_user
              );
              self.data.system_approval_status_time(
                response.system_approval_status_time
              );
              self.loading(false);
            }
          );
        }
      });

      feedbackItem.loading = ko.observable(false);

      feedbackItem.isIndividualOfiFeedback = ko.computed(function () {
        return (
          _.dotRead(this, 'data.feedback_type.id', true) === 'ofi' &&
          _.dotRead(this, 'data.contact_context_feedback', true)
        );
      }, feedbackItem);

      feedbackItem.noteClass = ko.computed(function () {
        var fbTypeId = _.dotRead(this, 'data.feedback_type.id', true);
        var cls = (this.loading() ? 'loading ' : '') + ' ' + fbTypeId;
        if (this.isIndividualOfiFeedback()) {
          cls += ' individual';
        }
        return cls;
      }, feedbackItem);

      feedbackItem.actionable = ko.computed(function () {
        return true;
      }, feedbackItem);

      feedbackItem.listingAddress = ko.computed(function () {
        return r2.u.app.listing.getAddressString(_.fromKo(this.data.listing));
      }, feedbackItem);

      feedbackItem.relatedProjects = ko.computed(function () {
        return [
          {
            displayText: _.dr(feedbackItem, 'data.project.name'),
            onClick: function (context, ev) {
              r2.ui.popouts.previewRecord(
                ev,
                'Projects',
                _.dr(feedbackItem, 'data.project.id'),
                {
                  my: 'left top',
                  at: 'center bottom'
                }
              );
            }
          }

      feedbackItem.previewListing = function (feedback, e) {
        var clicked = $(e.target);

        var target = clicked;

        AVM.popouts.listing.previewListing.show(
          feedback.data.listing.id(),
          target,
          function (gotoId) {
            r2.u.actions.redirect(
              '/listings/#id=' + feedback.data.listing.id(),
              false,
              true
            );
          },
          'left top',
          'center bottom'
        );
      };
