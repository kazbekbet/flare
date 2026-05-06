import { useParams } from '@tanstack/react-router';
import { ChatScreen } from '@widgets/chat-screen';

/**
 * Страница детального просмотра переписки.
 * Извлекает `conversationId` из параметров маршрута и передаёт в виджет `ChatScreen`.
 */
export function ChatDetailPage() {
  const { conversationId } = useParams({ strict: false }) as { conversationId: string };

  return <ChatScreen conversationId={conversationId} />;
}
