import { SlackPane } from "./SlackPane";

interface SlackMention {
  id: string;
  conversation_id: string;
  conversation_name: string;
  conversation_type: string;
  is_channel: boolean;
  message_ts: string;
  message_text: string;
  mentioned_by_user_id: string;
  mentioned_by_username: string;
  permalink: string;
  slack_created_at: string;
}

interface SlackColumnProps {
  onMentionsUpdate?: (mentions: SlackMention[]) => void;
  onSlackDataUpdate?: (slackData: {
    channels: any[];
    messages: any[];
    mentions: SlackMention[];
    isConnected: boolean;
  }) => void;
}

// Legacy component - replaced by SlackPane
export function SlackColumn({ onMentionsUpdate, onSlackDataUpdate }: SlackColumnProps) {
  return <SlackPane onMentionsUpdate={onMentionsUpdate} onSlackDataUpdate={onSlackDataUpdate} />;
}