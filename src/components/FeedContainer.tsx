import { useState, useEffect } from 'react';
import { 
  IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonInput, IonLabel, IonModal, IonFooter, IonCard, 
  IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, 
  IonAlert, IonText, IonAvatar, IonCol, IonGrid, IonRow, IonIcon, 
  IonPopover, IonSpinner 
} from '@ionic/react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { pencil, trash } from 'ionicons/icons';

interface Post {
  post_id: string;
  user_id: number;
  username: string;
  avatar_url: string;
  post_content: string;
  post_created_at: string;
  post_updated_at: string;
}

interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};
const REACTION_LABELS = {
  like: 'Like',
  love: 'Love',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry'
};

const FeedContainer = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [popoverState, setPopoverState] = useState<{ open: boolean; event: Event | null; postId: string | null }>({ open: false, event: null, postId: null });
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<{postId: string | null, show: boolean}>({postId: null, show: false});
  const [isReacting, setIsReacting] = useState(false);
  const [tablesInitialized, setTablesInitialized] = useState(false);
  const [lastReactionClick, setLastReactionClick] = useState<number>(0);

  // Initialize database tables
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Check if reactions table exists
        const { error } = await supabase
          .from('reactions')
          .select('*')
          .limit(1);

        if (error) {
          // Create reactions table if it doesn't exist
          const { error: createError } = await supabase.rpc(`
            CREATE TABLE IF NOT EXISTS reactions (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              post_id UUID REFERENCES posts(post_id) ON DELETE CASCADE,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(post_id, user_id)
            )
          `);

          if (createError) throw createError;
        }

        setTablesInitialized(true);
      } catch (error) {
        console.error('Database initialization error:', error);
        setAlertMessage('Failed to initialize database tables');
        setIsAlertOpen(true);
      }
    };

    initializeDatabase();
  }, []);

  // Fetch user and posts data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email?.endsWith('@nbsc.edu.ph')) {
          const user = authData.user;
          const { data: userData, error } = await supabase
            .from('users')
            .select('user_id, username, user_avatar_url')
            .eq('user_email', user.email)
            .single();
          
          if (!error && userData) {
            setUser({ ...user, id: userData.user_id });
            setUsername(userData.username);
          }
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('post_created_at', { ascending: false });
        
        if (!postsError) {
          setPosts(postsData as Post[]);
        }

        const { data: reactionsData, error: reactionsError } = await supabase
          .from('reactions')
          .select('*');
        
        if (!reactionsError) {
          const reactionsMap: Record<string, Reaction[]> = {};
          const userReactionsMap: Record<string, string> = {};
          
          reactionsData.forEach(reaction => {
            const postId = reaction.post_id;
            const userId = reaction.user_id;
            
            if (!reactionsMap[postId]) {
              reactionsMap[postId] = [];
            }
            reactionsMap[postId].push(reaction);
            
            if (user && userId === user.id) {
              userReactionsMap[postId] = reaction.reaction_type;
            }
          });
          
          setReactions(reactionsMap);
          setUserReactions(userReactionsMap);
        }
      } catch (error) {
        console.error('Data fetching error:', error);
        setAlertMessage('Failed to load data');
        setIsAlertOpen(true);
      }
    };

    if (tablesInitialized) {
      fetchData();
    }
  }, [tablesInitialized, user?.id]);

  const createPost = async () => {
    if (!postContent || !user || !username) return;
  
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_avatar_url')
        .eq('user_id', user.id)
        .single();
  
      if (userError) {
        console.error('Error fetching user avatar:', userError);
        return;
      }
  
      const avatarUrl = userData?.user_avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg';
  
      const { data, error } = await supabase
        .from('posts')
        .insert([
          { post_content: postContent, user_id: user.id, username, avatar_url: avatarUrl }
        ])
        .select('*');
  
      if (!error && data) {
        setPosts([data[0] as Post, ...posts]);
        setPostContent('');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setAlertMessage('Failed to create post');
      setIsAlertOpen(true);
    }
  };

  const deletePost = async (post_id: string) => {
    try {
      const { error } = await supabase.from('posts').delete().match({ post_id });
      if (error) throw error;
      setPosts(posts.filter(post => post.post_id !== post_id));
    } catch (error) {
      console.error('Error deleting post:', error);
      setAlertMessage('Failed to delete post');
      setIsAlertOpen(true);
    }
  };

  const startEditingPost = (post: Post) => {
    setEditingPost(post);
    setPostContent(post.post_content);
    setIsModalOpen(true);
  };

  const savePost = async () => {
    if (!postContent || !editingPost) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ post_content: postContent })
        .match({ post_id: editingPost.post_id })
        .select('*');
      
      if (error) throw error;
      
      const updatedPost = data[0] as Post;
      setPosts(posts.map(post => (post.post_id === updatedPost.post_id ? updatedPost : post)));
      setPostContent('');
      setEditingPost(null);
      setIsModalOpen(false);
      setAlertMessage('Post updated successfully!');
      setIsAlertOpen(true);
    } catch (error) {
      console.error('Error saving post:', error);
      setAlertMessage('Failed to update post');
      setIsAlertOpen(true);
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    const now = Date.now();
    if (!user || isReacting || !tablesInitialized || now - lastReactionClick < 500) return;
    
    setLastReactionClick(now);
    setIsReacting(true);
    
    try {
      const existingReaction = reactions[postId]?.find(r => r.user_id === user.id);
      const isSameReaction = existingReaction?.reaction_type === reactionType;
      
      // Optimistic UI update
      const updatedReactions = { ...reactions };
      const updatedUserReactions = { ...userReactions };
      
      if (isSameReaction) {
        // Remove reaction
        updatedReactions[postId] = updatedReactions[postId]?.filter(r => r.user_id !== user.id) || [];
        delete updatedUserReactions[postId];
      } else {
        // Add/change reaction
        const newReaction = {
          id: `temp-${Date.now()}`,
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
          created_at: new Date().toISOString()
        };
        
        updatedReactions[postId] = [
          ...(updatedReactions[postId]?.filter(r => r.user_id !== user.id) || []),
          newReaction
        ];
        updatedUserReactions[postId] = reactionType;
      }
      
      setReactions(updatedReactions);
      setUserReactions(updatedUserReactions);
      
      // Database operation
      if (isSameReaction) {
        // Delete existing reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Upsert reaction
        const { data, error } = await supabase
          .from('reactions')
          .upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType
          }, {
            onConflict: 'post_id,user_id'
          })
          .select();
        
        if (error) throw error;
        
        // Update with real database ID
        if (data && data[0]) {
          setReactions(prev => ({
            ...prev,
            [postId]: prev[postId]?.map(r => 
              r.user_id === user.id ? { ...r, id: data[0].id } : r
            ) || []
          }));
        }
      }
    } catch (error: any) {
      console.error('Error handling reaction:', error);
      
      // Handle duplicate reaction error specifically
      if (error.code === '23505') {
        setAlertMessage("You've already reacted to this post");
        setIsAlertOpen(true);
      } else {
        setAlertMessage('Failed to update reaction');
        setIsAlertOpen(true);
      }
      
      // Revert optimistic update
      setReactions(prev => ({ ...prev }));
      setUserReactions(prev => ({ ...prev }));
    } finally {
      setIsReacting(false);
      setShowReactionPicker({ postId: null, show: false });
    }
  };

  const getReactionSummary = (postId: string) => {
    if (!reactions[postId] || reactions[postId].length === 0) return null;
    
    const counts: Record<string, number> = {};
    reactions[postId].forEach(reaction => {
      counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
    });
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const topReaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    
    return {
      total,
      topReaction: topReaction ? REACTION_EMOJIS[topReaction[0] as keyof typeof REACTION_EMOJIS] : null,
      topCount: topReaction ? topReaction[1] : 0
    };
  };

  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Posts</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {!tablesInitialized ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <IonSpinner name="dots" />
            </div>
          ) : user ? (
            <>
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Create Post</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonInput
                    value={postContent}
                    onIonChange={e => setPostContent(e.detail.value!)}
                    placeholder="Write a post..."
                  />
                </IonCardContent>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem' }}>
                  <IonButton onClick={createPost}>Post</IonButton>
                </div>
              </IonCard>

              {posts.map(post => {
                const reactionSummary = getReactionSummary(post.post_id);
                const userReaction = userReactions[post.post_id];
                
                return (
                  <IonCard key={post.post_id} style={{ marginTop: '2rem' }}>
                    <IonCardHeader>
                      <IonRow>
                        <IonCol size="1.85">
                          <IonAvatar>
                            <img alt={post.username} src={post.avatar_url} />
                          </IonAvatar>
                        </IonCol>
                        <IonCol>
                          <IonCardTitle style={{ marginTop: '10px' }}>{post.username}</IonCardTitle>
                          <IonCardSubtitle>{new Date(post.post_created_at).toLocaleString()}</IonCardSubtitle>
                        </IonCol>
                        <IonCol size="auto">
                          <IonButton
                            fill="clear"
                            onClick={(e) => setPopoverState({ open: true, event: e.nativeEvent, postId: post.post_id })}
                          >
                            <IonIcon icon={pencil} />
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    </IonCardHeader>
                  
                    <IonCardContent>
                      <IonText style={{ color: 'black' }}>
                        <h1>{post.post_content}</h1>
                      </IonText>
                      
                      {reactionSummary && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid #f0f0f0'
                        }}>
                          <span style={{ fontSize: '16px', marginRight: '4px' }}>
                            {reactionSummary.topReaction}
                          </span>
                          <span style={{ fontSize: '14px', color: '#65676B' }}>
                            {reactionSummary.total}
                          </span>
                        </div>
                      )}
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        position: 'relative'
                      }}>
                        <IonButton 
                          fill="clear"
                          size="small"
                          color={userReaction ? 'primary' : 'medium'}
                          disabled={isReacting}
                          onMouseEnter={() => setShowReactionPicker({postId: post.post_id, show: true})}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(post.post_id, userReaction || 'like');
                          }}
                        >
                          {isReacting ? (
                            <IonSpinner name="dots" />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="reaction-emoji" style={{ 
                                fontSize: '18px', 
                                marginRight: '4px',
                                transition: 'transform 0.2s ease'
                              }}>
                                {userReaction ? REACTION_EMOJIS[userReaction as keyof typeof REACTION_EMOJIS] : '👍'}
                              </span>
                              <span>
                                {userReaction ? REACTION_LABELS[userReaction as keyof typeof REACTION_LABELS] : 'Like'}
                              </span>
                            </div>
                          )}
                        </IonButton>
                        
                        {showReactionPicker.postId === post.post_id && showReactionPicker.show && (
                          <div 
                            style={{
                              position: 'absolute',
                              bottom: '40px',
                              left: '0',
                              backgroundColor: 'white',
                              borderRadius: '50px',
                              padding: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              display: 'flex',
                              zIndex: 100,
                              animation: 'fadeIn 0.2s ease-out'
                            }}
                            onMouseLeave={() => setShowReactionPicker(prev => 
                              prev.postId === post.post_id ? { ...prev, show: false } : prev
                            )}
                          >
                            {REACTION_TYPES.map(type => (
                              <IonButton 
                                key={type}
                                fill="clear"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(post.post_id, type);
                                }}
                                style={{ 
                                  fontSize: '24px',
                                  padding: '4px',
                                  minWidth: 'auto',
                                  minHeight: 'auto'
                                }}
                              >
                                {REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS]}
                              </IonButton>
                            ))}
                          </div>
                        )}
                      </div>
                    </IonCardContent>
                    
                    <IonPopover
                      isOpen={popoverState.open && popoverState.postId === post.post_id}
                      event={popoverState.event}
                      onDidDismiss={() => setPopoverState({ open: false, event: null, postId: null })}
                    >
                      <IonButton 
                        fill="clear" 
                        onClick={() => { 
                          startEditingPost(post); 
                          setPopoverState({ open: false, event: null, postId: null }); 
                        }}
                      >
                        <IonIcon slot="start" icon={pencil} />
                        Edit
                      </IonButton>
                      <IonButton 
                        fill="clear" 
                        color="danger" 
                        onClick={() => { 
                          deletePost(post.post_id); 
                          setPopoverState({ open: false, event: null, postId: null }); 
                        }}
                      >
                        <IonIcon slot="start" icon={trash} />
                        Delete
                      </IonButton>
                    </IonPopover>
                  </IonCard>
                );
              })}
            </>
          ) : (
            <IonLabel>Loading...</IonLabel>
          )}
        </IonContent>

        <IonModal isOpen={isModalOpen} onDidDismiss={() => setIsModalOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit Post</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonInput 
              value={postContent} 
              onIonChange={e => setPostContent(e.detail.value!)} 
              placeholder="Edit your post..." 
            />
          </IonContent>
          <IonFooter>
            <IonButton onClick={savePost}>Save</IonButton>
            <IonButton onClick={() => setIsModalOpen(false)}>Cancel</IonButton>
          </IonFooter>
        </IonModal>

        <IonAlert
          isOpen={isAlertOpen}
          onDidDismiss={() => setIsAlertOpen(false)}
          header="Notification"
          message={alertMessage}
          buttons={['OK']}
        />
      </IonPage>
    </IonApp>
  );
};

export default FeedContainer;