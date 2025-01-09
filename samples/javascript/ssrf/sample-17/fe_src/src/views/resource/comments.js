import I18n from 'i18n-js';
import ProfileImage from 'components/profile_image';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import flux from 'flux';
import React from 'react';
import { User, WebStorage } from 'helpers';
import UserComment from 'components/comment';
import CommentForm from 'components/forms/pd_resource_comment';
import DetailSection from 'components/detail_section';
import useCurrentUser from 'hooks/useCurrentUser';
import { getComments } from 'actions/resource_comments';
import { getConversations } from 'actions/resource';

function ConversationForm({ recommendedResourceId }) {
  const currentUser = useCurrentUser();
  const [isDisabled, setIsDisabled] = React.useState(false);
  const [isCommenting, setIsCommenting] = React.useState(false);
  const [conversation, setConversation] = React.useState();
  const commentInputRef = React.useRef(null);

  React.useEffect(() => {
    const fetchConversation = async () => {
      if (!recommendedResourceId) {
        return;
      }

      const { data } = await getComments(recommendedResourceId);
      setConversation(data);

      flux.actions.resourceComments
        .markAsRead(recommendedResourceId)
        .then(() => {
          flux.actions.notification.fetchNotifications();
        });
    };

    fetchConversation();
  }, [recommendedResourceId]);
