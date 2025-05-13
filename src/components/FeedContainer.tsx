import { useState, useEffect } from 'react';
import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonLabel, IonModal, IonFooter, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonAlert, IonText, IonAvatar, IonCol, IonGrid, IonRow, IonIcon, IonPopover } from '@ionic/react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { pencil, trash, chatbubbleOutline, send, camera } from 'ionicons/icons';

interface Post {
  post_id: string;
  user_id: number;
  username: string;
  avatar_url: string;
  post_content: string;
  post_image_url?: string;
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

interface Comment {
  comment_id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  comment_content: string;
  created_at: string;
}

interface UserReaction {
  username: string;
  reaction_type: string;
}

interface ReactionData {
  post_id: string;
  reaction_type: string;
  user_id: string;
  users: {
    username: string;
  };
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
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postImage, setPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hoveredReactions, setHoveredReactions] = useState<{postId: string | null, show: boolean}>({postId: null, show: false});
  const [reactionUsers, setReactionUsers] = useState<Record<string, UserReaction[]>>({});
  const [userIntId, setUserIntId] = useState<number | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
          setUserIntId(userData.user_id);
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

    const fetchComments = async () => {
      const { data, error } = await supabase.from('comments').select('*').order('created_at', { ascending: true });
      if (!error) {
        const commentsMap: Record<string, Comment[]> = {};
        
        data.forEach(comment => {
          const postId = comment.post_id;
          if (!commentsMap[postId]) {
            commentsMap[postId] = [];
          }
          commentsMap[postId].push(comment);
        });
        
        setComments(commentsMap);
      }
    };

    const fetchReactionUsers = async () => {
      const { data, error } = await supabase
        .from('reactions')
        .select(`
          post_id,
          reaction_type,
          user_id,
          users (
            username
          )
        `);

      if (!error && data) {
        const usersMap: Record<string, UserReaction[]> = {};
        data.forEach(reaction => {
          const postId = reaction.post_id;
          if (!usersMap[postId]) usersMap[postId] = [];
          let username: string | null = null;
          const usersField = reaction.users as any;
          if (Array.isArray(usersField) && usersField.length > 0 && typeof usersField[0].username === 'string') {
            username = usersField[0].username;
          } else if (usersField && typeof usersField.username === 'string') {
            username = usersField.username;
          }
          if (username) {
            usersMap[postId].push({
              username,
              reaction_type: reaction.reaction_type
            });
          }
        });
        setReactionUsers(usersMap);
      }
    };

