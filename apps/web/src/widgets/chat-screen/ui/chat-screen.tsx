import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppSelector } from '@app/store';
import { useGetConversationsQuery } from '@entities/conversation';
import type { MessageView } from '@entities/message';
import { useGetMessagesQuery } from '@entities/message';
import { useGetPublicKeyQuery } from '@entities/user';
import { ActionIcon, Box, Flex, Loader, Stack, Text, TextInput } from '@mantine/core';
import { emitOrQueue, getSocket } from '@shared/api';

import { decryptMessage, encryptMessage } from '@flare/shared';

import { MessageBubble } from './message-bubble';

/** Пропсы экрана чата. */
interface ChatScreenProps {
  /** Идентификатор переписки. */
  conversationId: string;
}

/**
 * Экран отдельной переписки: список сообщений + поле ввода с отправкой.
 * Загружает историю через RTK Query, слушает новые сообщения через WebSocket,
 * шифрует исходящие и расшифровывает входящие сообщения (NaCl box).
 */
export function ChatScreen({ conversationId }: ChatScreenProps) {
  const userId = useAppSelector((s) => s.session.userId);
  const privateKey = useAppSelector((s) => s.session.privateKey);
  const realtimeMessages = useAppSelector((s) => s.messages[conversationId] ?? []);

  const { data: history, isLoading } = useGetMessagesQuery({ conversationId });
  const { data: conversations } = useGetConversationsQuery();

  const conversation = conversations?.find((c) => c._id === conversationId);
  const recipientId = conversation?.memberIds.find((id) => id !== userId) ?? '';

  const { data: recipientKeyData } = useGetPublicKeyQuery(recipientId, { skip: !recipientId });
  const recipientPubKey = recipientKeyData?.publicKey ?? '';

  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Скролл вниз к последнему сообщению. */
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  /** Объединённый список: история + real-time сообщения. */
  const allMessages = [...(history ?? []), ...realtimeMessages];

  useEffect(() => {
    scrollToBottom();
  }, [allMessages.length, scrollToBottom]);

  /**
   * Расшифровка текста сообщения.
   * В DIRECT-переписке публичный ключ другого участника используется
   * и для расшифровки входящих (как senderPubKey), и для исходящих.
   */
  const decrypt = useCallback(
    (msg: MessageView): string => {
      if (!privateKey) return '[ключ не разблокирован]';
      if (!recipientPubKey) return '[ключ собеседника не загружен]';

      try {
        return decryptMessage(msg.encryptedContent, msg.nonce, recipientPubKey, privateKey);
      } catch {
        return '[не удалось расшифровать]';
      }
    },
    [privateKey, recipientPubKey],
  );

  /** Обработчик отправки сообщения. */
  const handleSend = useCallback(() => {
    const trimmed = text.trim();

    if (!trimmed || !recipientPubKey || !privateKey) return;

    const { ciphertext, nonce } = encryptMessage(trimmed, recipientPubKey, privateKey);

    const socket = getSocket();

    emitOrQueue(socket, 'message:send', {
      conversationId,
      encryptedContent: ciphertext,
      nonce,
      type: 'TEXT',
    });

    setText('');
  }, [text, recipientPubKey, privateKey, conversationId]);

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="100%">
        <Loader />
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%">
      <Box ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }} p="md">
        <Stack gap="xs">
          {allMessages.length === 0 && (
            <Text c="dimmed" ta="center" mt="xl">
              Нет сообщений. Начните переписку!
            </Text>
          )}

          {allMessages.map((msg) => (
            <MessageBubble
              key={msg._id}
              text={decrypt(msg)}
              createdAt={msg.createdAt}
              isMine={msg.senderId === userId}
              delivered={!!msg.deliveredAt}
              read={!!msg.readAt}
            />
          ))}
        </Stack>
      </Box>

      <Flex p="md" gap="sm" align="center" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
        <TextInput
          flex={1}
          placeholder="Сообщение..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <ActionIcon size="lg" variant="filled" onClick={handleSend} disabled={!text.trim()}>
          {'\u27A4'}
        </ActionIcon>
      </Flex>
    </Flex>
  );
}
