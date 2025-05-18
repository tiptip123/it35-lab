import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonBadge,
  IonSearchbar,
  IonIcon,
  IonButton,
  IonInput,
  IonText
} from '@ionic/react';
import { useEffect, useState, useRef } from 'react';
import { personCircleOutline, close, send } from 'ionicons/icons';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabaseClient';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string;
  online: boolean;
  last_online?: string;
}

interface Message {
  id?: number;
  user: string;       // Username of sender
  message: string;    // Message content
  isCurrentUser?: boolean; // For styling
}

// Message type for DB
interface DBMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

// For TypeScript: extend window to allow chatMessageChannel
declare global {
  interface Window {
    chatMessageChannel?: any;
  }
}

const ChatTab: React.FC = () => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [userIdToName, setUserIdToName] = useState<Record<number, string>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});

  // Keep your existing contact fetching logic
  useEffect(() => {
    const fetchUsersAndSetupPresence = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;
        setCurrentUser(user);

        // Use user_email to get current user's user_id and username
        const { data: userRow, error: userRowError } = await supabase
          .from('users')
          .select('user_id, username')
          .eq('user_email', user.email)
          .single();
        if (userRowError || !userRow) throw userRowError || new Error('Current user not found');
        setCurrentUserId(userRow.user_id);

        // Fetch all other users as before
        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, user_avatar_url, last_online')
          .neq('user_id', userRow.user_id)
          .order('username', { ascending: true });
        if (error) throw error;

        const now = new Date();
        const threshold = new Date(now.getTime() - 5 * 60 * 1000);

        const formattedUsers: ChatUser[] = data.map((dbUser: any) => ({
          id: dbUser.user_id,
          username: dbUser.username,
          avatar_url: dbUser.user_avatar_url || '',
          online: dbUser.last_online ? new Date(dbUser.last_online) > threshold : false,
          last_online: dbUser.last_online || ''
        }));
        // Build userId to username map (including self)
        const userMap: Record<number, string> = {};
        formattedUsers.forEach(u => { userMap[parseInt(u.id)] = u.username; });
        userMap[userRow.user_id] = typeof userRow.username === 'string' ? userRow.username : (user.email?.split('@')[0] ?? 'You');
        setUserIdToName(userMap);

        setUsers(formattedUsers);

        // Fetch last message for each user
        for (const u of formattedUsers) {
          const { data, error } = await supabase
            .from('messages')
            .select('content')
            .or(
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${u.id}),` +
              `and(sender_id.eq.${u.id},receiver_id.eq.${currentUserId})`
            )
            .order('created_at', { ascending: false })
            .limit(1);
          if (!error && data && data[0]) {
            setLastMessages(prev => ({ ...prev, [u.id]: data[0].content }));
          }
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsersAndSetupPresence();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchText.toLowerCase())
  );

  // Load message history and subscribe to real-time updates
  const openChat = async (user: ChatUser) => {
    setActiveChatUser(user);
    setIsChatOpen(true);
    setActiveChatUserId(parseInt(user.id));
    setMessages([]);

    if (!currentUserId) return;

    // Fetch message history
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),` +
        `and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(
        data.map((msg: DBMessage) => ({
          id: msg.id,
          user: String(userIdToName[msg.sender_id] || msg.sender_id),
          message: msg.content,
          isCurrentUser: msg.sender_id === currentUserId
        }))
      );
    }

    // Subscribe to real-time updates for this chat
    if (window.chatMessageChannel) {
      supabase.removeChannel(window.chatMessageChannel);
    }
    window.chatMessageChannel = supabase
      .channel('chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId}))`
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
  };

  // Clean up channel on unmount or chat change
  useEffect(() => {
    return () => {
      if (window.chatMessageChannel) {
        supabase.removeChannel(window.chatMessageChannel);
        window.chatMessageChannel = null;
      }
    };
  }, [activeChatUserId]);

  const sendMessage = async () => {
    if (!message.trim() || !currentUser || !activeChatUser || !currentUserId) return;
    try {
      const otherUserId = parseInt(activeChatUser.id);
      // Optimistically add the message to the UI
      setMessages(prev => ([
        ...prev,
        {
          id: Date.now(), // temp id
          user: String(userIdToName[currentUserId] || 'You'),
          message,
          isCurrentUser: true
        }
      ]));
      // Save to database
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: message
        });
      if (error) throw error;
      setMessage(''); // Only clear input
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Messages</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen style={{ padding: 0 }}>
        <div style={{ display: 'flex', height: '100vh', background: '#18191a' }}>
          {/* Sidebar: Chat List */}
          <div style={{ width: 340, background: '#242526', borderRight: '1px solid #393a3b', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #393a3b' }}>
              <IonSearchbar
                placeholder="Search Messenger..."
                value={searchText}
                onIonChange={e => setSearchText(e.detail.value ?? '')}
                style={{ background: '#3a3b3c', color: '#fff', borderRadius: 8 }}
                inputmode="search"
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>No users available</div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => openChat(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: activeChatUser && activeChatUser.id === user.id ? '#393a3b' : 'transparent',
                      cursor: 'pointer',
                      borderLeft: activeChatUser && activeChatUser.id === user.id ? '4px solid #0084ff' : '4px solid transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    <IonAvatar style={{ position: 'relative', width: 48, height: 48, marginRight: 16 }}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} />
                      ) : (
                        <IonIcon icon={personCircleOutline} style={{ fontSize: '40px', color: '#888' }} />
                      )}
                      {user.online && (
                        <div style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 12,
                          height: 12,
                          backgroundColor: '#31A24C',
                          borderRadius: '50%',
                          border: '2px solid #242526',
                        }}></div>
                      )}
                    </IonAvatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 500, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</div>
                      <div style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMessages[user.id] || 'No messages yet'}</div>
                    </div>
                    {user.online && <span style={{ color: '#31A24C', fontSize: 12, marginLeft: 8 }}>●</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#18191a' }}>
            {/* Chat Header */}
            <div style={{ height: 64, background: '#242526', borderBottom: '1px solid #393a3b', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
              {activeChatUser ? (
                <>
                  <IonAvatar style={{ width: 40, height: 40, marginRight: 16 }}>
                    {activeChatUser.avatar_url ? (
                      <img src={activeChatUser.avatar_url} alt={activeChatUser.username} />
                    ) : (
                      <IonIcon icon={personCircleOutline} style={{ fontSize: '32px', color: '#888' }} />
                    )}
                  </IonAvatar>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: 17 }}>{activeChatUser.username}</div>
                    <div style={{ color: activeChatUser.online ? '#31A24C' : '#aaa', fontSize: 13 }}>{activeChatUser.online ? 'Active now' : 'Offline'}</div>
                  </div>
                </>
              ) : (
                <div style={{ color: '#aaa', fontSize: 18 }}>Select a chat to start messaging</div>
              )}
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', background: '#18191a' }}>
              {activeChatUser && messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.isCurrentUser ? 'flex-end' : 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        background: msg.isCurrentUser ? '#0084ff' : '#3a3b3c',
                        color: msg.isCurrentUser ? '#fff' : '#e4e6eb',
                        borderRadius: 18,
                        padding: '10px 16px',
                        maxWidth: '70%',
                        fontSize: 15,
                        marginBottom: 2,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.message}
                    </div>
                    <div style={{ color: '#aaa', fontSize: 11, margin: msg.isCurrentUser ? '0 8px 0 0' : '0 0 0 8px', alignSelf: msg.isCurrentUser ? 'flex-end' : 'flex-start' }}>
                      {msg.user}
                    </div>
                  </div>
                ))
              ) : activeChatUser ? (
                <div style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>No messages yet</div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {activeChatUser && (
              <div style={{ background: '#242526', padding: 16, borderTop: '1px solid #393a3b', display: 'flex', alignItems: 'center' }}>
                <IonInput
                  value={message}
                  placeholder="Aa"
                  onIonChange={e => setMessage(e.detail.value ?? '')}
                  onKeyPress={handleKeyPress}
                  style={{
                    flex: 1,
                    background: '#3a3b3c',
                    color: '#fff',
                    borderRadius: 20,
                    padding: '10px 16px',
                    marginRight: 12,
                  }}
                  className="message-input"
                />
                <IonButton
                  onClick={sendMessage}
                  color="primary"
                  className="send-button"
                  disabled={!message.trim()}
                  style={{ borderRadius: '50%', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IonIcon icon={send} />
                </IonButton>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ChatTab;