    fetchUser();
    fetchPosts();
    fetchReactions();
    fetchComments();
    fetchReactionUsers();
  }, [user?.id]);

  const createPost = async () => {
    if (!postContent || !user || !username) return;

    const { data: userRow, error: userRowError } = await supabase
      .from('users')
      .select('user_id, username, user_avatar_url')
      .eq('user_email', user.email)
      .single();

    if (userRowError || !userRow) {
      return;
    }

    let postImageUrl = null;
    if (postImage) {
      const fileExt = postImage.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, postImage);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        postImageUrl = publicUrl;
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userRow.user_id,
        username: userRow.username,
        post_content: postContent,
        post_image_url: postImageUrl,
        post_created_at: now,
        post_updated_at: now,
        avatar_url: userRow.user_avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'
      })
      .select();

    if (!error && data) {
      setPosts([data[0] as Post, ...posts]);
      setPostContent('');
      setPostImage(null);
      setImagePreview(null);
    } else {
      console.error('Error creating post:', error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    
    const updatedReactions = { ...reactions };
    const updatedUserReactions = { ...userReactions };
    
    if (isSameReaction) {
      updatedReactions[postId] = updatedReactions[postId]?.filter(r => r.user_id !== user.id) || [];
      delete updatedUserReactions[postId];
    } else {
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

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const addComment = async (postId: string) => {
    if (!user || !username || !commentContent[postId]?.trim()) return;

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
      .from('comments')
      .insert([{
        post_id: postId,
        user_id: user.id,
        username,
        avatar_url: avatarUrl,
        comment_content: commentContent[postId]
      }])
      .select('*');

    if (!error && data) {
      const newComment = data[0] as Comment;
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentContent(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    await supabase.from('comments').delete().match({ comment_id: commentId });
    setComments(prev => ({
      ...prev,
      [postId]: prev[postId].filter(comment => comment.comment_id !== commentId)
    }));
  };

  const handleCommentChange = (postId: string, content: string) => {
    setCommentContent(prev => ({
      ...prev,
      [postId]: content
    }));
  };

  return (
    <>
      <IonContent style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #fbc2eb 100%)' }}>
        {user ? (
          <>
            <IonCard style={{ 
              margin: '20px', 
              borderRadius: '20px', 
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
              background: 'linear-gradient(120deg, #f8fafc 60%, #e0e7ff 100%)',
              border: '2px solid #a5b4fc',
            }}>
              <IonCardHeader style={{ padding: '20px', background: 'linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 100%)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
                <IonRow className="ion-align-items-center">
                  <IonCol size="auto">
                    <IonAvatar style={{ 
                      width: '40px', 
                      height: '40px',
                      border: '2px solid #3880ff',
                      boxShadow: '0 2px 8px rgba(56, 128, 255, 0.3)'
                    }}>
                      <img src={user?.user_metadata?.avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'} alt={username || ''} />
                    </IonAvatar>
                  </IonCol>
                  <IonCol>
                    <IonInput
                      value={postContent}
                      onIonChange={e => setPostContent(e.detail.value!)}
                      placeholder="What's on your mind?"
                      style={{ 
                        '--padding-start': '0',
                        '--background': 'transparent',
                        '--placeholder-color': '#666',
                        '--color': '#333'
                      }}
                    />
                  </IonCol>
                </IonRow>
              </IonCardHeader>
              
              {imagePreview && (
                <div style={{ padding: '0 16px 16px' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }} 
                  />
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '16px',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                background: 'linear-gradient(to right, #f8f9fa, #ffffff)'
              }}>
                <IonButton fill="clear" size="small">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                    <IonIcon icon={camera} style={{ fontSize: '28px', color: '#7c3aed', transition: 'color 0.2s' }} />
                  </label>
                </IonButton>
                <IonButton 
                  onClick={createPost} 
                  disabled={!postContent.trim() && !postImage}
                  style={{
                    '--background': 'linear-gradient(90deg, #7c3aed 0%, #fbc2eb 100%)',
                    '--box-shadow': '0 4px 16px rgba(124, 58, 237, 0.2)',
                    color: '#fff',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    borderRadius: '12px',
                    transition: 'background 0.2s',
                  }}
                >
                  Share
                </IonButton>
              </div>
            </IonCard>

            {posts.map(post => {
              const reactionSummary = getReactionSummary(post.post_id);
              const userReaction = userReactions[post.post_id];
              const postComments = comments[post.post_id] || [];
              
              return (
                <IonCard key={post.post_id} style={{ 
                  margin: '20px', 
                  borderRadius: '20px', 
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                  background: 'linear-gradient(120deg, #f8fafc 60%, #e0e7ff 100%)',
                  border: '2px solid #a5b4fc',
                }}>
                  <IonCardHeader style={{ padding: '20px', background: 'linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 100%)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
                    <IonRow className="ion-align-items-center">
                      <IonCol size="auto">
                        <IonAvatar style={{ 
                          width: '40px', 
                          height: '40px',
                          border: '2px solid #3880ff',
                          boxShadow: '0 2px 8px rgba(56, 128, 255, 0.3)'
                        }}>
                          <img src={post.avatar_url} alt={post.username} />
                        </IonAvatar>
                      </IonCol>
                      <IonCol>
                        <IonText style={{ 
                          fontWeight: 'bold',
                          fontSize: '16px',
                          color: '#333'
                        }}>{post.username}</IonText>
                        <div style={{ 
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '2px'
                        }}>
                          {new Date(post.post_created_at).toLocaleDateString()}
                        </div>
                      </IonCol>
                      <IonCol size="auto">
                        {userIntId !== null && post.user_id === userIntId && (
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
                            <IonIcon icon={pencil} style={{ color: '#3880ff' }} />
                          </IonButton>
                        )}
                      </IonCol>
                    </IonRow>
                  </IonCardHeader>

                  {post.post_image_url && (
                    <div
                      style={{ width: '100%', maxHeight: '400px', overflow: 'hidden', cursor: 'pointer', background: '#f8f9fa' }}
                      onClick={() => {
                        setViewImageUrl(post.post_image_url!);
                        setIsImageModalOpen(true);
                      }}
                    >
                      <img
                        src={post.post_image_url}
                        alt="Post"
                        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px', background: '#f8f9fa' }}
                      />
                    </div>
                  )}

                  <IonCardContent style={{ padding: '16px' }}>
                    <div style={{ 
                      marginBottom: '12px',
                      fontSize: '15px',
                      lineHeight: '1.5',
                      color: '#333'
                    }}>
                      <IonText style={{ whiteSpace: 'pre-wrap' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '4px' }}>{post.username}</span>
                        {post.post_content}
                      </IonText>
                    </div>

                    {reactionSummary && (
                      <div style={{ 
                        padding: '8px 0',
                        marginBottom: '12px',
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}
                      onMouseEnter={() => setHoveredReactions({postId: post.post_id, show: true})}
                      onMouseLeave={() => setHoveredReactions({postId: null, show: false})}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '16px', 
                            marginRight: '4px',
                            background: 'linear-gradient(45deg, #3880ff, #5260ff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>
                            {reactionSummary.topReaction}
                          </span>
                          <IonText color="medium" style={{ fontSize: '14px' }}>
                            {reactionSummary.total} {reactionSummary.total === 1 ? 'reaction' : 'reactions'}
                          </IonText>
                        </div>

                        {hoveredReactions.postId === post.post_id && hoveredReactions.show && reactionUsers[post.post_id] && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '0',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            minWidth: '200px',
                            maxWidth: '300px'
                          }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#333'
                            }}>
                              Reactions
                            </div>
                            {reactionUsers[post.post_id].map((userReaction, index) => (
                              <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '4px',
                                fontSize: '14px'
                              }}>
                                <span style={{ marginRight: '8px' }}>
                                  {REACTION_EMOJIS[userReaction.reaction_type as keyof typeof REACTION_EMOJIS]}
                                </span>
                                <span style={{ color: '#666' }}>{userReaction.username}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <IonButton
                          fill="clear"
                          size="small"
                          color={userReaction ? 'primary' : 'medium'}
                          style={{ color: userReaction ? '#7c3aed' : '#a1a1aa', fontWeight: 'bold', transition: 'color 0.2s' }}
                          onMouseEnter={() => setShowReactionPicker({postId: post.post_id, show: true})}
                          onClick={() => handleReaction(post.post_id, userReaction || 'like')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '20px', marginRight: '6px' }}>
                              {userReaction ? REACTION_EMOJIS[userReaction as keyof typeof REACTION_EMOJIS] : '👍'}
                            </span>
                            <span>
                              {userReaction ? userReaction.charAt(0).toUpperCase() + userReaction.slice(1) : 'React'}
                            </span>
                          </div>
                        </IonButton>
                        
                        <IonButton
                          fill="clear"
                          size="small"
                          color="medium"
                          style={{ color: '#6366f1', fontWeight: 'bold', transition: 'color 0.2s' }}
                          onClick={() => toggleComments(post.post_id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <IonIcon icon={chatbubbleOutline} style={{ marginRight: '6px' }} />
                            <span>Comment</span>
                            {postComments.length > 0 && (
                              <span style={{ marginLeft: '6px' }}>({postComments.length})</span>
                            )}
                          </div>
                        </IonButton>
                      </div>
                    </div>

                    {showReactionPicker.postId === post.post_id && showReactionPicker.show && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '40px',
                          left: '0',
                          backgroundColor: 'white',
                          borderRadius: '50px',
                          padding: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          display: 'flex',
                          zIndex: 100,
                          background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
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
                              minHeight: 'auto',
                              transition: 'transform 0.2s',
                              '&:hover': {
                                transform: 'scale(1.2)'
                              }
                            }}
                          >
                            {REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS]}
                          </IonButton>
                        ))}
                      </div>
                    )}

                    {expandedComments[post.post_id] && (
                      <div style={{ 
                        marginTop: '16px',
                        padding: '16px',
                        background: 'linear-gradient(to right, #f8f9fa, #ffffff)',
                        borderRadius: '12px'
                      }}>
                        {postComments.map(comment => (
                          <div key={comment.comment_id} style={{ 
                            display: 'flex', 
                            marginBottom: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                          }}>
                            <IonAvatar style={{ 
                              width: '32px', 
                              height: '32px',
                              marginRight: '12px',
                              border: '1px solid #3880ff'
                            }}>
                              <img src={comment.avatar_url} alt={comment.username} />
                            </IonAvatar>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: 'bold', 
                                fontSize: '14px',
                                color: '#333'
                              }}>{comment.username}</div>
                              <div style={{ 
                                fontSize: '14px',
                                color: '#666',
                                marginTop: '4px'
                              }}>{comment.comment_content}</div>
                              <div style={{ 
                                fontSize: '12px',
                                color: '#999',
                                marginTop: '4px'
                              }}>
                                {new Date(comment.created_at).toLocaleString()}
                              </div>
                            </div>
                            {user?.id === comment.user_id && (
                              <IonButton 
                                fill="clear" 
                                size="small" 
                                color="danger"
                                onClick={() => deleteComment(comment.comment_id, post.post_id)}
                              >
                                <IonIcon icon={trash} />
                              </IonButton>
                            )}
                          </div>
                        ))}

                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginTop: '12px',
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                          <IonAvatar style={{ 
                            width: '32px', 
                            height: '32px',
                            marginRight: '12px',
                            border: '1px solid #3880ff'
                          }}>
                            <img src={user?.user_metadata?.avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'} alt={username || ''} />
                          </IonAvatar>
                          <IonInput
                            value={commentContent[post.post_id] || ''}
                            onIonChange={e => handleCommentChange(post.post_id, e.detail.value!)}
                            placeholder="Write a comment..."
                            style={{ 
                              '--padding-start': '0',
                              '--background': 'transparent',
                              '--placeholder-color': '#999',
                              '--color': '#333'
                            }}
                          />
                          <IonButton 
                            fill="clear" 
                            onClick={() => addComment(post.post_id)}
                            disabled={!commentContent[post.post_id]?.trim()}
                            style={{
                              '--color': '#3880ff'
                            }}
                          >
                            <IonIcon icon={send} />
                          </IonButton>
                        </div>
                      </div>
                    )}
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

      <IonModal isOpen={isImageModalOpen} onDidDismiss={() => setIsImageModalOpen(false)}>
        <IonContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          {viewImageUrl && (
            <img
              src={viewImageUrl}
              alt="Full View"
              style={{ maxWidth: '100vw', maxHeight: '100vh', margin: 'auto', display: 'block' }}
              onClick={() => setIsImageModalOpen(false)}
            />
          )}
        </IonContent>
      </IonModal>
    </>
  );
};

export default FeedContainer;