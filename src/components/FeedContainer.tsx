import { useState, useEffect } from 'react';
import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonLabel, IonModal, IonFooter, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonAlert, IonText, IonAvatar, IonCol, IonGrid, IonRow, IonIcon, IonPopover } from '@ionic/react';
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

const FeedContainer = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [popoverState, setPopoverState] = useState<{ open: boolean; event: Event | null; postId: string | null }>({ open: false, event: null, postId: null });
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<{postId: string | null, show: boolean}>({postId: null, show: false});

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.email?.endsWith('@nbsc.edu.ph')) {
        setUser(authData.user);
        const { data: userData, error } = await supabase
          .from('users')
          .select('user_id, username, user_avatar_url')
          .eq('user_email', authData.user.email)
          .single();
        if (!error && userData) {
          setUser({ ...authData.user, id: userData.user_id });
          setUsername(userData.username);
        }
      }
    };
    
    const fetchPosts = async () => {
      const { data, error } = await supabase.from('posts').select('*').order('post_created_at', { ascending: false });
      if (!error) setPosts(data as Post[]);
    };
    
    const fetchReactions = async () => {
      const { data, error } = await supabase.from('reactions').select('*');
      if (!error) {
        const reactionsMap: Record<string, Reaction[]> = {};
        const userReactionsMap: Record<string, string> = {};
        
        data.forEach(reaction => {
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
    };

    fetchUser();
    fetchPosts();
    fetchReactions();
  }, [user?.id]);

  const createPost = async () => {
    if (!postContent || !user || !username) return;
  
    // Fetch avatar URL
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
  
    // Insert post with avatar URL
    const { data, error } = await supabase
      .from('posts')
      .insert([
        { post_content: postContent, user_id: user.id, username, avatar_url: avatarUrl }
      ])
      .select('*');
  
    if (!error && data) {
      setPosts([data[0] as Post, ...posts]);
    }
  
    setPostContent('');
  };

  const deletePost = async (post_id: string) => {
    await supabase.from('posts').delete().match({ post_id });
    setPosts(posts.filter(post => post.post_id !== post_id));
  };

  const startEditingPost = (post: Post) => {
    setEditingPost(post);
    setPostContent(post.post_content);
    setIsModalOpen(true);
  };

  const savePost = async () => {
    if (!postContent || !editingPost) return;
    const { data, error } = await supabase
      .from('posts')
      .update({ post_content: postContent })
      .match({ post_id: editingPost.post_id })
      .select('*');
    if (!error && data) {
      const updatedPost = data[0] as Post;
      setPosts(posts.map(post => (post.post_id === updatedPost.post_id ? updatedPost : post)));
      setPostContent('');
      setEditingPost(null);
      setIsModalOpen(false);
      setIsAlertOpen(true);
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!user) return;
    
    const existingReaction = reactions[postId]?.find(r => r.user_id === user.id);
    const isSameReaction = existingReaction?.reaction_type === reactionType;
    
    // Optimistic update
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
      await supabase
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('reactions')
        .upsert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType
        }, {
          onConflict: 'post_id,user_id'
        });
    }
    
    setShowReactionPicker({ postId: null, show: false });
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
    <>
      <IonContent>
        {user ? (
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
                          onClick={(e) =>
                            setPopoverState({
                              open: true,
                              event: e.nativeEvent,
                              postId: post.post_id,
                            })
                          }
                        >
                          <IonIcon color="secondary" icon={pencil} />
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
                        onMouseEnter={() => setShowReactionPicker({postId: post.post_id, show: true})}
                        onClick={() => handleReaction(post.post_id, userReaction || 'like')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '18px', marginRight: '4px' }}>
                            {userReaction ? REACTION_EMOJIS[userReaction as keyof typeof REACTION_EMOJIS] : '👍'}
                          </span>
                          <span>
                            {userReaction ? userReaction.charAt(0).toUpperCase() + userReaction.slice(1) : 'Like'}
                          </span>
                        </div>
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
                            zIndex: 100
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
                              onClick={() => handleReaction(post.post_id, type)}
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
                    onDidDismiss={() =>
                      setPopoverState({ open: false, event: null, postId: null })
                    }
                  >
                    <IonButton
                      fill="clear"
                      onClick={() => {
                        startEditingPost(post);
                        setPopoverState({ open: false, event: null, postId: null });
                      }}
                    >
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
        header="Success"
        message="Post updated successfully!"
        buttons={['OK']}
      />
    </>
  );
};

export default FeedContainer;