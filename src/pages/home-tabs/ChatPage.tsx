import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonList,
  } from '@ionic/react';
  import { useParams } from 'react-router';
  import { useEffect, useState } from 'react';
  import { supabase } from '../../utils/supabaseClient';
  
  interface RouteParams {
    id: string;
  }
  
  interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    created_at: string;
    sender_name?: string; // Optional sender name field
  }
  
  // Utility function to convert UUID to integer user_id
  async function getUserIdFromUuid(uuid: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('id', uuid)
      .single();
  
    if (error) {
      console.error('Error fetching user ID:', error);
      return null;
    }
    return data?.user_id || null;
  }
  
  // Utility function to get username from user_id
  async function getUsernameFromId(userId: number): Promise<string> {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('user_id', userId)
      .single();
  
    if (error) {
      console.error('Error fetching username:', error);
      return 'Unknown';
    }
    return data?.username || 'Unknown';
  }
  
  const ChatPage: React.FC = () => {
    const { id: otherUserUuid } = useParams<RouteParams>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserUuid, setCurrentUserUuid] = useState<string>('');
    const [otherUserId, setOtherUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
  
    useEffect(() => {
      const loadUserAndMessages = async () => {
        try {
          setLoading(true);
  
          // Get current user's UUID
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            throw authError || new Error('No authenticated user');
          }
          setCurrentUserUuid(user.id);
  
          // Convert UUIDs to integer IDs
          const currentId = await getUserIdFromUuid(user.id);
          const otherId = await getUserIdFromUuid(otherUserUuid);
  
          if (!currentId || !otherId) {
            throw new Error('Could not resolve user IDs');
          }
  
          setCurrentUserId(currentId);
          setOtherUserId(otherId);
  
          // Load messages
          const { data, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .or(
              `and(sender_id.eq.${currentId},receiver_id.eq.${otherId}),` +
              `and(sender_id.eq.${otherId},receiver_id.eq.${currentId})`
            )
            .order('created_at', { ascending: true });
  
          if (fetchError) throw fetchError;
  
          // Fetch sender names
          const messagesWithSenderNames = await Promise.all(data.map(async (msg: Message) => {
            const senderName = await getUsernameFromId(msg.sender_id);
            return {
              ...msg,
              sender_name: senderName, // Add sender name to message
            };
          }));
  
          setMessages(messagesWithSenderNames || []);
        } catch (err) {
          console.error('Chat error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load chat');
        } finally {
          setLoading(false);
        }
      };
  
      loadUserAndMessages();
  
      // Set up real-time updates
      const channel = supabase
        .channel('message-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId})`
        }, () => loadUserAndMessages())
        .subscribe();
  
      return () => {
        supabase.removeChannel(channel);
      };
    }, [otherUserUuid, currentUserId, otherUserId]);
  
    const sendMessage = async () => {
      if (!newMessage.trim() || !currentUserId || !otherUserId) return;
  
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: otherUserId,
            content: newMessage,
          });
  
        if (error) throw error;
  
        setNewMessage('');
      } catch (err) {
        console.error('Send error:', err);
        setError('Failed to send message');
      }
    };
  
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/chat" />
            </IonButtons>
            <IonTitle>Chat</IonTitle>
          </IonToolbar>
        </IonHeader>
  
        <IonContent fullscreen>
          {loading ? (
            <div className="ion-text-center ion-padding">
              <IonLabel>Loading messages...</IonLabel>
            </div>
          ) : error ? (
            <div className="ion-text-center ion-padding">
              <IonLabel color="danger">{error}</IonLabel>
            </div>
          ) : (
            <>
              <IonList>
                {messages.map((msg) => (
                  <IonItem
                    key={msg.id}
                    lines="none"
                    className={msg.sender_id === currentUserId ? 'my-message' : 'their-message'}
                  >
                    <IonLabel className="ion-text-wrap">
                      <h3>{msg.sender_name}</h3>
                      <p style={{ fontSize: '0.9rem' }}>{msg.content}</p>
                      <small>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
  
              <div style={{ display: 'flex', padding: '10px' }}>
                <IonInput
                  value={newMessage}
                  placeholder="Type a message..."
                  onIonChange={(e) => setNewMessage(e.detail.value!)}
                  style={{ flex: 1, marginRight: '10px' }}
                />
                <IonButton onClick={sendMessage}>Send</IonButton>
              </div>
            </>
          )}
        </IonContent>
      </IonPage>
    );
  };
  
  export default ChatPage;
  