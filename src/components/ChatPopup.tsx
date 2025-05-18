import { useEffect, useState, useRef } from 'react';
import { IonAvatar, IonButton, IonIcon, IonInput, IonText } from '@ionic/react';
import { personCircleOutline, close, send } from 'ionicons/icons';
import { supabase } from '../utils/supabaseClient';

interface ChatPopupProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  onClose: () => void;
}

interface Message {
  id?: number;
  user: string;
  message: string;
  isCurrentUser?: boolean;
}

interface DBMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ userId, username, avatarUrl, onClose }) => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userIdToName, setUserIdToName] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userRow } = await supabase
        .from('users')
        .select('user_id, username')
        .eq('user_email', user.email)
        .single();
      if (!userRow) return;
      setCurrentUserId(userRow.user_id);
      setUserIdToName({ [userRow.user_id]: userRow.username, [parseInt(userId)]: username });
    };
    fetchCurrentUser();
  }, [userId, username]);

  useEffect(() => {
    if (!currentUserId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),` +
          `and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(
          data.map((msg: DBMessage) => ({
            id: msg.id,
            user: String(userIdToName[msg.sender_id] || msg.sender_id),
            message: msg.content,
            isCurrentUser: msg.sender_id === currentUserId
          }))
        );
      }
    };
    fetchMessages();
    // Real-time updates
    if (window.chatMessageChannel) {
      supabase.removeChannel(window.chatMessageChannel);
    }
    window.chatMessageChannel = supabase
      .channel('chat-messages-popup')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId}))`
      }, async (payload: { new: DBMessage }) => {
        const msg: DBMessage = payload.new;
        setMessages(prev => {
          const senderName = String(userIdToName[msg.sender_id] || msg.sender_id);
          if (prev.some(m => m.id === msg.id || (m.message === msg.content && m.user === senderName && m.isCurrentUser === (msg.sender_id === currentUserId)))) return prev;
          return [
            ...prev,
            {
              id: msg.id,
              user: senderName,
              message: msg.content,
              isCurrentUser: msg.sender_id === currentUserId
            }
          ];
        });
      })
      .subscribe();
    return () => {
      if (window.chatMessageChannel) {
        supabase.removeChannel(window.chatMessageChannel);
        window.chatMessageChannel = null;
      }
    };
  }, [currentUserId, userId, userIdToName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !currentUserId) return;
    try {
      setMessages(prev => ([
        ...prev,
        {
          id: Date.now(),
          user: userIdToName[currentUserId] || 'You',
          message,
          isCurrentUser: true
        }
      ]));
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: parseInt(userId),
        content: message
      });
      setMessage('');
    } catch (err) {
      // handle error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 350,
      maxHeight: 500,
      background: '#242526',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 12, background: '#0084ff', color: '#fff', borderRadius: '12px 12px 0 0' }}>
        <IonAvatar style={{ width: 36, height: 36, marginRight: 12 }}>
          {avatarUrl ? <img src={avatarUrl} alt={username} /> : <IonIcon icon={personCircleOutline} />}
        </IonAvatar>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>{username}</div>
        </div>
        <IonButton fill="clear" color="light" onClick={onClose} style={{ minWidth: 0, minHeight: 0 }}>
          <IonIcon icon={close} />
        </IonButton>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#18191a' }}>
        {messages.length === 0 ? (
          <div style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>No messages yet</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isCurrentUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{ background: msg.isCurrentUser ? '#0084ff' : '#3a3b3c', color: msg.isCurrentUser ? '#fff' : '#e4e6eb', borderRadius: 18, padding: '10px 16px', maxWidth: '80%', fontSize: 15, marginBottom: 2, wordBreak: 'break-word' }}>{msg.message}</div>
              <div style={{ color: '#aaa', fontSize: 11, margin: msg.isCurrentUser ? '0 8px 0 0' : '0 0 0 8px', alignSelf: msg.isCurrentUser ? 'flex-end' : 'flex-start' }}>{msg.user}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ background: '#242526', padding: 12, borderTop: '1px solid #393a3b', display: 'flex', alignItems: 'center' }}>
        <IonInput
          value={message}
          placeholder="Aa"
          onIonChange={e => setMessage(e.detail.value ?? '')}
          onKeyPress={handleKeyPress}
          style={{ flex: 1, background: '#3a3b3c', color: '#fff', borderRadius: 20, padding: '10px 16px', marginRight: 12 }}
        />
        <IonButton onClick={sendMessage} color="primary" style={{ borderRadius: '50%', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={!message.trim()}>
          <IonIcon icon={send} />
        </IonButton>
      </div>
    </div>
  );
};

export default ChatPopup; 