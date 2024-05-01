import React, { memo } from 'react';

import MarkdownTextContent from './private/MarkdownTextContent';
import PlainTextContent from './private/PlainTextContent';
import useRenderMarkdownAsHTML from '../../hooks/useRenderMarkdownAsHTML';

import { type WebChatActivity } from 'botframework-webchat-core';

type Props = Readonly<{
  activity: WebChatActivity;
  contentType?: string;
  text: string;
}>;

const TextContent = memo(({ activity, contentType = 'text/plain', text }: Props) => {
  const supportMarkdown = !!useRenderMarkdownAsHTML();

  return text ? (
    contentType === 'text/markdown' && supportMarkdown ? (
      <MarkdownTextContent activity={activity} markdown={text} />
    ) : (
      <PlainTextContent text={text} />
    )
  ) : null;
});

TextContent.displayName = 'TextContent';

export default TextContent;
