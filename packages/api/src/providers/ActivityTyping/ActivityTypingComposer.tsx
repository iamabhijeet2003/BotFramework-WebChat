import type { WebChatActivity } from 'botframework-webchat-core';
import React, { memo, useMemo, type ReactNode } from 'react';
import { useRefFrom } from 'use-ref-from';

import numberWithInfinity from '../../hooks/private/numberWithInfinity';
import useActivities from '../../hooks/useActivities';
import usePonyfill from '../../hooks/usePonyfill';
import useUpsertedActivities from '../../providers/ActivityListener/useUpsertedActivities';
import ActivityTypingContext, { ActivityTypingContextType } from './private/Context';
import useMemoWithPrevious from './private/useMemoWithPrevious';
import { type AllTyping } from './types/AllTyping';

const INITIAL_ALL_TYPING_STATE = Object.freeze([Object.freeze(new Map())] as const);

type Props = Readonly<{ children?: ReactNode | undefined }>;

function isLivestream(activity: WebChatActivity): boolean {
  return activity.type === 'typing' && 'text' in activity && typeof activity.text === 'string';
}

const ActivityTypingComposer = ({ children }: Props) => {
  const [{ Date }] = usePonyfill();
  const [activities] = useActivities();
  const [upsertedActivities] = useUpsertedActivities();
  const activitiesRef = useRefFrom(activities);

  const allTypingState = useMemoWithPrevious<readonly [ReadonlyMap<string, AllTyping>]>(
    (prevAllTypingState = INITIAL_ALL_TYPING_STATE) => {
      const { current: activities } = activitiesRef;
      const nextTyping = new Map(prevAllTypingState[0]);
      let changed = false;

      const firstIndex = upsertedActivities.reduce(
        (firstIndex, upsertedActivity) => Math.min(firstIndex, activities.indexOf(upsertedActivity)),
        Infinity
      );

      for (const activity of activities.slice(firstIndex)) {
        const {
          from,
          from: { id, role },
          type
        } = activity;

        if (type === 'typing' && (role === 'bot' || role === 'user')) {
          const currentTyping = nextTyping.get(id);
          // TODO: When we rework on types of DLActivity, we will make sure all activities has "webChat.appearAt", this coalesces can be removed.
          const appearAt = activity.channelData.webChat?.appearAt || Date.now();

          nextTyping.set(id, {
            firstAppearAt: currentTyping?.firstAppearAt || appearAt,
            lastActivityDuration: numberWithInfinity(
              activity.channelData.webChat?.styleOptions?.typingAnimationDuration
            ),
            lastAppearAt: appearAt,
            name: from.name,
            role,
            type: isLivestream(activity) ? 'livestream' : 'indicator'
          });

          changed = true;
        } else if (type === 'message') {
          nextTyping.delete(id);
          changed = true;
        }
      }

      return changed ? Object.freeze([nextTyping]) : prevAllTypingState;
    },
    [activitiesRef, upsertedActivities]
  );

  const context = useMemo<ActivityTypingContextType>(() => ({ allTypingState }), [allTypingState]);

  return <ActivityTypingContext.Provider value={context}>{children}</ActivityTypingContext.Provider>;
};

ActivityTypingComposer.displayName = 'ActivityTypingComposer';

export default memo(ActivityTypingComposer);
