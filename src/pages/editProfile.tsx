import React, { useState, useRef, useEffect } from 'react';
import {
  IonContent, IonPage, IonInput, IonButton, IonAlert, IonHeader,
  IonBackButton, IonButtons, IonItem, IonText, IonCol, IonGrid,
  IonRow, IonInputPasswordToggle, IonImg, IonAvatar, IonCard,
  IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonIcon, IonToggle, IonLabel, IonModal
} from '@ionic/react';
import { supabase } from '../utils/supabaseClient';
import { useHistory } from 'react-router-dom';
import { shieldCheckmarkOutline, qrCodeOutline, keyOutline } from 'ionicons/icons';

const EditProfile: React.FC = () => {
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const history = useHistory();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [factorId, setFactorId] = useState('');
    const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
    const [disable2FACode, setDisable2FACode] = useState('');
    const [disable2FAChallengeId, setDisable2FAChallengeId] = useState('');
    const [disable2FAFactorId, setDisable2FAFactorId] = useState('');
  
    useEffect(() => {
        const fetchSessionAndData = async () => {
          // Fetch the current session
          const { data: session, error: sessionError } = await supabase.auth.getSession();
      
          if (sessionError || !session || !session.session) {
            setAlertMessage('You must be logged in to access this page.');
            setShowAlert(true);
            history.push('/it35-lab/login'); // Redirect to login if no session is found
            return;
          }
      
          // Fetch user details from Supabase using the session's email
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('user_firstname, user_lastname, user_avatar_url, user_email, username')
            .eq('user_email', session.session.user.email) // Use email from the session
            .single();
      
          if (userError || !user) {
            setAlertMessage('User data not found.');
            setShowAlert(true);
            return;
          }
      
          // Populate form fields with the retrieved data
          setFirstName(user.user_firstname || '');
          setLastName(user.user_lastname || '');
          setAvatarPreview(user.user_avatar_url);
          setEmail(user.user_email);
          setUsername(user.username || '');
        };
      
        fetchSessionAndData();
    });
  
    useEffect(() => {
        const check2FAStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                if (factors) {
                    setIs2FAEnabled(factors.totp.length > 0);
                }
            }
        };
        check2FAStatus();
    }, []);
  
    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    };
  
    const handleUpdate = async () => {
        if (password !== confirmPassword) {
          setAlertMessage("Passwords don't match.");
          setShowAlert(true);
          return;
        }
      
        // Fetch the current session
        const { data: session, error: sessionError } = await supabase.auth.getSession();
      
        if (sessionError || !session || !session.session) {
          setAlertMessage('Error fetching session or no session available.');
          setShowAlert(true);
          return;
        }
      
        const user = session.session.user;
      
        if (!user.email) {
            setAlertMessage('Error: User email is missing.');
            setShowAlert(true);
            return;
          }
          
          const { error: passwordError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
          });
          
      
        if (passwordError) {
          setAlertMessage('Incorrect current password.');
          setShowAlert(true);
          return;
        }
      
        // Handle avatar upload if the avatar file is changed
        let avatarUrl = avatarPreview;
      
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
          
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('user-avatars')
              .upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true,  // Allows overwriting existing files
              });
          
            if (uploadError) {
              setAlertMessage(`Avatar upload failed: ${uploadError.message}`);
              setShowAlert(true);
              return;
            }
          
            // Retrieve the public URL
            const { data } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
            avatarUrl = data.publicUrl;
          }
          
      
        // Update user data in the users table
        const { error: updateError } = await supabase
          .from('users')
          .update({
            user_firstname: firstName,
            user_lastname: lastName,
            user_avatar_url: avatarUrl,
            username: username,
          })
          .eq('user_email', user.email);
      
        if (updateError) {
          setAlertMessage(updateError.message);
          setShowAlert(true);
          return;
        }
      
        // Update the password if a new password is provided
        if (password) {
          const { error: passwordUpdateError } = await supabase.auth.updateUser({
            password: password,
          });
      
          if (passwordUpdateError) {
            setAlertMessage(passwordUpdateError.message);
            setShowAlert(true);
            return;
          }
        }
      
        setAlertMessage('Account updated successfully!');
        setShowAlert(true);
        history.push('/it35-lab/app');
      };
  
    const setup2FA = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp'
            });

            if (error) throw error;

            if (data && data.totp) {
                setTwoFactorSecret(data.totp.secret);
                setTwoFactorQRCode(data.totp.uri);
                setFactorId(data.id);
                setShow2FASetup(true);
            }
        } catch (error) {
            setAlertMessage('Failed to setup 2FA: ' + (error as Error).message);
            setShowAlert(true);
        }
    };

    const verifyAndEnable2FA = async () => {
        try {
            const { data: challengeData, error } = await supabase.auth.mfa.challenge({
                factorId: factorId
            });

            if (error) throw error;

            if (challengeData) {
                const { error: verifyError } = await supabase.auth.mfa.verify({
                    factorId: factorId,
                    challengeId: challengeData.id,
                    code: verificationCode
                });

                if (verifyError) throw verifyError;

                setIs2FAEnabled(true);
                setShowVerificationModal(false);
                setShow2FASetup(false);
                setAlertMessage('2FA has been enabled successfully!');
                setShowAlert(true);
            }
        } catch (error) {
            setAlertMessage('Failed to verify 2FA: ' + (error as Error).message);
            setShowAlert(true);
        }
    };

    const disable2FA = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (factors && factors.totp.length > 0) {
                const totpFactor = factors.totp[0];
                if (!totpFactor) throw new Error('No 2FA factor found');

                const { error } = await supabase.auth.mfa.unenroll({
                    factorId: totpFactor.id
                });

                if (error) throw error;

                setIs2FAEnabled(false);
                setAlertMessage('2FA has been disabled successfully!');
                setShowAlert(true);
            }
        } catch (error) {
            setAlertMessage('Failed to disable 2FA: ' + (error as Error).message);
            setShowAlert(true);
        }
    };
  
    return (
      <IonPage>
        <IonHeader>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/it35-lab/app" />
          </IonButtons>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonText color="secondary">
              <h1>Edit Account</h1>
            </IonText>
          </IonItem>
          <br />
  
          {/* Avatar Upload Section */}
          <IonGrid>
            <IonRow className="ion-justify-content-center ion-align-items-center">
              <IonCol className="ion-text-center">
                {avatarPreview && (
                  <IonAvatar style={{ width: '200px', height: '200px', margin: '10px auto' }}>
                    <IonImg src={avatarPreview} style={{ objectFit: 'cover' }} />
                  </IonAvatar>
                )}
  
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
  
                <IonButton expand="block" onClick={() => fileInputRef.current?.click()}>
                  Upload Avatar
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
  
          {/* Rest of the Form */}
          <IonGrid>
            <IonRow>
              <IonCol>
                <IonInput
                  label="Username"
                  type="text"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter username"
                  value={username}
                  onIonChange={(e) => setUsername(e.detail.value!)}
                />
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="6">
                <IonInput
                  label="First Name"
                  type="text"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter First Name"
                  value={firstName}
                  onIonChange={(e) => setFirstName(e.detail.value!)}
                />
              </IonCol>
              <IonCol size="6">
                <IonInput
                  label="Last Name"
                  type="text"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter Last Name"
                  value={lastName}
                  onIonChange={(e) => setLastName(e.detail.value!)}
                />
              </IonCol>
            </IonRow>
          </IonGrid>         
          <IonGrid>
            <IonRow>
            <IonText color="secondary">
            <h3>Change Password</h3>
            </IonText>
              <IonCol size="12">
                <IonInput
                  label="New Password"
                  type="password"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter New Password"
                  value={password}
                  onIonChange={(e) => setPassword(e.detail.value!)}
                >
                  <IonInputPasswordToggle slot="end" />
                </IonInput>
              </IonCol>
            </IonRow>
          </IonGrid>
  
          <IonGrid>
            <IonRow>
              <IonCol size="12">
                <IonInput
                  label="Confirm Password"
                  type="password"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onIonChange={(e) => setConfirmPassword(e.detail.value!)}
                >
                  <IonInputPasswordToggle slot="end" />
                </IonInput>
              </IonCol>
            </IonRow>
          </IonGrid>


          {/* Current Password Field */}
          <IonGrid>
            <IonRow>
              <IonText color="secondary">
              <h3>Confirm Changes</h3>
              </IonText>
              <IonCol size="12">
                <IonInput
                  label="Current Password"
                  type="password"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter Current Password to Save Changess"
                  value={currentPassword}
                  onIonChange={(e) => setCurrentPassword(e.detail.value!)}
                >
                <IonInputPasswordToggle slot="end" />
                </IonInput>
              </IonCol>
            </IonRow>
          </IonGrid>
  
          <IonButton expand="full" onClick={handleUpdate} shape="round">
            Update Account
          </IonButton>
  
          {/* 2FA Section */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Two-Factor Authentication</IonCardTitle>
              <IonCardSubtitle>Add an extra layer of security to your account</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={shieldCheckmarkOutline} color={is2FAEnabled ? 'success' : 'medium'} />
                  <IonLabel>Two-Factor Authentication</IonLabel>
                </div>
                <IonToggle
                  checked={is2FAEnabled}
                  onIonChange={async (e) => {
                    if (e.detail.checked) {
                      setup2FA();
                    } else {
                      // Prepare to prompt for code
                      // Get the factorId and challengeId
                      const { data: factors } = await supabase.auth.mfa.listFactors();
                      if (factors && factors.totp.length > 0) {
                        const totpFactor = factors.totp[0];
                        setDisable2FAFactorId(totpFactor.id);
                        // Start a challenge
                        const { data: challengeData, error } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
                        if (!error && challengeData) {
                          setDisable2FAChallengeId(challengeData.id);
                          setShowDisable2FAModal(true);
                        } else {
                          setAlertMessage('Failed to start 2FA challenge: ' + (error ? error.message : 'Unknown error'));
                          setShowAlert(true);
                        }
                      } else {
                        setAlertMessage('No 2FA factor found to disable.');
                        setShowAlert(true);
                      }
                    }
                  }}
                />
              </div>
              {is2FAEnabled && (
                <IonText color="success">
                  <p>Two-factor authentication is enabled for your account.</p>
                </IonText>
              )}
            </IonCardContent>
          </IonCard>

          {/* 2FA Setup Modal */}
          <IonModal isOpen={show2FASetup} onDidDismiss={() => setShow2FASetup(false)}>
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Setup Two-Factor Authentication</IonCardTitle>
                  <IonCardSubtitle>Scan the QR code with your authenticator app</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQRCode)}`}
                      alt="2FA QR Code"
                      style={{ maxWidth: '200px', margin: '0 auto' }}
                    />
                  </div>
                  <IonText>
                    <p>1. Install an authenticator app like Google Authenticator or Authy</p>
                    <p>2. Scan the QR code with your authenticator app</p>
                    <p>3. Enter the 6-digit code from your authenticator app</p>
                  </IonText>
                  <IonButton expand="block" onClick={() => setShowVerificationModal(true)}>
                    Continue
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonContent>
          </IonModal>

          {/* Verification Modal */}
          <IonModal isOpen={showVerificationModal} onDidDismiss={() => setShowVerificationModal(false)}>
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Verify Setup</IonCardTitle>
                  <IonCardSubtitle>Enter the code from your authenticator app</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonInput
                    label="Verification Code"
                    type="number"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onIonChange={(e) => setVerificationCode(e.detail.value!)}
                  />
                  <IonButton expand="block" onClick={verifyAndEnable2FA} style={{ marginTop: '16px' }}>
                    Verify and Enable
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonContent>
          </IonModal>

          {/* Disable 2FA Modal */}
          <IonModal isOpen={showDisable2FAModal} onDidDismiss={() => setShowDisable2FAModal(false)}>
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Disable Two-Factor Authentication</IonCardTitle>
                  <IonCardSubtitle>Enter your 2FA code to confirm</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonInput
                    label="2FA Code"
                    type="number"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="Enter 6-digit code"
                    value={disable2FACode}
                    onIonChange={(e) => setDisable2FACode(e.detail.value!)}
                  />
                  <IonButton expand="block" onClick={async () => {
                    // Step 1: Verify the code (AAL2)
                    const { error: verifyError } = await supabase.auth.mfa.verify({
                      factorId: disable2FAFactorId,
                      challengeId: disable2FAChallengeId,
                      code: disable2FACode
                    });
                    if (verifyError) {
                      setAlertMessage('Failed to verify 2FA code: ' + verifyError.message);
                      setShowAlert(true);
                      return;
                    }
                    // Step 2: Unenroll the factor
                    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                      factorId: disable2FAFactorId
                    });
                    if (unenrollError) {
                      setAlertMessage('Failed to disable 2FA: ' + unenrollError.message);
                      setShowAlert(true);
                      return;
                    }
                    setIs2FAEnabled(false);
                    setShowDisable2FAModal(false);
                    setAlertMessage('2FA has been disabled successfully!');
                    setShowAlert(true);
                  }}>
                    Disable 2FA
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonContent>
          </IonModal>
  
          {/* Alert for success or errors */}
          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => setShowAlert(false)}
            message={alertMessage}
            buttons={['OK']}
          />
        </IonContent>
      </IonPage>
    );
  };
  
  export default EditProfile;