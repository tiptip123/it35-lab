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
  user: string;       // Username of sender
  message: string;    // Message content
  isCurrentUser?: boolean; // For styling
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

  // Keep your existing contact fetching logic
  useEffect(() => {
    const fetchUsersAndSetupPresence = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) return;

        setCurrentUser(user);

        const userIdAsInt = parseInt(user.id, 10);
        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, user_avatar_url, last_online')
          .neq('user_id', userIdAsInt)
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

        setUsers(formattedUsers);
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

  const openChat = (user: ChatUser) => {
    setActiveChatUser(user);
    setIsChatOpen(true);
    // Clear previous messages when opening new chat
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser || !activeChatUser) return;
    
    try {
      // First get the current user's integer ID from users table
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('id', currentUser.id)  // Match UUID from auth with users table
        .single();
  
      if (userError || !currentUserData) throw userError || new Error('Current user not found');
  
      const currentUserId = currentUserData.user_id;
      const otherUserId = parseInt(activeChatUser.id);
  
      // Verify both users exist
      const { error: verifyError } = await supabase
        .from('users')
        .select('user_id')
        .in('user_id', [currentUserId, otherUserId]);
  
      if (verifyError) throw verifyError;
  
      // Create new message object with proper username
      const newMessage = { 
        user: currentUser.user_metadata?.username || 
              currentUser.email?.split('@')[0] || 
              'You',
        message,
        isCurrentUser: true
      };
      
      // Save to database
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: message
        });
  
      if (error) throw error;
  
      // Update UI
      setMessages([...messages, newMessage]);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      // Optionally show error to user
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
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Messages</IonTitle>
        </IonToolbar>
        <IonToolbar color="primary">
          <IonSearchbar
            placeholder="Search contacts..."
            value={searchText}
            onIonChange={e => setSearchText(e.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonList lines="full" className="ion-no-padding">
          {filteredUsers.length === 0 ? (
            <IonItem>
              <IonLabel>No users available</IonLabel>
            </IonItem>
          ) : (
            filteredUsers.map(user => (
              <IonItem key={user.id} button detail onClick={() => openChat(user)}>
                <IonAvatar slot="start" style={{ position: 'relative' }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} />
                  ) : (
                    <IonIcon icon={personCircleOutline} style={{ fontSize: '40px' }} />
                  )}
                  {user.online && (
                    <div className="online-badge"></div>
                  )}
                </IonAvatar>
                <IonLabel>
                  <h2>{user.username}</h2>
                  <p className={user.online ? 'online-status' : 'offline-status'}>
                    {user.online ? 'Online' : 'Offline'}
                  </p>
                </IonLabel>
                {!user.online && user.last_online && (
                  <IonBadge slot="end" color="medium" className="last-seen">
                    Last seen:{' '}
                    {new Date(user.last_online).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </IonBadge>
                )}
              </IonItem>
            ))
          )}
        </IonList>

        {/* Enhanced Chat Popup */}
        {isChatOpen && activeChatUser && (
          <div className="chat-popup">
            <div className="chat-header">
              <div className="header-content">
                <IonAvatar className="chat-avatar">
                  {activeChatUser.avatar_url ? (
                    <img src={activeChatUser.avatar_url} alt={activeChatUser.username} />
                  ) : (
                    <IonIcon icon={personCircleOutline} />
                  )}
                </IonAvatar>
                <div className="chat-info">
                  <h3>{activeChatUser.username}</h3>
                  <p className={activeChatUser.online ? 'online-status' : 'offline-status'}>
                    {activeChatUser.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <IonButton 
                onClick={() => setIsChatOpen(false)} 
                fill="clear"
                className="close-button"
              >
                <IonIcon icon={close} />
              </IonButton>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <IonText color="medium">No messages yet</IonText>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message-bubble ${msg.isCurrentUser ? 'sent' : 'received'}`}
                  >
                    <div className="message-sender">{msg.user}</div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input">
              <IonInput
                value={message}
                placeholder="Type a message"
                onIonChange={e => setMessage(e.detail.value ?? '')}
                onKeyPress={handleKeyPress}
                className="message-input"
              />
              <IonButton 
                onClick={sendMessage} 
                color="primary"
                className="send-button"
                disabled={!message.trim()}
              >
                <IonIcon icon={send} />
              </IonButton>
            </div>
          </div>
        )}
      </IonContent>

      <style>
        {`
          /* Chat Popup Styles */
          .chat-popup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            z-index: 1000;
          }

          .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #0084ff;
            color: white;
            border-radius: 12px 12px 0 0;
          }

          .header-content {
            display: flex;
            align-items: center;
            flex-grow: 1;
          }

          .chat-avatar {
            width: 36px;
            height: 36px;
            margin-right: 12px;
          }

          .chat-info h3 {
            margin: 0;
            font-size: 1rem;
            font-weight: 500;
          }

          .chat-info p {
            margin: 0;
            font-size: 0.8rem;
          }

          .close-button {
            margin: 0;
            color: white;
          }

          .chat-messages {
            flex-grow: 1;
            padding: 12px;
            overflow-y: auto;
            background: #f0f2f5;
            max-height: 350px;
          }

          .message-bubble {
            max-width: 80%;
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 18px;
          }

          .message-bubble.sent {
            background: #0084ff;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 4px;
          }

          .message-bubble.received {
            background: #e4e6eb;
            color: black;
            margin-right: auto;
            border-bottom-left-radius: 4px;
          }

          .message-sender {
            font-weight: bold;
            font-size: 0.8rem;
            margin-bottom: 4px;
          }

          .message-content {
            font-size: 0.9rem;
          }

          .chat-input {
            display: flex;
            padding: 12px;
            background: white;
            border-top: 1px solid #e4e6eb;
            align-items: center;
          }

          .message-input {
            flex-grow: 1;
            background: #f0f2f5;
            border-radius: 20px;
            padding: 8px 16px !important;
            margin-right: 8px;
          }

          .send-button {
            margin: 0;
            --padding-start: 8px;
            --padding-end: 8px;
          }

          .no-messages {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
          }

          /* Status indicators */
          .online-status {
            color: #31A24C;
          }

          .offline-status {
            color: #666;
          }

          .online-badge {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            background-color: #31A24C;
            border-radius: 50%;
            border: 2px solid var(--ion-background-color);
          }

          .last-seen {
            font-size: 0.7rem;
          }
        `}
      </style>
    </IonPage>
  );
};

export default ChatTab;