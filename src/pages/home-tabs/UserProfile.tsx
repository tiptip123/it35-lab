import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonAvatar, IonText, IonGrid, IonRow, IonCol, IonButton, IonCard, IonCardContent, IonCardHeader, IonLabel, IonModal, IonIcon, IonInput } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { chevronBack, chevronForward, pencil, trash, chatbubbleOutline, send } from 'ionicons/icons';
import ChatPopup from '../../components/ChatPopup';

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const history = useHistory();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<{postId: string | null, show: boolean}>({postId: null, show: false});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [hoveredReactions, setHoveredReactions] = useState<{postId: string | null, show: boolean}>({postId: null, show: false});
  const [reactionUsers, setReactionUsers] = useState<Record<string, any[]>>({});
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [albumPhotoIdx, setAlbumPhotoIdx] = useState(0);
  const [showChatPopup, setShowChatPopup] = useState(false);

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      // Fetch current user
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: currentUserData } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_email', authData.user.email)
          .single();
        setCurrentUser(currentUserData);
      }

      // Fetch target user info
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, username, user_firstname, user_lastname, user_avatar_url, cover_photo_url, user_email')
        .eq('user_id', userId)
        .single();
      
      setUserInfo(userData);
      setCoverPhoto(userData?.cover_photo_url || null);

      // Fetch posts by user_id
      if (userData?.user_id) {
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userData.user_id)
          .order('post_created_at', { ascending: false });
        setPosts(userPosts || []);
      }
    };

    fetchUserAndPosts();
  }, [userId]);

  // Fetch reactions/comments for user's posts
  useEffect(() => {
    if (!posts.length) return;
    const fetchReactions = async () => {
      const { data, error } = await supabase.from('reactions').select('*');
      if (!error) {
        const reactionsMap: Record<string, any[]> = {};
        const userReactionsMap: Record<string, string> = {};
        data.forEach(reaction => {
          const postId = reaction.post_id;
          if (!reactionsMap[postId]) reactionsMap[postId] = [];
          reactionsMap[postId].push(reaction);
          if (currentUser && reaction.user_id === currentUser.user_id) {
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
        const commentsMap: Record<string, any[]> = {};
        data.forEach(comment => {
          const postId = comment.post_id;
          if (!commentsMap[postId]) commentsMap[postId] = [];
          commentsMap[postId].push(comment);
        });
        setComments(commentsMap);
      }
    };

    fetchReactions();
    fetchComments();
  }, [posts, currentUser]);

  // Add this new useEffect for fetching reaction users
  useEffect(() => {
    if (!posts.length) return;
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
        const usersMap: Record<string, any[]> = {};
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

    fetchReactionUsers();
  }, [posts]);

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

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!currentUser) return;
    const existingReaction = reactions[postId]?.find(r => r.user_id === currentUser.user_id);
    const isSameReaction = existingReaction?.reaction_type === reactionType;
    const updatedReactions = { ...reactions };
    const updatedUserReactions = { ...userReactions };
    if (isSameReaction) {
      updatedReactions[postId] = updatedReactions[postId]?.filter(r => r.user_id !== currentUser.user_id) || [];
      delete updatedUserReactions[postId];
    } else {
      const newReaction = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user_id: currentUser.user_id,
        reaction_type: reactionType,
        created_at: new Date().toISOString()
      };
      updatedReactions[postId] = [
        ...(updatedReactions[postId]?.filter(r => r.user_id !== currentUser.user_id) || []),
        newReaction
      ];
      updatedUserReactions[postId] = reactionType;
    }
    setReactions(updatedReactions);
    setUserReactions(updatedUserReactions);
    if (isSameReaction) {
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', currentUser.user_id);
    } else {
      await supabase.from('reactions').upsert({
        post_id: postId,
        user_id: currentUser.user_id,
        reaction_type: reactionType
      }, { onConflict: 'post_id,user_id' });
    }
    setShowReactionPicker({ postId: null, show: false });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const addComment = async (postId: string) => {
    if (!currentUser || !commentContent[postId]?.trim()) return;
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_avatar_url, username')
      .eq('user_id', currentUser.user_id)
      .single();
    if (userError) return;
    const avatarUrl = userData?.user_avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg';
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id: postId,
        user_id: currentUser.user_id,
        username: userData.username,
        avatar_url: avatarUrl,
        comment_content: commentContent[postId]
      }])
      .select('*');
    if (!error && data) {
      const newComment = data[0];
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
      setCommentContent(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    await supabase.from('comments').delete().match({ comment_id: commentId });
    setComments(prev => ({ ...prev, [postId]: prev[postId].filter(comment => comment.comment_id !== commentId) }));
  };

  const handleCommentChange = (postId: string, content: string) => {
    setCommentContent(prev => ({ ...prev, [postId]: content }));
  };

  const albumPhotos = posts.filter(p => p.post_image_url);

  const openAlbumModal = (idx: number) => {
    setAlbumPhotoIdx(idx);
    setAlbumModalOpen(true);
  };

  const closeAlbumModal = () => setAlbumModalOpen(false);

  const prevPhoto = () => setAlbumPhotoIdx(idx => (idx > 0 ? idx - 1 : albumPhotos.length - 1));

  const nextPhoto = () => setAlbumPhotoIdx(idx => (idx < albumPhotos.length - 1 ? idx + 1 : 0));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{userInfo?.username || 'Profile'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {/* Cover Photo Section */}
        <div style={{ 
          position: 'relative',
          height: '300px',
          width: '100%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #fbc2eb 100%)',
          cursor: 'pointer'
        }}
        onClick={() => {
          if (coverPhoto) {
            setViewImageUrl(coverPhoto);
            setIsImageModalOpen(true);
          }
        }}>
          {coverPhoto ? (
            <img 
              src={coverPhoto} 
              alt="Cover" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }} 
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: 'linear-gradient(135deg, #e0e7ff 0%, #fbc2eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IonText color="medium">No cover photo</IonText>
            </div>
          )}
        </div>

        {/* Profile Info Section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginTop: '-60px',
          position: 'relative',
          zIndex: 1,
          padding: '0 16px'
        }}>
          <IonAvatar 
            style={{ 
              width: 120, 
              height: 120,
              border: '4px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              marginBottom: 8
            }}
            onClick={() => {
              if (userInfo?.user_avatar_url) {
                setViewImageUrl(userInfo.user_avatar_url);
                setIsImageModalOpen(true);
              }
            }}
          >
            <img src={userInfo?.user_avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'} alt="Profile" />
          </IonAvatar>
          <IonText color="primary" style={{ marginTop: 16, fontSize: 28, fontWeight: 700 }}>
            <h2 style={{ margin: 0 }}>{userInfo ? userInfo.username : 'Loading...'}</h2>
          </IonText>
          {/* Only Message Button */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <IonButton color="primary" style={{ fontWeight: 600, borderRadius: 8 }}
              onClick={() => setShowChatPopup(true)}>
              Message
            </IonButton>
          </div>
        </div>

        {/* Chat Popup */}
        {showChatPopup && userInfo && (
          <ChatPopup
            userId={userInfo.user_id}
            username={userInfo.username}
            avatarUrl={userInfo.user_avatar_url}
            onClose={() => setShowChatPopup(false)}
          />
        )}

        {/* Album Card */}
        <div style={{ margin: '32px 0', padding: '0 16px' }}>
          <IonLabel color="primary" style={{ fontWeight: 'bold', fontSize: 18 }}>Albums</IonLabel>
          <IonGrid>
            <IonRow>
              <IonCol size="4">
                <div
                  style={{
                    background: '#222',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 160,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => setAlbumModalOpen(true)}
                >
                  {albumPhotos[0] ? (
                    <img
                      src={albumPhotos[0].post_image_url}
                      alt="All Photos"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 12,
                        opacity: 0.7,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                      No photos
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: 16,
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12,
                  }}>
                    All Photos<br />
                    <span style={{ fontWeight: 'normal', fontSize: 13 }}>{albumPhotos.length} item{albumPhotos.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Timeline */}
        <div style={{ margin: '32px 0', padding: '0 16px' }}>
          <IonLabel color="primary" style={{ fontWeight: 'bold', fontSize: 18 }}>Timeline</IonLabel>
          {posts.length === 0 && <IonText color="medium">No posts yet.</IonText>}
          {posts.map(post => (
            <IonCard key={post.post_id} style={{ 
              margin: '16px 0', 
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

                {getReactionSummary(post.post_id) && (
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
                        {getReactionSummary(post.post_id)?.topReaction}
                      </span>
                      <IonText color="medium" style={{ fontSize: '14px' }}>
                        {getReactionSummary(post.post_id)?.total} {getReactionSummary(post.post_id)?.total === 1 ? 'reaction' : 'reactions'}
                      </IonText>
                    </div>
                  </div>
                )}

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
                      color={userReactions[post.post_id] ? 'primary' : 'medium'}
                      style={{ color: userReactions[post.post_id] ? '#7c3aed' : '#a1a1aa', fontWeight: 'bold', transition: 'color 0.2s' }}
                      onMouseEnter={() => setShowReactionPicker({postId: post.post_id, show: true})}
                      onClick={() => handleReaction(post.post_id, userReactions[post.post_id] || 'like')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '20px', marginRight: '6px' }}>
                          {userReactions[post.post_id] ? REACTION_EMOJIS[userReactions[post.post_id] as keyof typeof REACTION_EMOJIS] : '👍'}
                        </span>
                        <span>
                          {userReactions[post.post_id] ? userReactions[post.post_id].charAt(0).toUpperCase() + userReactions[post.post_id].slice(1) : 'React'}
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
                        {comments[post.post_id]?.length > 0 && (
                          <span style={{ marginLeft: '6px' }}>({comments[post.post_id].length})</span>
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
                    {comments[post.post_id]?.map(comment => (
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
                        {currentUser?.user_id === comment.user_id && (
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
                        <img src={currentUser?.user_avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'} alt={currentUser?.username || ''} />
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
            </IonCard>
          ))}
        </div>

        {/* Album Modal: shows all photos in a grid */}
        <IonModal isOpen={albumModalOpen} onDidDismiss={closeAlbumModal}>
          <IonHeader>
            <IonToolbar color="dark">
              <IonTitle>All Photos</IonTitle>
              <IonButton slot="end" fill="clear" color="light" onClick={closeAlbumModal}>Close</IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent style={{ background: '#18191a' }}>
            <IonGrid>
              <IonRow>
                {albumPhotos.length === 0 && <IonCol size="12"><IonText color="medium">No photos yet.</IonText></IonCol>}
                {albumPhotos.map((photo, idx) => (
                  <IonCol size="4" key={idx} style={{ padding: 6 }}>
                    <img
                      src={photo.post_image_url}
                      alt="Album"
                      style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      onClick={() => {
                        setAlbumPhotoIdx(idx);
                        setViewImageUrl(photo.post_image_url);
                        setIsImageModalOpen(true);
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </IonContent>
        </IonModal>

        {/* Image Modal for full screen preview */}
        <IonModal isOpen={isImageModalOpen} onDidDismiss={() => setIsImageModalOpen(false)}>
          <IonContent style={{ background: '#000', padding: 0, overflow: 'auto' }}>
            {viewImageUrl && (
              <img
                src={viewImageUrl}
                alt="Full View"
                style={{
                  display: 'block',
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  margin: '0 auto',
                  maxWidth: '100%',
                  maxHeight: '100vh',
                  objectFit: 'contain',
                }}
                onClick={() => setIsImageModalOpen(false)}
              />
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default UserProfile; 